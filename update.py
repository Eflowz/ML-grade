import numpy as np
import random
import json
import os
from typing import List, Optional, Dict, Any
import warnings
from datetime import datetime
from sklearn.ensemble import GradientBoostingRegressor, ExtraTreesRegressor
from sklearn.linear_model import Ridge
from sklearn.neighbors import KNeighborsRegressor
from sklearn.preprocessing import StandardScaler
warnings.filterwarnings('ignore')


def _get_prediction_threshold() -> int:
    raw = os.environ.get("PREDICTION_START_THRESHOLD", "60").strip()
    try:
        value = int(raw)
        return max(1, value)
    except ValueError:
        return 60


PREDICTION_START_THRESHOLD = _get_prediction_threshold()

class AdaptiveStateManager:
    """Manages saving and loading system state with adaptive learning"""
    
    def __init__(self, state_file: str = "gambling_state.json"):
        self.state_file = state_file
        self.ensure_state_file()
    
    def ensure_state_file(self):
        """Create state file with initial structure if it doesn't exist"""
        if not os.path.exists(self.state_file):
            initial_state = self._get_initial_state()
            self.save_state(initial_state)
        else:
            self._migrate_state()
    
    def _get_initial_state(self) -> Dict[str, Any]:
        """Get initial state structure"""
        return {
            "metadata": {
                "created_at": datetime.now().isoformat(),
                "last_updated": datetime.now().isoformat(),
                "total_rounds": 0,
                "version": "2.1",
                "adaptation_level": 0
            },
            "historical_data": [],
            "pattern_analysis": {
                "volatility_history": [],
                "trend_history": [],
                "cluster_history": [],
                "algorithm_changes": [],
                "pattern_confidence": []
            },
            "performance_metrics": {
                "prediction_accuracy": 0.0,
                "total_predictions": 0,
                "correct_predictions": 0,
                "close_predictions": 0,
                "adaptation_success": 0,
                "prediction_history": [] 
            },
            "model_state": {
                "current_pattern": "random",
                "last_algorithm_change": None,
                "prediction_streak": 0,
                "volatility_threshold": 2.0,
                "confidence_level": 0.5,
                "bias_correction": 0.0
            }
        }
    
    def _migrate_state(self):
        """Migrate existing state to include new adaptive features"""
        try:
            state = self.load_state()
        except:
            print("⚠️  Corrupted state file detected. Creating fresh state.")
            initial_state = self._get_initial_state()
            self.save_state(initial_state)
            return
        
        needs_save = False
        
        # Add missing keys with proper defaults
        if "pattern_analysis" not in state:
            state["pattern_analysis"] = {
                "volatility_history": [],
                "trend_history": [],
                "cluster_history": [],
                "algorithm_changes": [],
                "pattern_confidence": []
            }
            needs_save = True
        else:
            if "pattern_confidence" not in state["pattern_analysis"]:
                state["pattern_analysis"]["pattern_confidence"] = []
                needs_save = True
        
        if "model_state" not in state:
            state["model_state"] = {
                "current_pattern": "random",
                "last_algorithm_change": None,
                "prediction_streak": 0,
                "volatility_threshold": 2.0,
                "confidence_level": 0.5,
                "bias_correction": 0.0
            }
            needs_save = True
        else:
            if "confidence_level" not in state["model_state"]:
                state["model_state"]["confidence_level"] = 0.5
                needs_save = True
            if "bias_correction" not in state["model_state"]:
                state["model_state"]["bias_correction"] = 0.0
                needs_save = True
        
        if "metadata" not in state:
            state["metadata"] = {
                "created_at": datetime.now().isoformat(),
                "last_updated": datetime.now().isoformat(),
                "total_rounds": len(state.get("historical_data", [])),
                "version": "2.1",
                "adaptation_level": 0
            }
            needs_save = True
        else:
            if "adaptation_level" not in state["metadata"]:
                state["metadata"]["adaptation_level"] = 0
                needs_save = True
            if state["metadata"].get("version", "1.0") != "2.1":
                state["metadata"]["version"] = "2.1"
                needs_save = True
        
        if "performance_metrics" not in state:
            state["performance_metrics"] = {
                "prediction_accuracy": 0.0,
                "total_predictions": 0,
                "correct_predictions": 0,
                "close_predictions": 0,
                "adaptation_success": 0,
                "prediction_history": []
            }
            needs_save = True
        else:
            if "prediction_history" not in state["performance_metrics"]:
                state["performance_metrics"]["prediction_history"] = []
                needs_save = True
        
        if needs_save:
            print("🔄 Migrating to enhanced adaptive learning system v2.1...")
            self.save_state(state)
    
    def load_state(self) -> Dict[str, Any]:
        """Load state from JSON file with error recovery"""
        try:
            with open(self.state_file, 'r') as f:
                content = f.read().strip()
                if not content:
                    raise ValueError("Empty state file")
                return json.loads(content)
        except (json.JSONDecodeError, FileNotFoundError, ValueError) as e:
            print(f"⚠️  Warning: Could not load state file ({e}). Creating new one.")
            initial_state = self._get_initial_state()
            self.save_state(initial_state)
            return initial_state
    
    def save_state(self, state_data: Dict[str, Any]):
        """Save state to JSON file with atomic write"""
        try:
            state_data["metadata"]["last_updated"] = datetime.now().isoformat()
            state_data["metadata"]["total_rounds"] = len(state_data["historical_data"])
            
            # Write to temporary file first, then rename (atomic operation)
            temp_file = self.state_file + ".tmp"
            with open(temp_file, 'w') as f:
                json.dump(state_data, f, indent=2)
            
            # Replace old file with new one
            if os.path.exists(self.state_file):
                os.remove(self.state_file)
            os.rename(temp_file, self.state_file)
        except Exception as e:
            print(f"❌ Error saving state: {e}")
            # Clean up temp file if it exists
            if os.path.exists(temp_file):
                try:
                    os.remove(temp_file)
                except:
                    pass
    
    def add_historical_data(self, multiplier: float):
        """Add new multiplier data to historical records"""
        state = self.load_state()
        data_point = {
            "multiplier": float(multiplier),
            "timestamp": datetime.now().isoformat(),
            "round_number": state["metadata"]["total_rounds"] + 1
        }
        state["historical_data"].append(data_point)
        self.save_state(state)
    
    def update_pattern_analysis(self, analysis: Dict[str, Any]):
        """Update pattern analysis with new data"""
        state = self.load_state()
        state["pattern_analysis"]["volatility_history"].append(float(analysis.get("volatility", 0)))
        state["pattern_analysis"]["trend_history"].append(float(analysis.get("trend", 0)))
        state["pattern_analysis"]["cluster_history"].append(int(analysis.get("clustering", 0)))
        state["pattern_analysis"]["pattern_confidence"].append(float(analysis.get("confidence", 0.5)))
        
        # Keep only last 100 analysis points
        for key in ["volatility_history", "trend_history", "cluster_history", "pattern_confidence"]:
            if len(state["pattern_analysis"][key]) > 100:
                state["pattern_analysis"][key] = state["pattern_analysis"][key][-100:]
        
        self.save_state(state)
    
    def update_model_state(self, model_state: Dict[str, Any]):
        """Update model state with current patterns"""
        state = self.load_state()
        state["model_state"].update(model_state)
        self.save_state(state)
    
    def record_algorithm_change(self, reason: str, old_pattern: str, new_pattern: str):
        """Record when the algorithm adapts to new patterns"""
        state = self.load_state()
        change_record = {
            "timestamp": datetime.now().isoformat(),
            "reason": reason,
            "old_pattern": old_pattern,
            "new_pattern": new_pattern,
            "round_number": state["metadata"]["total_rounds"]
        }
        state["pattern_analysis"]["algorithm_changes"].append(change_record)
        state["metadata"]["adaptation_level"] += 1
        
        # Keep only last 50 changes
        if len(state["pattern_analysis"]["algorithm_changes"]) > 50:
            state["pattern_analysis"]["algorithm_changes"] = state["pattern_analysis"]["algorithm_changes"][-50:]
        
        self.save_state(state)
    
    def get_recent_data(self, count: int = 50) -> List[float]:
        """Get most recent multiplier data"""
        state = self.load_state()
        historical_data = state["historical_data"]
        if len(historical_data) < count:
            return [float(item["multiplier"]) for item in historical_data]
        else:
            return [float(item["multiplier"]) for item in historical_data[-count:]]
    
    def get_all_data(self) -> List[float]:
        """Get ALL historical data"""
        state = self.load_state()
        return [float(item["multiplier"]) for item in state["historical_data"]]
    
    def get_data_count(self) -> int:
        """Get the actual count of historical data points"""
        state = self.load_state()
        return len(state["historical_data"])
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get current performance metrics with default values"""
        state = self.load_state()
        metrics = state.get("performance_metrics", {})
        return {
            "prediction_accuracy": float(metrics.get("prediction_accuracy", 0.0)),
            "total_predictions": int(metrics.get("total_predictions", 0)),
            "correct_predictions": int(metrics.get("correct_predictions", 0)),
            "close_predictions": int(metrics.get("close_predictions", 0)),
            "adaptation_success": int(metrics.get("adaptation_success", 0)),
            "prediction_history": metrics.get("prediction_history", [])
        }
    
    def get_model_state(self) -> Dict[str, Any]:
        """Get current model state"""
        state = self.load_state()
        return state.get("model_state", {})
    
    def get_pattern_analysis(self) -> Dict[str, Any]:
        """Get pattern analysis history"""
        state = self.load_state()
        return state.get("pattern_analysis", {})
    
    def update_performance_metrics(self, correct_predictions: int, total_predictions: int, 
                                 close_predictions: int = 0, adaptation_success: int = 0,
                                 prediction_record: Optional[Dict[str, Any]] = None):
        """Update prediction performance metrics"""
        state = self.load_state()
        state["performance_metrics"]["correct_predictions"] = correct_predictions
        state["performance_metrics"]["total_predictions"] = total_predictions
        state["performance_metrics"]["close_predictions"] = close_predictions
        state["performance_metrics"]["adaptation_success"] = adaptation_success
        state["performance_metrics"]["prediction_accuracy"] = (
            correct_predictions / total_predictions * 100 if total_predictions > 0 else 0.0
        )
        
        # Add prediction record
        if prediction_record:
            state["performance_metrics"]["prediction_history"].append(prediction_record)
            # Keep only last 100 predictions
            if len(state["performance_metrics"]["prediction_history"]) > 100:
                state["performance_metrics"]["prediction_history"] = state["performance_metrics"]["prediction_history"][-100:]
        
        self.save_state(state)
    
    def clear_all_data(self):
        """Clear all historical data and reset the system"""
        initial_state = self._get_initial_state()
        self.save_state(initial_state)
        print("✅ All data cleared! Adaptive system reset to initial state.")

class AdaptiveGamblingPredictor:
    """Advanced predictor that adapts to dynamic algorithm changes"""
    
    def __init__(self, state_manager: AdaptiveStateManager):
        self.state_manager = state_manager
        self.prediction_history = []
        self.adaptation_history = []
        self.current_strategy = "pattern_based"
        self.last_actual_value = None  # Track for proper evaluation
    
    def detect_algorithm_pattern(self, history: List[float]) -> Dict[str, Any]:
        """Detect what pattern the gambling algorithm is currently using - ENHANCED"""
        if len(history) < 10:
            return {"pattern": "random", "confidence": 0.3, "volatility": 0, "trend": 0, "avg_multiplier": 0}
        
        recent = history[-30:] if len(history) >= 30 else history
        
        # Calculate enhanced metrics
        volatility = self._calculate_volatility(recent)
        avg_multiplier = float(np.mean(recent))
        trend = self._calculate_trend(recent)
        momentum = self._calculate_momentum(recent)
        clustering_score = self._calculate_clustering_score(recent)
        
        # Detect cyclical patterns
        has_cycle = self._detect_cycles(recent)
        
        # Enhanced pattern detection with confidence scores
        pattern_scores = {}
        
        # Low volatility pattern (stable, predictable)
        if volatility < 0.3 and avg_multiplier < 3.0:
            pattern_scores["low_volatility"] = 0.85
        elif volatility < 0.5:
            pattern_scores["low_volatility"] = 0.6
        
        # High volatility pattern (erratic, large swings)
        if volatility > 2.5:
            pattern_scores["high_volatility"] = 0.9
        elif volatility > 1.5:
            pattern_scores["high_volatility"] = 0.7
        
        # Trending patterns (directional movement)
        if trend > 0.15 and momentum > 0:
            pattern_scores["trending_up"] = min(0.85, 0.5 + abs(trend) * 2)
        elif trend < -0.15 and momentum < 0:
            pattern_scores["trending_down"] = min(0.85, 0.5 + abs(trend) * 2)
        
        # Clustered pattern (values grouping together)
        if clustering_score > 0.7:
            pattern_scores["clustered"] = 0.80
        elif clustering_score > 0.5:
            pattern_scores["clustered"] = 0.65
        
        # Cyclical pattern
        if has_cycle:
            pattern_scores["cyclical"] = 0.75
        
        # Mean reversion pattern
        if self._detect_mean_reversion(recent):
            pattern_scores["mean_reversion"] = 0.70

        # Hurst exponent: < 0.45 = mean-reverting, > 0.55 = trending
        hurst = self._hurst_exponent(recent)
        if hurst < 0.45:
            pattern_scores["mean_reversion"] = max(pattern_scores.get("mean_reversion", 0), 0.65)
        elif hurst > 0.55:
            if trend > 0:
                pattern_scores["trending_up"] = max(pattern_scores.get("trending_up", 0), 0.60)
            else:
                pattern_scores["trending_down"] = max(pattern_scores.get("trending_down", 0), 0.60)

        # Determine dominant pattern
        if pattern_scores:
            # Use items() with a lambda to avoid typing issues with dict.get as the key function
            dominant_pattern, max_confidence = max(pattern_scores.items(), key=lambda kv: kv[1])
        else:
            dominant_pattern = "random"
            max_confidence = 0.5
        
        return {
            "pattern": dominant_pattern,
            "confidence": float(max_confidence),
            "volatility": float(volatility),
            "trend": float(trend),
            "momentum": float(momentum),
            "clustering": float(clustering_score),
            "avg_multiplier": float(avg_multiplier),
            "all_patterns": pattern_scores
        }
    
    def predict_next_multipliers(self, history: List[float]) -> List[float]:
        """Predict next multipliers using adaptive strategies - ENHANCED"""
        if len(history) < 10:
            # Not enough data - use conservative predictions
            recent_avg = float(np.mean(history)) if history else 2.0
            return [
                max(1.0, recent_avg * 0.9),
                max(1.0, recent_avg),
                max(1.0, recent_avg * 1.1)
            ]
        
        # Detect current algorithm pattern
        pattern_info = self.detect_algorithm_pattern(history)
        current_pattern = pattern_info["pattern"]
        confidence = pattern_info["confidence"]
        
        # Update state manager with pattern analysis
        self.state_manager.update_pattern_analysis({
            "volatility": pattern_info["volatility"],
            "trend": pattern_info["trend"],
            "clustering": pattern_info.get("clustering", 0),
            "confidence": confidence
        })
        
        # Get model state and check if we need to adapt
        model_state = self.state_manager.get_model_state()
        old_pattern = model_state.get("current_pattern", "random")
        bias_correction = float(model_state.get("bias_correction", 0.0))

        # Drift detection — if recent errors have spiked, reset before adapting
        if self._detect_drift(history):
            print("⚠️  Drift detected — resetting pattern state...")
            self.state_manager.update_model_state({
                "current_pattern": "random",
                "confidence_level": 0.5,
                "prediction_streak": 0,
                "bias_correction": bias_correction * 0.5
            })
            old_pattern = "random"

        # Adapt if pattern has changed significantly (with hysteresis)
        confidence_threshold = 0.65 if old_pattern == current_pattern else 0.7
        if old_pattern != current_pattern and confidence > confidence_threshold:
            self._adapt_strategy(old_pattern, current_pattern, pattern_info)

        # Weighted pattern blending — primary pattern gets full predictions,
        # secondary patterns contribute proportionally to their confidence
        predictions_ensemble = []

        primary_preds = self._get_pattern_predictions(history, current_pattern)
        predictions_ensemble.extend(primary_preds)

        all_patterns = pattern_info.get("all_patterns", {})
        for pattern, conf in sorted(all_patterns.items(), key=lambda x: x[1], reverse=True):
            if pattern != current_pattern and conf > 0.4:
                secondary_preds = self._get_pattern_predictions(history, pattern)
                n_to_add = 2 if conf >= 0.6 else 1
                predictions_ensemble.extend(secondary_preds[:n_to_add])

        # EWMA and linear extrapolation — always available, no minimum data required
        predictions_ensemble.extend(self._predict_ewma(history))
        predictions_ensemble.extend(self._predict_linear_extrapolation(history))

        # 4-model ML ensemble (activates at 60 samples)
        if len(history) >= PREDICTION_START_THRESHOLD:
            ml_preds = self._predict_ml(history)
            predictions_ensemble.extend(ml_preds)
        
        # Select best predictions from ensemble
        predictions = self._select_best_predictions(predictions_ensemble, history, pattern_info)

        # Apply lightweight feedback from recent misses so the next round
        # nudges in the direction the model has been consistently wrong.
        feedback = self._calculate_prediction_bias()
        blended_bias = float(np.clip((bias_correction * 0.6) + (feedback * 0.4), -0.25, 0.25))
        predictions = self._apply_bias_correction(predictions, blended_bias)
        self.state_manager.update_model_state({"bias_correction": blended_bias})
        
        # Ensure predictions are valid and diverse
        predictions = self._validate_predictions(predictions, history)
        
        self.prediction_history.append({
            "predictions": predictions[:3],
            "pattern": current_pattern,
            "confidence": confidence,
            "timestamp": datetime.now().isoformat()
        })
        
        return predictions[:3]
    
    def _predict_low_volatility(self, history: List[float]) -> List[float]:
        """Predict for low volatility patterns - ENHANCED"""
        recent = history[-15:]
        avg = float(np.mean(recent))
        std = float(np.std(recent))
        median = float(np.median(recent))
        
        # In low volatility, values cluster around mean/median
        return [
            float(max(1.0, median + random.uniform(-std * 0.5, std * 0.5))),
            float(max(1.0, avg + random.uniform(-std * 0.7, std * 0.7))),
            float(max(1.0, (avg + median) / 2 + random.uniform(-std * 0.3, std * 0.3)))
        ]
    
    def _predict_high_volatility(self, history: List[float]) -> List[float]:
        """Predict for high volatility patterns - ENHANCED"""
        recent = history[-20:]
        avg = float(np.mean(recent))
        std = float(np.std(recent))
        recent_max = float(max(recent[-10:]))
        recent_min = float(min(recent[-10:]))
        
        # High volatility means wider range and potential extremes
        predictions = [
            float(max(1.0, avg + random.uniform(-std * 2.5, std * 2.5))),
            float(max(1.0, random.uniform(recent_min * 0.8, recent_max * 1.2))),
            float(max(1.0, avg * random.uniform(0.5, 2.5)))
        ]
        
        # Add one extreme prediction
        if random.random() < 0.3:
            predictions.append(float(max(1.0, avg * random.choice([0.3, 3.0, 5.0]))))
        
        return predictions
    
    def _predict_trending(self, history: List[float], direction: str) -> List[float]:
        """Predict for trending patterns - ENHANCED"""
        recent = history[-15:]
        trend = self._calculate_trend(recent)
        momentum = self._calculate_momentum(recent)
        current_value = recent[-1]
        
        # Combine trend and momentum for better predictions
        trend_strength = abs(trend) + abs(momentum * 0.5)
        
        if direction == "up":
            base_multiplier = 1.0 + trend_strength
        else:
            base_multiplier = max(0.7, 1.0 - trend_strength)
        
        predictions = [
            max(1.0, current_value * base_multiplier * random.uniform(0.95, 1.05)),
            max(1.0, current_value * base_multiplier * random.uniform(0.90, 1.10)),
            max(1.0, current_value * base_multiplier * random.uniform(0.85, 1.15))
        ]
        
        return predictions
    
    def _predict_clustered(self, history: List[float]) -> List[float]:
        """Predict for clustered patterns - ENHANCED"""
        recent = history[-8:]
        cluster_center = float(np.mean(recent))
        cluster_std = float(np.std(recent))
        
        # Tight clustering
        predictions = [
            float(max(1.0, cluster_center * random.uniform(0.97, 1.03))),
            float(max(1.0, cluster_center + random.uniform(-cluster_std * 0.5, cluster_std * 0.5))),
            float(max(1.0, cluster_center * random.uniform(0.95, 1.05)))
        ]
        
        return predictions
    
    def _predict_cyclical(self, history: List[float]) -> List[float]:
        """Predict for cyclical patterns - NEW"""
        recent = history[-20:]
        
        # Detect cycle and predict next phase
        cycle_length = self._detect_cycle_length(recent)
        if cycle_length > 0:
            position_in_cycle = len(recent) % cycle_length
            reference_values = [recent[i] for i in range(len(recent)) if i % cycle_length == position_in_cycle]
            
            if reference_values:
                cycle_avg = float(np.mean(reference_values[-3:]))
                return [
                    max(1.0, cycle_avg * random.uniform(0.9, 1.1)),
                    max(1.0, cycle_avg * random.uniform(0.85, 1.15)),
                    max(1.0, cycle_avg * random.uniform(0.8, 1.2))
                ]
        
        # Fallback to trend-based
        return self._predict_trending(history, "up" if self._calculate_trend(recent) > 0 else "down")
    
    def _predict_mean_reversion(self, history: List[float]) -> List[float]:
        """Predict for mean reversion patterns - NEW"""
        recent = history[-20:]
        long_term_mean = float(np.mean(recent))
        current_value = recent[-1]
        
        # Predict reversion toward mean
        if current_value > long_term_mean * 1.2:
            # Expect reversion down
            return [
                max(1.0, current_value * random.uniform(0.85, 0.95)),
                max(1.0, long_term_mean * random.uniform(0.95, 1.05)),
                max(1.0, current_value * random.uniform(0.80, 0.90))
            ]
        elif current_value < long_term_mean * 0.8:
            # Expect reversion up
            return [
                max(1.0, current_value * random.uniform(1.05, 1.15)),
                max(1.0, long_term_mean * random.uniform(0.95, 1.05)),
                max(1.0, current_value * random.uniform(1.10, 1.20))
            ]
        else:
            # Near mean, predict small variations
            return [
                max(1.0, long_term_mean * random.uniform(0.95, 1.05)),
                max(1.0, long_term_mean * random.uniform(0.90, 1.10)),
                max(1.0, current_value * random.uniform(0.95, 1.05))
            ]
    
    def _predict_random(self, history: List[float]) -> List[float]:
        """Predict for truly random patterns - ENHANCED"""
        recent = history[-25:]
        avg = float(np.mean(recent))
        percentile_25 = float(np.percentile(recent, 25))
        percentile_75 = float(np.percentile(recent, 75))
        
        # Use wider distribution for random patterns
        predictions = [
            max(1.0, random.uniform(percentile_25, percentile_75)),
            max(1.0, avg * random.uniform(0.6, 2.0)),
            max(1.0, random.uniform(min(recent), max(recent)))
        ]
        
        return predictions

    def _get_pattern_predictions(self, history: List[float], pattern: str) -> List[float]:
        """Route to the correct prediction method for a given pattern name"""
        if pattern == "low_volatility":
            return self._predict_low_volatility(history)
        elif pattern == "high_volatility":
            return self._predict_high_volatility(history)
        elif pattern == "trending_up":
            return self._predict_trending(history, direction="up")
        elif pattern == "trending_down":
            return self._predict_trending(history, direction="down")
        elif pattern == "clustered":
            return self._predict_clustered(history)
        elif pattern == "cyclical":
            return self._predict_cyclical(history)
        elif pattern == "mean_reversion":
            return self._predict_mean_reversion(history)
        else:
            return self._predict_random(history)

    def _ml_features(self, window: List[float]) -> List[float]:
        """Extract 10 statistical features from a lookback window"""
        arr = np.array(window, dtype=float)
        mean = float(np.mean(arr))
        std = float(np.std(arr)) or 1e-6
        # Exponential weighted moving average (α=0.3)
        ewma = arr[0]
        for v in arr[1:]:
            ewma = 0.3 * v + 0.7 * ewma
        returns = np.diff(arr) / (arr[:-1] + 1e-9)
        return [
            mean,
            std,
            float(arr[-1]),                        # most recent value
            float(arr[-1]) - mean,                 # deviation from mean
            float(arr[-1]) / (mean + 1e-9),        # ratio to window mean
            float(np.min(arr)),
            float(np.max(arr)),
            float(ewma),
            float(np.mean(returns)),               # average return
            float(np.std(returns)),                # return volatility
        ]

    def _predict_ml(self, history: List[float]) -> List[float]:
        """4-model ensemble with engineered features: GBR + ExtraTrees + Ridge + KNN"""
        if len(history) < PREDICTION_START_THRESHOLD:
            return []
        try:
            lookback = 10
            X, y = [], []
            for i in range(lookback, len(history)):
                X.append(self._ml_features(history[i - lookback:i]))
                y.append(history[i])
            if len(X) < 20:
                return []

            X = np.array(X)
            y = np.array(y)
            X_train, y_train = X[-80:], y[-80:]

            scaler = StandardScaler()
            X_scaled = scaler.fit_transform(X_train)
            last_scaled = scaler.transform(np.array([self._ml_features(history[-lookback:])]))

            k = min(5, max(1, len(X_train) // 4))
            models = [
                GradientBoostingRegressor(
                    n_estimators=80, max_depth=3, learning_rate=0.05,
                    subsample=0.8, min_samples_leaf=3, random_state=42
                ),
                ExtraTreesRegressor(
                    n_estimators=80, max_depth=4, min_samples_leaf=3, random_state=42
                ),
                Ridge(alpha=1.0),
                KNeighborsRegressor(n_neighbors=k),
            ]

            preds = []
            for model in models:
                try:
                    model.fit(X_scaled, y_train)
                    p = max(1.0, float(model.predict(last_scaled)[0]))
                    if p <= 10000.0:
                        preds.append(p)
                except Exception:
                    continue

            if not preds:
                return []

            avg = float(np.mean(preds))
            lo = max(1.0, float(np.min(preds)))
            hi = max(1.0, float(np.max(preds)))
            return [avg, lo, hi]
        except Exception:
            return []

    def _predict_ewma(self, history: List[float]) -> List[float]:
        """Exponential weighted moving average — strong for mean-reverting series"""
        if len(history) < 5:
            return []
        try:
            alpha = 0.3
            ewma = float(history[0])
            for v in history[1:]:
                ewma = alpha * float(v) + (1 - alpha) * ewma
            return [max(1.0, ewma), max(1.0, ewma * 0.95), max(1.0, ewma * 1.05)]
        except Exception:
            return []

    def _predict_linear_extrapolation(self, history: List[float]) -> List[float]:
        """Linear trend extrapolation — strong for trending series"""
        if len(history) < 5:
            return []
        try:
            recent = history[-20:]
            x = np.arange(len(recent), dtype=float)
            coeffs = np.polyfit(x, recent, 1)
            next_val = max(1.0, float(np.polyval(coeffs, len(recent))))
            return [next_val, max(1.0, next_val * 0.95), max(1.0, next_val * 1.05)]
        except Exception:
            return []
    
    def _select_best_predictions(self, ensemble: List[float], history: List[float], 
                                pattern_info: Dict[str, Any]) -> List[float]:
        """Select best predictions from ensemble"""
        if not ensemble:
            return [2.0, 2.5, 3.0]
        
        # Remove duplicates and outliers
        ensemble = list(set([round(p, 2) for p in ensemble if 1.0 <= p <= 10000.0]))
        
        if len(ensemble) <= 3:
            return ensemble
        
        # Score each prediction based on historical patterns
        recent = history[-20:]
        recent_avg = float(np.mean(recent))
        recent_median = float(np.median(recent))
        recent_std = float(np.std(recent))
        recent_min = float(np.min(recent))
        recent_max = float(np.max(recent))
        trend_projection = float(self._predict_linear_extrapolation(history)[0]) if len(history) >= 5 else recent_avg
        
        scored_predictions = []
        for pred in ensemble:
            score = 0.0
            
            # Keep some preference for the recent center, but less aggressively.
            distance_from_avg = abs(pred - recent_avg) / recent_avg
            score += (1.0 - min(1.0, distance_from_avg)) * 1.0

            distance_from_median = abs(pred - recent_median) / max(recent_median, 1.0)
            score += (1.0 - min(1.0, distance_from_median)) * 0.8

            distance_from_trend = abs(pred - trend_projection) / max(trend_projection, 1.0)
            score += (1.0 - min(1.0, distance_from_trend)) * 0.7
            
            # Consider volatility
            if pattern_info["volatility"] < 1.0:
                # Low volatility — prefer predictions close to the recent center.
                if abs(pred - recent_avg) < recent_std:
                    score += 1.0
            else:
                # High volatility — keep plausible wider-range values in play.
                if recent_min * 0.9 <= pred <= recent_max * 1.1:
                    score += 0.9
                elif abs(pred - recent_avg) < recent_std * 2:
                    score += 0.4
            
            # Penalize extreme outliers
            if pred > recent_avg * 5 or pred < recent_avg * 0.2:
                score -= 1.0
            
            scored_predictions.append((pred, score))
        
        # Sort by score and take top 5
        scored_predictions.sort(key=lambda x: x[1], reverse=True)
        return [p[0] for p in scored_predictions[:5]]

    def _calculate_prediction_bias(self, window: int = 8) -> float:
        """Estimate whether recent predictions have been consistently too high or too low."""
        try:
            metrics = self.state_manager.get_performance_metrics()
            pred_history = metrics.get("prediction_history", [])
            if not pred_history:
                return 0.0

            recent_records = pred_history[-window:]
            weighted_errors = []
            total_weight = 0.0

            for idx, record in enumerate(recent_records, start=1):
                actual = float(record.get("actual", 0.0))
                closest = float(record.get("closest", 0.0))
                if actual <= 0.0 or closest <= 0.0:
                    continue

                # Positive means the model has been predicting too low.
                signed_error = (actual - closest) / actual
                severity = min(1.5, abs(signed_error) * 2.0 + (0.25 if not record.get("close", False) else 0.0))
                weight = idx * severity
                weighted_errors.append(signed_error * weight)
                total_weight += weight

            if total_weight == 0.0:
                return 0.0

            return float(np.clip(sum(weighted_errors) / total_weight, -0.25, 0.25))
        except:
            return 0.0

    def _apply_bias_correction(self, predictions: List[float], bias_correction: float) -> List[float]:
        """Shift predictions slightly based on recent signed error direction."""
        if not predictions or abs(bias_correction) < 0.01:
            return predictions

        corrected = []
        for pred in predictions:
            adjusted = float(pred) * (1.0 + bias_correction)
            corrected.append(max(1.0, min(10000.0, adjusted)))
        return corrected
    
    def _validate_predictions(self, predictions: List[float], history: List[float]) -> List[float]:
        """Validate and ensure prediction quality"""
        if not predictions:
            recent_avg = float(np.mean(history[-10:])) if len(history) >= 10 else 2.0
            return [recent_avg * 0.9, recent_avg, recent_avg * 1.1]
        
        # Remove invalid predictions
        valid_predictions = [p for p in predictions if 1.0 <= p <= 10000.0]
        
        if not valid_predictions:
            recent_avg = float(np.mean(history[-10:])) if len(history) >= 10 else 2.0
            return [recent_avg * 0.9, recent_avg, recent_avg * 1.1]
        
        # Remove duplicates and round
        valid_predictions = list(set([round(p, 2) for p in valid_predictions]))
        
        # Ensure diversity - predictions should span a reasonable range
        if len(valid_predictions) >= 3:
            pred_range = max(valid_predictions) - min(valid_predictions)
            avg_pred = float(np.mean(valid_predictions))
            
            if pred_range < avg_pred * 0.1:  # Too similar
                # Add more diverse predictions (ensure native Python floats for type-checkers)
                valid_predictions.extend([
                    float(max(1.0, avg_pred * 0.8)),
                    float(max(1.0, avg_pred * 1.2))
                ])
                valid_predictions = list(set([round(p, 2) for p in valid_predictions]))
        
        # Ensure we have at least 3 predictions
        while len(valid_predictions) < 3:
            recent_avg = float(np.mean(history[-10:])) if len(history) >= 10 else 2.0
            new_pred = max(1.0, recent_avg * random.uniform(0.7, 1.5))
            if new_pred not in valid_predictions:
                valid_predictions.append(round(new_pred, 2))
        
        return sorted(valid_predictions)[:5]  # Return up to 5 best predictions
    
    def _calculate_volatility(self, data: List[float]) -> float:
        """Calculate volatility with error handling"""
        if len(data) < 2:
            return 0.0
        
        try:
            returns = [data[i] / data[i-1] - 1 for i in range(1, len(data)) if data[i-1] != 0]
            if not returns:
                return 0.0
            return float(np.std(returns))
        except:
            return 0.0
    
    def _calculate_trend(self, data: List[float]) -> float:
        """Calculate trend with error handling"""
        if len(data) < 2:
            return 0.0
        
        try:
            x = np.arange(len(data))
            y = np.array(data)
            if np.mean(y) == 0:
                return 0.0
            slope = np.polyfit(x, y, 1)[0]
            return float(slope / np.mean(y))
        except:
            return 0.0
    
    def _calculate_momentum(self, data: List[float]) -> float:
        """Calculate momentum (rate of change)"""
        if len(data) < 5:
            return 0.0
        
        try:
            recent_avg = np.mean(data[-3:])
            older_avg = np.mean(data[-6:-3])
            if older_avg == 0:
                return 0.0
            return float((recent_avg - older_avg) / older_avg)
        except:
            return 0.0
    
    def _calculate_clustering_score(self, data: List[float]) -> float:
        """Calculate how much values are clustering"""
        if len(data) < 5:
            return 0.0
        
        try:
            recent = data[-8:]
            value_range = max(recent) - min(recent)
            avg_value = np.mean(recent)
            
            if avg_value == 0:
                return 0.0
            
            # Lower range relative to average = higher clustering
            clustering_score = 1.0 - min(1.0, value_range / avg_value)
            return float(clustering_score)
        except:
            return 0.0
    
    def _detect_cycles(self, data: List[float]) -> bool:
        """Detect if there are cyclical patterns using proper autocorrelation"""
        return self._detect_cycle_length(data) > 0

    def _detect_cycle_length(self, data: List[float]) -> int:
        """Detect cycle length via normalized numpy autocorrelation (lags 2-20)"""
        if len(data) < 12:
            return 0
        try:
            series = np.array(data, dtype=float) - np.mean(data)
            norm = float(np.dot(series, series))
            if norm == 0:
                return 0
            acf = np.correlate(series, series, mode='full')
            acf = acf[len(acf) // 2:]
            acf /= norm
            max_lag = min(20, len(data) // 3)
            for lag in range(2, max_lag):
                if acf[lag] > 0.5:
                    return lag
            return 0
        except:
            return 0
    
    def _detect_mean_reversion(self, data: List[float]) -> bool:
        """Detect mean reversion patterns"""
        if len(data) < 10:
            return False
        
        try:
            mean = np.mean(data)
            
            # Check if values oscillate around mean
            above_mean = [1 if x > mean else 0 for x in data[-10:]]
            transitions = sum([1 for i in range(1, len(above_mean)) if above_mean[i] != above_mean[i-1]])
            
            # High number of transitions suggests mean reversion
            return transitions >= 4
        except:
            return False
    
    def _hurst_exponent(self, data: List[float]) -> float:
        """Hurst exponent: <0.45 = mean-reverting, ~0.5 = random, >0.55 = trending"""
        if len(data) < 20:
            return 0.5
        try:
            ts = np.array(data, dtype=float)
            lags = range(2, min(20, len(ts) // 2))
            tau = [float(np.std(np.subtract(ts[lag:], ts[:-lag]))) for lag in lags]
            tau = [t if t > 0 else 1e-10 for t in tau]
            poly = np.polyfit(np.log(list(lags)), np.log(tau), 1)
            return float(poly[0])
        except:
            return 0.5

    def _entropy(self, data: List[float], bins: int = 10) -> float:
        """Shannon entropy — higher = more random/unpredictable"""
        if len(data) < 5:
            return 0.0
        try:
            counts, _ = np.histogram(data, bins=bins)
            probs = counts / float(len(data))
            probs = probs[probs > 0]
            return float(-np.sum(probs * np.log2(probs)))
        except:
            return 0.0

    def _detect_drift(self, history: List[float]) -> bool:
        """Return True when the latest error window is materially worse than the prior one."""
        try:
            metrics = self.state_manager.get_performance_metrics()
            pred_history = metrics.get("prediction_history", [])
            if len(pred_history) < 24:
                return False
            errors = [
                abs(p["actual"] - p["closest"]) / max(p["actual"], 1.0)
                for p in pred_history
                if "actual" in p and "closest" in p
            ]
            if len(errors) < 24:
                return False

            baseline_window = errors[-24:-12]
            recent_window = errors[-12:]
            baseline = float(np.mean(baseline_window))
            recent = float(np.mean(recent_window))

            # Require both a relative jump and a meaningful absolute increase
            # so random noise does not trigger repeated resets.
            return recent > max(0.18, baseline * 1.35) and (recent - baseline) > 0.05
        except:
            return False

    def _adapt_strategy(self, old_pattern: str, new_pattern: str, pattern_info: Dict[str, Any]):
        """Adapt prediction strategy when algorithm pattern changes"""
        confidence = pattern_info.get("confidence", 0.5)
        reason = f"Pattern changed from {old_pattern} to {new_pattern} (confidence: {confidence:.2f})"
        
        self.state_manager.record_algorithm_change(reason, old_pattern, new_pattern)
        self.state_manager.update_model_state({
            "current_pattern": new_pattern,
            "last_algorithm_change": datetime.now().isoformat(),
            "prediction_streak": 0,
            "confidence_level": confidence
        })
        
        self.adaptation_history.append({
            "timestamp": datetime.now().isoformat(),
            "old_pattern": old_pattern,
            "new_pattern": new_pattern,
            "reason": reason,
            "confidence": confidence
        })
        
        print(f"🔄 ADAPTATION: {reason}")
    
    def evaluate_prediction_accuracy(self, actual: float, predicted: List[float]) -> Dict[str, Any]:
        """Evaluate prediction accuracy with adaptive thresholds - FIXED"""
        if not predicted or actual is None:
            return {
                "correct": False,
                "close": False,
                "closest_prediction": 0.0,
                "difference": float('inf'),
                "accuracy_percentage": 0.0,
                "threshold_used": 0.0
            }
        
        best_diff = min([abs(p - actual) for p in predicted])
        closest_pred = min(predicted, key=lambda x: abs(x - actual))
        
        # Fixed percentage thresholds — no volatility inflation
        # exact = within 5% of actual (min ±0.05), close = within 15% (min ±0.15)
        exact_threshold = max(0.05, actual * 0.05)
        close_threshold = max(0.15, actual * 0.15)
        
        is_correct = best_diff <= exact_threshold
        is_close = best_diff <= close_threshold
        
        accuracy_pct = (1 - (best_diff / actual)) * 100 if actual > 0 else 0.0
        
        return {
            "correct": is_correct,
            "close": is_close,
            "closest_prediction": float(closest_pred),
            "difference": float(best_diff),
            "accuracy_percentage": float(max(0.0, accuracy_pct)),
            "threshold_used": float(exact_threshold)
        }

class AdaptiveGamblingSystem:
    """Main system with adaptive learning capabilities - ENHANCED"""
    
    def __init__(self):
        self.state_manager = AdaptiveStateManager()
        self.predictor = AdaptiveGamblingPredictor(self.state_manager)
        self.session_data_count = 0
        self.pending_predictions = None  # Store predictions for next evaluation
    
    def get_user_input(self) -> Optional[float]:
        """Get manual input from user with exit option"""
        while True:
            try:
                user_input = input("Enter multiplier (or 'q' to quit, 'c' to clear data, 's' for stats): ").strip().lower()
                
                if user_input == 'q':
                    return None
                elif user_input == 'c':
                    confirm = input("⚠️  Clear ALL data? Type 'yes' to confirm: ").strip().lower()
                    if confirm == 'yes':
                        self.state_manager.clear_all_data()
                        self.session_data_count = 0
                        self.pending_predictions = None
                        print("✅ All data cleared! Adaptive system reset.")
                    else:
                        print("❌ Clear cancelled.")
                    continue
                elif user_input == 's':
                    self.display_detailed_stats()
                    continue
                
                multiplier = float(user_input)
                
                if multiplier < 1.0 or multiplier > 10000.0:
                    print("❌ Error: Multiplier must be between 1.00 and 10000.00")
                    continue
                    
                return multiplier
                
            except ValueError:
                print("❌ Error: Please enter a valid number (e.g., 1.23, 2.45), 'q' to quit, or 's' for stats")
            except KeyboardInterrupt:
                print("\n\n⚠️  Program interrupted. Use 'q' to exit properly.")
                return None
    
    def display_system_status(self, next_predictions: Optional[List[float]] = None):
        """Display current system status with adaptive insights"""
        total_data_points = self.state_manager.get_data_count()
        performance_metrics = self.state_manager.get_performance_metrics()
        model_state = self.state_manager.get_model_state()
        pattern_analysis = self.state_manager.get_pattern_analysis()
        recent_data = self.state_manager.get_recent_data(10)
        
        # print("\n" + "="*70)
        # print("🎰 ADAPTIVE GAMBLING PREDICTION SYSTEM v2.1")
        # print("="*70)
        print(f"📈 Total Data Points: {total_data_points}")
        # print(f"📝 This Session: {self.session_data_count} new entries")
        print(f"🔄 Adaptation Level: {self.state_manager.load_state()['metadata']['adaptation_level']}")
        print(f"🎯 Current Pattern: {model_state.get('current_pattern', 'unknown').upper()}")
        print(f"   Confidence: {model_state.get('confidence_level', 0.5):.1%}")
        print(f"📊 Prediction Streak: {model_state.get('prediction_streak', 0)}")
        
        if recent_data and len(recent_data) >= 2:
            current_volatility = self.predictor._calculate_volatility(recent_data)
            current_trend = self.predictor._calculate_trend(recent_data)
            # print(f"📈 Recent Average: {np.mean(recent_data):.2f}")
            # print(f"⚡ Current Volatility: {current_volatility:.3f} ({self._volatility_label(current_volatility)})")
            print(f"📊 Recent Range: {min(recent_data):.2f} - {max(recent_data):.2f}")
            # print(f"📈 Trend: {self._trend_label(current_trend)}")
        
        # print(f"\n📋 Total Predictions: {performance_metrics['total_predictions']}")
        print(f"✅ Exact Predictions: {performance_metrics['correct_predictions']}")
        print(f"🎯 Close Predictions: {performance_metrics['close_predictions']}")
        print(f"🔄 Successful Adaptations: {performance_metrics['adaptation_success']}")
        print(f"📊 Overall Accuracy: {performance_metrics['prediction_accuracy']:.1f}%")
        
        # Show recent prediction history
        pred_history = performance_metrics.get('prediction_history', [])
        if pred_history:
            recent_5 = pred_history[-5:]
            recent_correct = sum(1 for p in recent_5 if p.get('correct', False))
            print(f"📈 Recent Form (last 5): {recent_correct}/5 correct")
        
        # Show algorithm changes
        algo_changes = pattern_analysis.get('algorithm_changes', [])
        if algo_changes:
            last_change = algo_changes[-1]
            print(f"\n🔄 Last Adaptation: {last_change['reason']}")
            print(f"   At Round: {last_change['round_number']}")
        
        # SHOW THE ACTUAL PREDICTIONS
        if next_predictions and total_data_points >= PREDICTION_START_THRESHOLD:
            print("\n🔮 PREDICTED NEXT MULTIPLIERS:")
            for i, pred in enumerate(next_predictions[:3], 1):
                print(f"   {i}. {pred:.2f}")
            
            # Show prediction confidence
            pattern_confidence = self._get_pattern_confidence_label(
                model_state.get('current_pattern', 'random'),
                model_state.get('confidence_level', 0.5)
            )
            print(f"   🎯 Confidence: {pattern_confidence}")
        elif total_data_points < PREDICTION_START_THRESHOLD:
            print(f"\n💡 Need at least {PREDICTION_START_THRESHOLD} data points to start predictions")
            print(f"   ({PREDICTION_START_THRESHOLD - total_data_points} more needed)")
        else:
            print("\n💡 Analyzing patterns...")
        
        print("="*70)
    
    def display_detailed_stats(self):
        """Display detailed statistics"""
        print("\n" + "="*70)
        print("📊 DETAILED STATISTICS")
        print("="*70)
        
        performance_metrics = self.state_manager.get_performance_metrics()
        pattern_analysis = self.state_manager.get_pattern_analysis()
        model_state = self.state_manager.get_model_state()
        
        # Performance breakdown
        total = performance_metrics['total_predictions']
        if total > 0:
            correct = performance_metrics['correct_predictions']
            close = performance_metrics['close_predictions']
            print(f"\n📈 PREDICTION PERFORMANCE:")
            print(f"   Exact: {correct}/{total} ({correct/total*100:.1f}%)")
            print(f"   Close: {close}/{total} ({close/total*100:.1f}%)")
            print(f"   Miss: {total-correct-close}/{total} ({(total-correct-close)/total*100:.1f}%)")
        
        # Pattern distribution
        pred_history = performance_metrics.get('prediction_history', [])
        if pred_history:
            patterns = [p.get('pattern', 'unknown') for p in pred_history]
            pattern_counts = {}
            for p in patterns:
                pattern_counts[p] = pattern_counts.get(p, 0) + 1
            
            print(f"\n🔍 PATTERN DISTRIBUTION:")
            for pattern, count in sorted(pattern_counts.items(), key=lambda x: x[1], reverse=True):
                print(f"   {pattern}: {count} ({count/len(patterns)*100:.1f}%)")
        
        # Adaptation history
        algo_changes = pattern_analysis.get('algorithm_changes', [])
        if algo_changes:
            print(f"\n🔄 ADAPTATION HISTORY (last 5):")
            for change in algo_changes[-5:]:
                print(f"   Round {change['round_number']}: {change['old_pattern']} → {change['new_pattern']}")
        
        print("="*70)
        input("\nPress Enter to continue...")
    
    def _volatility_label(self, volatility: float) -> str:
        """Get human-readable volatility label"""
        if volatility < 0.3:
            return "Very Low"
        elif volatility < 0.7:
            return "Low"
        elif volatility < 1.5:
            return "Moderate"
        elif volatility < 2.5:
            return "High"
        else:
            return "Very High"
    
    def _trend_label(self, trend: float) -> str:
        """Get human-readable trend label"""
        if abs(trend) < 0.05:
            return "Stable"
        elif trend > 0.15:
            return "Strong Upward"
        elif trend > 0.05:
            return "Upward"
        elif trend < -0.15:
            return "Strong Downward"
        else:
            return "Downward"
    
    def _get_pattern_confidence_label(self, pattern: str, confidence: float) -> str:
        """Get confidence level label based on pattern and confidence value"""
        if confidence >= 0.8:
            level = "VERY HIGH"
        elif confidence >= 0.7:
            level = "HIGH"
        elif confidence >= 0.6:
            level = "MEDIUM"
        else:
            level = "LOW"
        
        return f"{level} ({confidence:.1%})"
    
    def run_manual_mode(self):
        """Run the main adaptive input loop - FIXED"""
        print("🎰 ADAPTIVE PREDICTION SYSTEM v2.1")
        print("="*70)
       
        print("🎯 GOAL: Stay ahead of the gambling algorithm's adaptations")
        print("⏹️  Commands: 'q' to quit, 'c' to clear data, 's' for detailed stats")
        print("="*70)
        
        total_data_points = self.state_manager.get_data_count()
        self.session_data_count = 0
        
        if total_data_points > 0:
            print(f"📊 Loaded {total_data_points} existing data points")
            print(f"🔄 System has {self.state_manager.load_state()['metadata']['adaptation_level']} previous adaptations")
        
        # Main input loop
        while True:
            # Get historical data
            historical_data = self.state_manager.get_all_data()
            
            # Generate predictions for NEXT value
            next_predictions = []
            if len(historical_data) >= PREDICTION_START_THRESHOLD:
                next_predictions = self.predictor.predict_next_multipliers(historical_data)
                self.pending_predictions = next_predictions  # Store for evaluation
            
            # Display status with predictions
            self.display_system_status(next_predictions)
            
            # Get user input
            multiplier = self.get_user_input()
            if multiplier is None:
                print(f"\n👋 Exiting. Added {self.session_data_count} new entries.")
                print(f"💾 Total data points: {self.state_manager.get_data_count()}")
                print(f"🔄 Total adaptations: {self.state_manager.load_state()['metadata']['adaptation_level']}")
                break
            
            # NOW evaluate the prediction we made BEFORE this input
            if self.pending_predictions is not None and len(historical_data) >= PREDICTION_START_THRESHOLD:
                evaluation = self.predictor.evaluate_prediction_accuracy(multiplier, self.pending_predictions)
                
                # Update performance metrics
                current_metrics = self.state_manager.get_performance_metrics()
                current_correct = current_metrics["correct_predictions"]
                current_close = current_metrics["close_predictions"]
                current_total = current_metrics["total_predictions"]
                current_adaptations = current_metrics["adaptation_success"]
                
                current_total += 1
                if evaluation["correct"]:
                    current_correct += 1
                    model_state = self.state_manager.get_model_state()
                    if model_state.get('prediction_streak', 0) > 2:
                        current_adaptations += 1
                if evaluation["close"]:
                    current_close += 1
                
                # Record prediction outcome
                prediction_record = {
                    "timestamp": datetime.now().isoformat(),
                    "actual": float(multiplier),
                    "predictions": self.pending_predictions,
                    "closest": evaluation["closest_prediction"],
                    "correct": evaluation["correct"],
                    "close": evaluation["close"],
                    "pattern": self.state_manager.get_model_state().get('current_pattern', 'unknown')
                }
                
                self.state_manager.update_performance_metrics(
                    current_correct, current_total, current_close, current_adaptations,
                    prediction_record
                )
                
                # Update prediction streak
                model_state = self.state_manager.get_model_state()
                current_streak = model_state.get('prediction_streak', 0)
                if evaluation["correct"] or evaluation["close"]:
                    new_streak = current_streak + 1
                else:
                    new_streak = 0
                
                self.state_manager.update_model_state({"prediction_streak": new_streak})
                
                # Show evaluation
                print(f"\n📋 PREDICTION ANALYSIS:")
                print(f"   Actual: {multiplier:.2f}")
                print(f"   Predictions: {', '.join([f'{p:.2f}' for p in self.pending_predictions])}")
                print(f"   Closest: {evaluation['closest_prediction']:.2f}")
                print(f"   Difference: {evaluation['difference']:.2f}")
                print(f"   Accuracy: {evaluation['accuracy_percentage']:.1f}%")
                print(f"   Threshold: ±{evaluation['threshold_used']:.2f}")
                
                if evaluation["correct"]:
                    print("   🎯 STATUS: ✅ EXACT PREDICTION!")
                    if new_streak >= 3:
                        print(f"   🔥 PREDICTION STREAK: {new_streak}!")
                elif evaluation["close"]:
                    print("   🎯 STATUS: 👍 CLOSE PREDICTION")
                else:
                    print("   🎯 STATUS: 🔄 ADAPTING...")
            
            # Add the new data point
            self.state_manager.add_historical_data(multiplier)
            self.session_data_count += 1
            
            total_data_points = self.state_manager.get_data_count()
            print(f"\n✅ Added multiplier: {multiplier:.2f}")
            print(f"📊 Total data points: {total_data_points}")
            
            # Learning progress
            if total_data_points < PREDICTION_START_THRESHOLD:
                progress = (total_data_points / PREDICTION_START_THRESHOLD) * 100
                bar_length = int(progress / 5)
                print(f"🔄 Learning Progress: [{'█' * bar_length}{'░' * (20 - bar_length)}] {progress:.1f}%")
            else:
                adaptation_level = self.state_manager.load_state()['metadata']['adaptation_level']
                print(f"🎓 System fully trained with {adaptation_level} adaptations!")
            
            print()

def main():
    """Main function to run the adaptive gambling prediction system"""
    try:
        system = AdaptiveGamblingSystem()
        system.run_manual_mode()
    except KeyboardInterrupt:
        print("\n\n⚠️  Program interrupted. Data has been saved.")
    except Exception as e:
        print(f"\n❌ An error occurred: {e}")
        import traceback
        traceback.print_exc()
        print("\n💾 Data should be saved. Please restart the program.")

if __name__ == "__main__":
    main()
