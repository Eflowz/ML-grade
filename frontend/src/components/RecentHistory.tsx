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
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col gap-3">
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
        Recent History
      </h2>

      {chartData.length >= 4 && (
        <div className="h-20">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <Tooltip
                contentStyle={{
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: 8,
                  fontSize: 11,
                }}
                formatter={(value) => [`${Number(value).toFixed(2)}x`, '']}
                labelStyle={{ display: 'none' }}
              />
              <Line
                type="monotone"
                dataKey="v"
                stroke="#6366f1"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {recent5.length > 0 ? (
        <div className="flex flex-col divide-y divide-slate-700/50">
          {recent5.map((record, i) => (
            <div key={i} className="flex items-center justify-between py-1.5 text-sm">
              <span className="font-mono text-slate-300">
                {record.correct ? '✅' : record.close ? '🟡' : '❌'} {record.actual.toFixed(2)}
              </span>
              <span className="text-slate-500 text-xs">→ {record.closest.toFixed(2)}</span>
              <span
                className={`text-xs ${
                  record.correct
                    ? 'text-green-400'
                    : record.close
                      ? 'text-yellow-400'
                      : 'text-slate-500'
                }`}
              >
                {record.correct ? 'exact' : record.close ? 'close' : 'miss'}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-slate-600 text-xs text-center py-1">
          No prediction history yet
        </p>
      )}
    </div>
  )
}
