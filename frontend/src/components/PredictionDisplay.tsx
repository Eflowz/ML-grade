const MIN_POINTS = 30

function confidenceLabel(c: number): string {
  if (c >= 0.8) return 'VERY HIGH'
  if (c >= 0.7) return 'HIGH'
  if (c >= 0.6) return 'MEDIUM'
  return 'LOW'
}

interface Props {
  predictions: number[]
  pattern: string
  confidence: number
  dataPoints: number
}

export default function PredictionDisplay({ predictions, pattern, confidence, dataPoints }: Props) {
  const isReady = dataPoints >= MIN_POINTS
  const remaining = MIN_POINTS - dataPoints

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Next Predictions
        </h2>
        {isReady && predictions.length > 0 && (
          <span className="text-xs text-slate-500">
            {confidenceLabel(confidence)} · {Math.round(confidence * 100)}%
          </span>
        )}
      </div>

      {!isReady ? (
        <div className="text-center py-8 flex flex-col items-center gap-3">
          <p className="text-slate-400 text-sm">
            {remaining} more data point{remaining !== 1 ? 's' : ''} needed
          </p>
          <div className="w-full max-w-xs bg-slate-700 rounded-full h-1.5">
            <div
              className="bg-indigo-500 h-1.5 rounded-full transition-all"
              style={{ width: `${Math.min(100, (dataPoints / MIN_POINTS) * 100)}%` }}
            />
          </div>
          <p className="text-slate-600 text-xs">{dataPoints} / {MIN_POINTS}</p>
        </div>
      ) : predictions.length === 0 ? (
        <p className="text-slate-500 text-sm text-center py-8">
          Submit a multiplier to get predictions
        </p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-3">
            {predictions.slice(0, 3).map((p, i) => (
              <div
                key={i}
                className={`rounded-xl p-4 text-center border transition-all ${
                  i === 0
                    ? 'bg-indigo-900/30 border-indigo-700'
                    : 'bg-slate-900/50 border-slate-700'
                }`}
              >
                <div className="text-xs text-slate-500 mb-1">#{i + 1}</div>
                <div
                  className={`text-2xl font-bold font-mono ${
                    i === 0 ? 'text-indigo-300' : 'text-slate-200'
                  }`}
                >
                  {p.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
          <div className="text-xs text-slate-600 text-center tracking-widest">
            {pattern.replace(/_/g, ' ').toUpperCase()}
          </div>
        </>
      )}
    </div>
  )
}
