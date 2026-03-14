import { LineChart, Line, Tooltip, ResponsiveContainer } from 'recharts'
import type { PredictionRecord } from '../types'

interface Props {
  recentData: number[]
  history: PredictionRecord[]
}

export default function RecentHistory({ recentData, history }: Props) {
  const chartData = recentData.map((v, i) => ({ i: i + 1, v }))
  const recent5 = [...history].slice(-5).reverse()

  return (
    <div className="rounded-3xl border border-black/10 bg-white p-5">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-black/40">
          Recent History
        </h2>
      </div>

      {/* Chart */}
      {chartData.length >= 4 && (
        <div className="h-20 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <Tooltip
                contentStyle={{
                  background: 'white',
                  border: '1px solid rgba(0,0,0,0.1)',
                  borderRadius: 16,
                  fontSize: 11,
                  boxShadow: 'none',
                }}
                formatter={(value) => [`${Number(value).toFixed(2)}x`, '']}
                labelStyle={{ display: 'none' }}
              />
              <Line
                type="monotone"
                dataKey="v"
                stroke="black"
                strokeWidth={1.5}
                dot={false}
                opacity={0.4}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* History list */}
      {recent5.length > 0 ? (
        <div className="flex flex-col">
          {recent5.map((record, i) => (
            <div key={i} className="flex items-center justify-between py-2 text-sm border-b border-black/5 last:border-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-black/60">
                  {record.actual.toFixed(2)}
                </span>
                <span className="text-black/20">→</span>
                <span className="font-mono text-black">
                  {record.closest.toFixed(2)}
                </span>
              </div>
              <span
                className={`text-[11px] uppercase tracking-wide ${
                  record.correct
                    ? 'text-black/60'
                    : record.close
                      ? 'text-black/60'
                      : 'text-black/40'
                }`}
              >
                {record.correct ? 'Exact match' : record.close ? 'Close' : 'Miss'}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-black/10 bg-white p-4 text-center">
          <p className="text-[11px] uppercase tracking-wide text-black/45">
            No history
          </p>
          <p className="font-mono text-sm text-black/60">
            Waiting for predictions...
          </p>
        </div>
      )}

      {/* Footer with count */}
      <p className="mt-3 text-xs text-black/45">
        Last {recent5.length} predictions shown
      </p>
    </div>
  )
}