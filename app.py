from flask import Flask, request, jsonify
from flask_cors import CORS
from functools import wraps
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
import jwt
import os
import sys

load_dotenv()

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from update import AdaptiveStateManager, AdaptiveGamblingPredictor

app = Flask(__name__)
CORS(app, origins=os.environ.get("ALLOWED_ORIGINS", "*"))

STATE_FILE = os.environ.get("STATE_FILE", "gambling_state.json")


def _get_required_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


JWT_SECRET = _get_required_env("JWT_SECRET")
ADMIN_USERNAME = _get_required_env("ADMIN_USERNAME")
ADMIN_PASSWORD = _get_required_env("ADMIN_PASSWORD")


def _get_positive_int_env(name: str, default: int) -> int:
    raw = os.environ.get(name, str(default)).strip()
    try:
        value = int(raw)
        return max(1, value)
    except ValueError:
        return default


PREDICTION_START_THRESHOLD = _get_positive_int_env("PREDICTION_START_THRESHOLD", 60)
LONG_RANGE_PREDICTION_THRESHOLD = max(
    PREDICTION_START_THRESHOLD,
    _get_positive_int_env("LONG_RANGE_PREDICTION_THRESHOLD", 100),
)
LONG_RANGE_TURN_COUNT = _get_positive_int_env("LONG_RANGE_TURN_COUNT", 5)


# ── Auth helpers ──────────────────────────────────────────────────────────────

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        token = auth_header.removeprefix("Bearer ").strip()
        if not token:
            return jsonify({"error": "Token required"}), 401
        try:
            jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401
        return f(*args, **kwargs)
    return decorated


def _make_predictor():
    sm = AdaptiveStateManager(STATE_FILE)
    predictor = AdaptiveGamblingPredictor(sm)
    return sm, predictor


# ── Public endpoints ──────────────────────────────────────────────────────────

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Username and password required"}), 400

    username = str(data.get("username", ""))
    password = str(data.get("password", ""))

    if username != ADMIN_USERNAME or password != ADMIN_PASSWORD:
        return jsonify({"error": "Invalid credentials"}), 401

    token = jwt.encode(
        {"sub": username, "exp": datetime.now(timezone.utc) + timedelta(hours=24)},
        JWT_SECRET,
        algorithm="HS256",
    )
    return jsonify({"token": token, "username": username})


# ── Protected endpoints ───────────────────────────────────────────────────────

@app.route("/api/status", methods=["GET"])
@token_required
def get_status():
    sm, predictor = _make_predictor()
    state = sm.load_state()
    metrics = sm.get_performance_metrics()
    model_state = sm.get_model_state()
    recent_data = sm.get_recent_data(20)
    history = sm.get_all_data()

    current_predictions: list = []
    future_turn_batch: dict = {}
    pattern_info: dict = {}

    if len(history) >= PREDICTION_START_THRESHOLD:
        current_predictions = predictor.predict_next_multipliers(history, persist_state=False)
        pattern_info = predictor.detect_algorithm_pattern(history)

        if len(history) >= LONG_RANGE_PREDICTION_THRESHOLD:
            future_turn_batch = predictor.get_or_refresh_future_turn_batch(history)

    return jsonify({
        "total_data_points": sm.get_data_count(),
        "adaptation_level": state["metadata"]["adaptation_level"],
        "model_state": {
            "current_pattern": model_state.get("current_pattern", "random"),
            "confidence_level": model_state.get("confidence_level", 0.5),
            "prediction_streak": model_state.get("prediction_streak", 0),
        },
        "performance": {
            "total_predictions": metrics["total_predictions"],
            "correct_predictions": metrics["correct_predictions"],
            "close_predictions": metrics["close_predictions"],
            "prediction_accuracy": metrics["prediction_accuracy"],
            "recent_history": metrics["prediction_history"][-10:],
        },
        "recent_data": recent_data,
        "ready_for_predictions": sm.get_data_count() >= PREDICTION_START_THRESHOLD,
        "ready_for_extended_predictions": sm.get_data_count() >= LONG_RANGE_PREDICTION_THRESHOLD,
        "current_predictions": current_predictions,
        "future_turn_predictions": future_turn_batch.get("predictions", []),
        "long_range_generated_at_round": future_turn_batch.get("generated_at_round", 0),
        "long_range_turn_count": future_turn_batch.get("turn_count", LONG_RANGE_TURN_COUNT),
        "long_range_consumed_count": future_turn_batch.get("consumed_count", 0),
        "long_range_remaining_inputs": future_turn_batch.get("remaining_inputs", 0),
        "prediction_pattern": pattern_info.get("pattern", model_state.get("current_pattern", "random")),
        "prediction_confidence": pattern_info.get("confidence", model_state.get("confidence_level", 0.5)),
        "all_patterns": pattern_info.get("all_patterns", {}),
    })


@app.route("/api/add", methods=["POST"])
@token_required
def add_multiplier():
    data = request.get_json(silent=True)
    if not data or "multiplier" not in data:
        return jsonify({"error": "multiplier field required"}), 400

    try:
        multiplier = float(data["multiplier"])
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid multiplier value"}), 400

    if multiplier < 1.0 or multiplier > 10000.0:
        return jsonify({"error": "Multiplier must be between 1.00 and 10000.00"}), 400

    sm, predictor = _make_predictor()
    history = sm.get_all_data()
    pending_preds = data.get("pending_predictions", [])

    evaluation = None
    if pending_preds and len(history) >= PREDICTION_START_THRESHOLD:
        evaluation = predictor.evaluate_prediction_accuracy(multiplier, pending_preds)
        metrics = sm.get_performance_metrics()
        n_correct = metrics["correct_predictions"]
        n_close = metrics["close_predictions"]
        n_total = metrics["total_predictions"]
        n_adapt = metrics["adaptation_success"]

        n_total += 1
        if evaluation["correct"]:
            n_correct += 1
            model_state = sm.get_model_state()
            if model_state.get("prediction_streak", 0) > 2:
                n_adapt += 1
        if evaluation["close"]:
            n_close += 1

        record = {
            "actual": float(multiplier),
            "predictions": pending_preds,
            "closest": evaluation["closest_prediction"],
            "correct": evaluation["correct"],
            "close": evaluation["close"],
            "pattern": sm.get_model_state().get("current_pattern", "unknown"),
        }
        sm.update_performance_metrics(n_correct, n_total, n_close, n_adapt, record)

        model_state = sm.get_model_state()
        streak = model_state.get("prediction_streak", 0)
        new_streak = streak + 1 if (evaluation["correct"] or evaluation["close"]) else 0
        sm.update_model_state({"prediction_streak": new_streak})

    sm.add_historical_data(multiplier)
    history = sm.get_all_data()

    next_predictions: list = []
    future_turn_batch: dict = {}
    pattern_info: dict = {}
    if len(history) >= PREDICTION_START_THRESHOLD:
        next_predictions = predictor.predict_next_multipliers(history)
        pattern_info = predictor.detect_algorithm_pattern(history)
        if len(history) >= LONG_RANGE_PREDICTION_THRESHOLD:
            future_turn_batch = predictor.get_or_refresh_future_turn_batch(history)

    return jsonify({
        "success": True,
        "evaluation": evaluation,
        "next_predictions": next_predictions,
        "future_turn_predictions": future_turn_batch.get("predictions", []),
        "long_range_generated_at_round": future_turn_batch.get("generated_at_round", 0),
        "long_range_turn_count": future_turn_batch.get("turn_count", LONG_RANGE_TURN_COUNT),
        "long_range_consumed_count": future_turn_batch.get("consumed_count", 0),
        "long_range_remaining_inputs": future_turn_batch.get("remaining_inputs", 0),
        "pattern": pattern_info.get("pattern", "random"),
        "confidence": pattern_info.get("confidence", 0.0),
        "all_patterns": pattern_info.get("all_patterns", {}),
        "total_data_points": sm.get_data_count(),
        "ready_for_predictions": sm.get_data_count() >= PREDICTION_START_THRESHOLD,
        "ready_for_extended_predictions": sm.get_data_count() >= LONG_RANGE_PREDICTION_THRESHOLD,
    })


@app.route("/api/stats", methods=["GET"])
@token_required
def get_stats():
    sm, _ = _make_predictor()
    metrics = sm.get_performance_metrics()
    pattern_analysis = sm.get_pattern_analysis()
    pred_history = metrics.get("prediction_history", [])

    pattern_counts: dict = {}
    for p in pred_history:
        pat = p.get("pattern", "unknown")
        pattern_counts[pat] = pattern_counts.get(pat, 0) + 1

    return jsonify({
        "performance": {
            "total_predictions": metrics["total_predictions"],
            "correct_predictions": metrics["correct_predictions"],
            "close_predictions": metrics["close_predictions"],
            "prediction_accuracy": metrics["prediction_accuracy"],
        },
        "pattern_distribution": pattern_counts,
        "adaptation_history": pattern_analysis.get("algorithm_changes", [])[-10:],
        "volatility_history": pattern_analysis.get("volatility_history", [])[-30:],
        "confidence_history": pattern_analysis.get("pattern_confidence", [])[-30:],
        "prediction_history": pred_history[-20:],
    })


@app.route("/api/clear", methods=["POST"])
@token_required
def clear_data():
    sm, _ = _make_predictor()
    sm.clear_all_data()
    return jsonify({"success": True, "message": "All data cleared"})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
