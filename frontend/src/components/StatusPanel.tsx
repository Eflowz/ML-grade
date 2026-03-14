import type { StatusResponse } from '../types'

const PATTERN_STYLES: Record<string, string> = {
  low_volatility: 'bg-green-50 text-green-700 border-green-200',
  high_volatility: 'bg-red-50 text-red-700 border-red-200',
  trending_up: 'bg-blue-50 text-blue-700 border-blue-200',
  trending_down: 'bg-orange-50 text-orange-700 border-orange-200',
  clustered: 'bg-purple-50 text-purple-700 border-purple-200',
  cyclical: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  mean_reversion: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  random: 'bg-gray-100 text-gray-700 border-gray-200',
}

function PatternBadge({ pattern }: { pattern: string }) {
  const cls = PATTERN_STYLES[pattern] ?? PATTERN_STYLES['random']

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide ${cls}`}
    >
      {pattern.replace(/_/g, ' ')}
    </span>
  )
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-3 sm:p-4">
      <div className="text-[11px] uppercase tracking-wide text-black/45">
        {label}
      </div>

      <div className="mt-1 text-lg font-semibold tracking-tight sm:text-xl">
        {value}
      </div>
    </div>
  )
}

export default function StatusPanel({ status }: { status: StatusResponse | null }) {
  if (!status) {
    return (
      <div className="rounded-3xl border border-black/10 bg-white p-5 animate-pulse">
        <div className="h-3 w-24 rounded bg-black/10 mb-4" />

        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-2xl bg-black/10" />
          ))}
        </div>
      </div>
    )
  }

  const { model_state, performance, total_data_points, adaptation_level } = status

  const confPct = Math.round(model_state.confidence_level * 100)

  const streakLabel =
    model_state.prediction_streak > 0
      ? `${model_state.prediction_streak}${model_state.prediction_streak >= 3 ? ' 🔥' : ''}`
      : '0'

  return (
    <div className="rounded-3xl border border-black/10 bg-white p-5 flex flex-col gap-4">
      
      <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-black/40">
        System Status
      </h2>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatBox label="Data Points" value={total_data_points} />
        <StatBox label="Adaptations" value={adaptation_level} />
        <StatBox label="Accuracy" value={`${performance.prediction_accuracy.toFixed(1)}%`} />
        <StatBox label="Streak" value={streakLabel} />
      </div>

      {/* Pattern + confidence */}
      <div className="border-t border-black/10 pt-4 flex flex-col gap-3">

        <div className="flex items-center justify-between text-sm">
          <span className="text-black/50">Pattern</span>
          <PatternBadge pattern={model_state.current_pattern} />
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-black/50">Confidence</span>
          <span className="font-medium">{confPct}%</span>
        </div>

        <div className="h-1.5 w-full rounded-full bg-black/10">
          <div
            className="h-1.5 rounded-full bg-black transition-all duration-500"
            style={{ width: `${confPct}%` }}
          />
        </div>
      </div>

      {/* bottom stats */}
      <div className="border-t border-black/10 pt-3 flex justify-between text-xs text-black/45">
        <span>{performance.correct_predictions} exact</span>
        <span>{performance.close_predictions} close</span>
        <span>{performance.total_predictions} total</span>
      </div>

    </div>
  )
}