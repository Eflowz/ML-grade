import type { EvaluationResult } from '../types'

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-3 text-center">
      <div className="text-[11px] uppercase tracking-wide text-black/45 mb-0.5">
        {label}
      </div>
      <div className="font-mono text-sm font-medium text-black">
        {value}
      </div>
    </div>
  )
}

export default function EvaluationResultCard({ evaluation }: { evaluation: EvaluationResult }) {
  const {
    correct,
    close,
    closest_prediction,
    difference,
    accuracy_percentage,
    threshold_used,
  } = evaluation

  const borderClass = correct
    ? 'border-green-200 bg-green-50'
    : close
      ? 'border-yellow-200 bg-yellow-50'
      : 'border-black/10 bg-white'

  const statusText = correct ? 'Exact match' : close ? 'Close prediction' : 'Adapting'

  const statusColor = correct
    ? 'text-green-700'
    : close
      ? 'text-yellow-700'
      : 'text-black/60'

  return (
    <div className={`rounded-3xl border p-5 ${borderClass}`}>
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-black/40">
          Last Result
        </h2>

        <span className={`text-sm font-medium ${statusColor}`}>
          {statusText}
        </span>
      </div>

      {/* Result grid */}
      <div className="grid grid-cols-3 gap-3">
        <Cell label="Closest" value={closest_prediction.toFixed(2)} />
        <Cell label="Difference" value={`±${difference.toFixed(2)}`} />
        <Cell label="Accuracy" value={`${accuracy_percentage.toFixed(1)}%`} />
      </div>

      {/* Footer */}
      <p className="mt-3 text-xs text-black/45">
        Threshold used: ±{threshold_used.toFixed(2)}
      </p>

    </div>
  )
}