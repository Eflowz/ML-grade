const rawThreshold = Number(import.meta.env.VITE_PREDICTION_START_THRESHOLD ?? '60')
const MIN_POINTS = Number.isFinite(rawThreshold) && rawThreshold > 0 ? Math.floor(rawThreshold) : 60

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
  allPatterns?: Record<string, number>
}

export default function PredictionDisplay({ predictions, pattern, confidence, dataPoints, allPatterns }: Props) {
  const isReady = dataPoints >= MIN_POINTS
  const remaining = MIN_POINTS - dataPoints

  // Secondary patterns that also influenced the prediction (conf > 0.4, excluding primary)
  const contributing = Object.entries(allPatterns ?? {})
    .filter(([p, c]) => p !== pattern && c > 0.4)
    .sort(([, a], [, b]) => b - a)

  return (
    <div className="rounded-3xl border border-black/10 bg-white p-5">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-black/40">
          Next Predictions
        </h2>
        {isReady && predictions.length > 0 && (
          <span className="text-[11px] uppercase tracking-wide text-black/45">
            {confidenceLabel(confidence)} · {Math.round(confidence * 100)}%
          </span>
        )}
      </div>

      {!isReady ? (
        <div className="text-center py-8 flex flex-col items-center gap-4">
          <div className="rounded-2xl border border-black/10 bg-white p-4 w-full max-w-xs">
            <p className="text-[11px] uppercase tracking-wide text-black/45 mb-1">
              Data collection
            </p>
            <p className="font-mono text-sm text-black/60 mb-3">
              {remaining} more point{remaining !== 1 ? 's' : ''} needed
            </p>
            <div className="w-full bg-black/5 rounded-full h-1">
              <div
                className="bg-black/40 h-1 rounded-full transition-all"
                style={{ width: `${Math.min(100, (dataPoints / MIN_POINTS) * 100)}%` }}
              />
            </div>
            <p className="text-[10px] font-mono text-black/40 mt-2">
              {dataPoints} / {MIN_POINTS}
            </p>
          </div>
        </div>
      ) : predictions.length === 0 ? (
        <div className="rounded-2xl border border-black/10 bg-white p-6 text-center">
          <p className="text-[11px] uppercase tracking-wide text-black/45 mb-0.5">
            No predictions
          </p>
          <p className="font-mono text-sm text-black/60">
            Submit a multiplier to get predictions
          </p>
        </div>
      ) : (
        <>
          {/* Prediction grid */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {predictions.slice(0, 3).map((p, i) => (
              <div
                key={i}
                className={`rounded-2xl border p-3 text-center ${
                  i === 0
                    ? 'border-black/20 bg-white'
                    : 'border-black/10 bg-white'
                }`}
              >
                <div className="text-[11px] uppercase tracking-wide text-black/45 mb-0.5">
                  #{i + 1}
                </div>
                <div className={`font-mono text-sm font-medium ${
                  i === 0 ? 'text-black' : 'text-black/60'
                }`}>
                  {p.toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          {/* Active calculation pattern */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] uppercase tracking-wide text-black/40">
                Driving pattern:
              </span>
              <span className="text-[11px] font-medium uppercase tracking-widest text-black">
                {pattern.replace(/_/g, ' ')}
              </span>
              <span className="text-[11px] font-mono text-black/40">
                {Math.round(confidence * 100)}%
              </span>
            </div>

            {contributing.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] uppercase tracking-wide text-black/40">
                  Also using:
                </span>
                {contributing.map(([p, c]) => (
                  <span
                    key={p}
                    className="text-[10px] px-2 py-1 rounded-full border border-black/10 bg-white text-black/60 font-mono"
                  >
                    {p.replace(/_/g, ' ')} {Math.round(c * 100)}%
                  </span>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Footer */}
      <p className="mt-3 text-xs text-black/45">
        Based on {dataPoints} data points
      </p>
    </div>
  )
}
