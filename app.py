from flask import Flask, request, jsonify, g
from flask_cors import CORS
from functools import wraps
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
import jwt
import os
import sys
import hmac
import base64
import json
import secrets

load_dotenv()

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from update import AdaptiveStateManager, AdaptiveGamblingPredictor

app = Flask(__name__)
CORS(app, origins=os.environ.get("ALLOWED_ORIGINS", "*"))

STATE_FILE = os.environ.get("STATE_FILE", "gambling_state.db")


def _get_required_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


JWT_SECRET = _get_required_env("JWT_SECRET")
HMAC_SECRET = _get_required_env("HMAC_SECRET")
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


TEMP_DURATIONS = {
    "30min": 30,
    "1hour": 60,
    "2hours": 120,
    "6hours": 360,
    "12hours": 720,
    "24hours": 1440,
    "48hours": 2880,
    "72hours": 4320,
}


def _generate_temp_credentials(duration_minutes: int) -> dict:
    exp_timestamp = int((datetime.now(timezone.utc) + timedelta(minutes=duration_minutes)).timestamp())
    username = f"temp_{secrets.token_hex(4)}"

    payload = json.dumps({
        "user": username,
        "exp": exp_timestamp,
    }).encode()

    hmac_digest = hmac.new(HMAC_SECRET.encode(), payload, "sha256").hexdigest()

    temp_data = {
        "user": username,
        "exp": exp_timestamp,
        "hmac": hmac_digest,
    }

    password = base64.b64encode(json.dumps(temp_data).encode()).decode()

    return {
        "username": username,
        "password": f"TEMP:{password}",
        "expires_at": exp_timestamp,
    }


def _validate_temp_password(password: str) -> dict | None:
    if not password.startswith("TEMP:"):
        return None

    try:
        encoded = password[5:]
        decoded = base64.b64decode(encoded).decode()
        data = json.loads(decoded)

        payload = json.dumps({
            "user": data["user"],
            "exp": data["exp"],
        }).encode()
        expected_hmac = hmac.new(HMAC_SECRET.encode(), payload, "sha256").hexdigest()

        if not hmac.compare_digest(data["hmac"], expected_hmac):
            return None

        if datetime.now(timezone.utc).timestamp() > data["exp"]:
            return None

        return data
    except Exception:
        return None


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        token = auth_header.removeprefix("Bearer ").strip()
        if not token:
            return jsonify({"error": "Token required"}), 401
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401
        g.current_user = payload
        return f(*args, **kwargs)

    return decorated


def admin_required(f):
    @wraps(f)
    @token_required
    def decorated(*args, **kwargs):
        current_user = getattr(g, "current_user", {})
        if not current_user.get("is_admin", False):
            return jsonify({"error": "Admin access required"}), 403
        return f(*args, **kwargs)

    return decorated


def _make_predictor():
    sm = AdaptiveStateManager(STATE_FILE)
    predictor = AdaptiveGamblingPredictor(sm)
    return sm, predictor


def _parse_bool(value, default: bool = False) -> bool:
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "on"}
    return default


def _compute_prediction_response(
    predictor: AdaptiveGamblingPredictor,
    history: list[float],
    state: dict,
    *,
    persist_state: bool,
    include_extended_predictions: bool,
) -> tuple[list[float], dict, dict]:
    next_predictions: list = []
    future_turn_batch: dict = {}
    pattern_info: dict = {}

    if len(history) < PREDICTION_START_THRESHOLD:
        return next_predictions, pattern_info, future_turn_batch

    next_predictions = predictor.predict_next_multipliers(
        history,
        persist_state=persist_state,
        state_snapshot=state,
    )
    pattern_info = predictor.last_pattern_info or predictor.detect_algorithm_pattern(history)

    if include_extended_predictions and len(history) >= LONG_RANGE_PREDICTION_THRESHOLD:
        future_turn_batch = predictor.get_or_refresh_future_turn_batch(history, state_snapshot=state)

    return next_predictions, pattern_info, future_turn_batch


def _build_status_payload() -> dict:
    sm, predictor = _make_predictor()
    state = sm.load_state()
    history_rows = state.get("historical_data", [])
    history = [float(item["multiplier"]) for item in history_rows]
    total_data_points = len(history)

    metrics = state.get("performance_metrics", {})
    model_state = state.get("model_state", {})
    recent_data = history[-20:]

    current_predictions, pattern_info, future_turn_batch = _compute_prediction_response(
        predictor,
        history,
        state,
        persist_state=False,
        include_extended_predictions=True,
    )

    return {
        "total_data_points": total_data_points,
        "adaptation_level": int(state.get("metadata", {}).get("adaptation_level", 0)),
        "model_state": {
            "current_pattern": model_state.get("current_pattern", "random"),
            "confidence_level": model_state.get("confidence_level", 0.5),
            "prediction_streak": model_state.get("prediction_streak", 0),
        },
        "performance": {
            "total_predictions": int(metrics.get("total_predictions", 0)),
            "correct_predictions": int(metrics.get("correct_predictions", 0)),
            "close_predictions": int(metrics.get("close_predictions", 0)),
            "prediction_accuracy": float(metrics.get("prediction_accuracy", 0.0)),
            "recent_history": metrics.get("prediction_history", [])[-10:],
        },
        "recent_data": recent_data,
        "ready_for_predictions": total_data_points >= PREDICTION_START_THRESHOLD,
        "ready_for_extended_predictions": total_data_points >= LONG_RANGE_PREDICTION_THRESHOLD,
        "current_predictions": current_predictions,
        "future_turn_predictions": future_turn_batch.get("predictions", []),
        "long_range_generated_at_round": future_turn_batch.get("generated_at_round", 0),
        "long_range_turn_count": future_turn_batch.get("turn_count", LONG_RANGE_TURN_COUNT),
        "long_range_consumed_count": future_turn_batch.get("consumed_count", 0),
        "long_range_remaining_inputs": future_turn_batch.get("remaining_inputs", 0),
        "prediction_pattern": pattern_info.get("pattern", model_state.get("current_pattern", "random")),
        "prediction_confidence": pattern_info.get("confidence", model_state.get("confidence_level", 0.5)),
        "all_patterns": pattern_info.get("all_patterns", {}),
        "last_updated": state.get("metadata", {}).get("last_updated", datetime.now(timezone.utc).isoformat()),
    }


def _get_history_from_state(state: dict) -> list[float]:
    return [float(item["multiplier"]) for item in state.get("historical_data", [])]


def _get_metrics_from_state(state: dict) -> dict:
    metrics = state.get("performance_metrics", {})
    return {
        "prediction_accuracy": float(metrics.get("prediction_accuracy", 0.0)),
        "total_predictions": int(metrics.get("total_predictions", 0)),
        "correct_predictions": int(metrics.get("correct_predictions", 0)),
        "close_predictions": int(metrics.get("close_predictions", 0)),
        "adaptation_success": int(metrics.get("adaptation_success", 0)),
        "prediction_history": metrics.get("prediction_history", []),
    }


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

    temp_data = None
    is_admin = False

    if password.startswith("TEMP:"):
        temp_data = _validate_temp_password(password)
        if not (temp_data and temp_data["user"] == username):
            return jsonify({"error": "Invalid credentials"}), 401
    elif username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
        is_admin = True
    else:
        return jsonify({"error": "Invalid credentials"}), 401

    now = datetime.now(timezone.utc)
    if temp_data:
        jwt_exp = datetime.fromtimestamp(temp_data["exp"], tz=timezone.utc)
    else:
        jwt_exp = now + timedelta(hours=24)

    jwt_exp = min(jwt_exp, now + timedelta(hours=24))

    token = jwt.encode(
        {"sub": username, "exp": jwt_exp, "is_admin": is_admin},
        JWT_SECRET,
        algorithm="HS256",
    )
    return jsonify({"token": token, "username": username, "is_admin": is_admin})


@app.route("/api/generate_temp", methods=["POST"])
@admin_required
def generate_temp():
    data = request.get_json(silent=True)
    if not data or "duration" not in data:
        return jsonify({"error": "duration field required"}), 400

    duration_key = data["duration"]
    if duration_key not in TEMP_DURATIONS:
        return jsonify({"error": f"Invalid duration. Valid options: {list(TEMP_DURATIONS.keys())}"}), 400

    duration_minutes = TEMP_DURATIONS[duration_key]
    credentials = _generate_temp_credentials(duration_minutes)

    return jsonify({
        "username": credentials["username"],
        "password": credentials["password"],
        "expires_at": credentials["expires_at"],
        "duration_minutes": duration_minutes,
    })


@app.route("/api/status", methods=["GET"])
@token_required
def get_status():
    return jsonify(_build_status_payload())


@app.route("/api/add", methods=["POST"])
@admin_required
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
    state = sm.load_state()
    history = _get_history_from_state(state)
    pending_preds = data.get("pending_predictions", [])
    include_extended_predictions = _parse_bool(data.get("include_extended_predictions"), default=True)

    evaluation = None
    if pending_preds and len(history) >= PREDICTION_START_THRESHOLD:
        evaluation = predictor.evaluate_prediction_accuracy(multiplier, pending_preds)
        metrics = _get_metrics_from_state(state)
        n_correct = metrics["correct_predictions"]
        n_close = metrics["close_predictions"]
        n_total = metrics["total_predictions"]
        n_adapt = metrics["adaptation_success"]
        model_state = state.get("model_state", {})

        n_total += 1
        if evaluation["correct"]:
            n_correct += 1
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
            "pattern": model_state.get("current_pattern", "unknown"),
        }
        state["performance_metrics"]["correct_predictions"] = n_correct
        state["performance_metrics"]["total_predictions"] = n_total
        state["performance_metrics"]["close_predictions"] = n_close
        state["performance_metrics"]["adaptation_success"] = n_adapt

        history_records = state["performance_metrics"].get("prediction_history", [])
        history_records.append(record)
        if len(history_records) > 100:
            history_records = history_records[-100:]
        state["performance_metrics"]["prediction_history"] = history_records

        weighted_accuracy = 0.0
        if n_total > 0:
            if history_records:
                total_weight = 0.0
                for pred in history_records[-n_total:]:
                    accuracy_pct = pred.get("accuracy_percentage", 0.0)
                    if pred.get("correct"):
                        total_weight += 100.0
                    elif pred.get("close"):
                        total_weight += 60.0
                    else:
                        total_weight += min(30.0, accuracy_pct * 0.3)
                weighted_accuracy = total_weight / n_total
            else:
                weighted_accuracy = ((n_correct * 100 + n_close * 60) / (n_total * 100) * 100)
        state["performance_metrics"]["prediction_accuracy"] = max(0.0, min(100.0, weighted_accuracy))

        streak = model_state.get("prediction_streak", 0)
        new_streak = streak + 1 if (evaluation["correct"] or evaluation["close"]) else 0
        state["model_state"]["prediction_streak"] = new_streak

    state["historical_data"].append({
        "multiplier": float(multiplier),
        "timestamp": datetime.now().isoformat(),
        "round_number": len(history) + 1,
    })
    history = _get_history_from_state(state)

    next_predictions, pattern_info, future_turn_batch = _compute_prediction_response(
        predictor,
        history,
        state,
        persist_state=True,
        include_extended_predictions=include_extended_predictions,
    )

    sm.save_state(state)

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
        "total_data_points": len(history),
        "ready_for_predictions": len(history) >= PREDICTION_START_THRESHOLD,
        "ready_for_extended_predictions": len(history) >= LONG_RANGE_PREDICTION_THRESHOLD,
    })


@app.route("/api/stats", methods=["GET"])
@token_required
def get_stats():
    sm, _ = _make_predictor()
    state = sm.load_state()
    metrics = _get_metrics_from_state(state)
    pattern_analysis = state.get("pattern_analysis", {})
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
@admin_required
def clear_data():
    sm, _ = _make_predictor()
    sm.save_state(sm._get_initial_state())
    return jsonify({"success": True, "message": "All data cleared"})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
