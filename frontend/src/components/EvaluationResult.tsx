import type { EvaluationResult } from '../types'

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-900/50 rounded-lg p-2.5 text-center">
      <div className="text-xs text-slate-500 mb-0.5">{label}</div>
      <div className="text-slate-100 font-mono font-medium">{value}</div>
    </div>
  )
}

export default function EvaluationResultCard({ evaluation }: { evaluation: EvaluationResult }) {
  const { correct, close, closest_prediction, difference, accuracy_percentage, threshold_used } =
    evaluation

  const borderClass = correct
    ? 'border-green-700 bg-green-900/20'
    : close
      ? 'border-yellow-700 bg-yellow-900/20'
      : 'border-slate-700 bg-slate-900/30'

  const statusText = correct ? '✅ EXACT MATCH' : close ? '👍 CLOSE' : '🔄 ADAPTING'
  const statusColor = correct
    ? 'text-green-400'
    : close
      ? 'text-yellow-400'
      : 'text-slate-400'

  return (
    <div className={`rounded-xl p-4 border ${borderClass}`}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Last Result
        </h2>
        <span className={`text-sm font-bold ${statusColor}`}>{statusText}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Cell label="Closest" value={closest_prediction.toFixed(2)} />
        <Cell label="Difference" value={`±${difference.toFixed(2)}`} />
        <Cell label="Accuracy" value={`${accuracy_percentage.toFixed(1)}%`} />
      </div>
      <p className="text-xs text-slate-600 mt-2">Threshold: ±{threshold_used.toFixed(2)}</p>
    </div>
  )
}
