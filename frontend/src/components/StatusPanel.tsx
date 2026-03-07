import type { StatusResponse } from '../types'

const PATTERN_COLORS: Record<string, string> = {
  low_volatility: 'bg-green-900/40 text-green-400 border-green-800',
  high_volatility: 'bg-red-900/40 text-red-400 border-red-800',
  trending_up: 'bg-blue-900/40 text-blue-400 border-blue-800',
  trending_down: 'bg-orange-900/40 text-orange-400 border-orange-800',
  clustered: 'bg-purple-900/40 text-purple-400 border-purple-800',
  cyclical: 'bg-cyan-900/40 text-cyan-400 border-cyan-800',
  mean_reversion: 'bg-yellow-900/40 text-yellow-400 border-yellow-800',
  random: 'bg-slate-800 text-slate-400 border-slate-700',
}

function PatternBadge({ pattern }: { pattern: string }) {
  const cls = PATTERN_COLORS[pattern] ?? PATTERN_COLORS['random']
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full border font-medium uppercase tracking-wide ${cls}`}
    >
      {pattern.replace(/_/g, ' ')}
    </span>
  )
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-slate-900/60 rounded-lg p-3">
      <div className="text-xs text-slate-500 mb-0.5">{label}</div>
      <div className="text-xl font-bold text-slate-100">{value}</div>
    </div>
  )
}

export default function StatusPanel({ status }: { status: StatusResponse | null }) {
  if (!status) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 animate-pulse">
        <div className="h-3 bg-slate-700 rounded w-24 mb-4" />
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-slate-700 rounded-lg" />
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
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col gap-3">
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
        System Status
      </h2>

      <div className="grid grid-cols-2 gap-2">
        <StatBox label="Data Points" value={total_data_points} />
        <StatBox label="Adaptations" value={adaptation_level} />
        <StatBox label="Accuracy" value={`${performance.prediction_accuracy.toFixed(1)}%`} />
        <StatBox label="Streak" value={streakLabel} />
      </div>

      <div className="border-t border-slate-700 pt-3 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-slate-500 text-xs">Pattern</span>
          <PatternBadge pattern={model_state.current_pattern} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500 text-xs">Confidence</span>
          <span className="text-sm font-medium text-slate-200">{confPct}%</span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-1">
          <div
            className="bg-indigo-500 h-1 rounded-full transition-all duration-500"
            style={{ width: `${confPct}%` }}
          />
        </div>
      </div>

      <div className="border-t border-slate-700 pt-2 flex justify-between text-xs text-slate-500">
        <span>{performance.correct_predictions} exact</span>
        <span>{performance.close_predictions} close</span>
        <span>{performance.total_predictions} total</span>
      </div>
    </div>
  )
}
