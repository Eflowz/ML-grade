export interface ModelState {
  current_pattern: string
  confidence_level: number
  prediction_streak: number
}

export interface PredictionRecord {
  actual: number
  predictions: number[]
  closest: number
  correct: boolean
  close: boolean
  pattern: string
  timestamp?: string
}

export interface Performance {
  total_predictions: number
  correct_predictions: number
  close_predictions: number
  prediction_accuracy: number
  recent_history: PredictionRecord[]
}

export interface StatusResponse {
  total_data_points: number
  adaptation_level: number
  model_state: ModelState
  performance: Performance
  recent_data: number[]
  ready_for_predictions: boolean
}

export interface EvaluationResult {
  correct: boolean
  close: boolean
  closest_prediction: number
  difference: number
  accuracy_percentage: number
  threshold_used: number
}

export interface AddResponse {
  success: boolean
  evaluation: EvaluationResult | null
  next_predictions: number[]
  pattern: string
  confidence: number
  all_patterns: Record<string, number>
  total_data_points: number
}

export interface StatsResponse {
  performance: {
    total_predictions: number
    correct_predictions: number
    close_predictions: number
    prediction_accuracy: number
  }
  pattern_distribution: Record<string, number>
  adaptation_history: AdaptationRecord[]
  volatility_history: number[]
  confidence_history: number[]
  prediction_history: PredictionRecord[]
}

export interface AdaptationRecord {
  timestamp: string
  reason: string
  old_pattern: string
  new_pattern: string
  round_number: number
}
