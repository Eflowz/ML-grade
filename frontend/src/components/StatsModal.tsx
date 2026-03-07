import { useEffect, useState, type ReactNode } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts'
import api from '../api/client'
import type { StatsResponse } from '../types'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
        {title}
      </h3>
      {children}
    </div>
  )
}

function StatBox({
  label,
  value,
  color = 'text-slate-100',
}: {
  label: string
  value: string | number
  color?: string
}) {
  return (
    <div className="bg-slate-900/60 rounded-lg p-3 text-center">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
    </div>
  )
}

export default function StatsModal({ onClose }: { onClose: () => void }) {
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get<StatsResponse>('/api/stats')
      .then((res) => {
        setStats(res.data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const barData = stats
    ? Object.entries(stats.pattern_distribution).map(([k, v]) => ({
        name: k.replace(/_/g, ' '),
        count: v,
      }))
    : []

  const confData = stats
    ? stats.confidence_history.map((v, i) => ({ i, v }))
    : []

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-700 shrink-0">
          <h2 className="text-base font-bold text-slate-100">Detailed Statistics</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5">
          {loading ? (
            <div className="py-12 text-center text-slate-500 animate-pulse">Loading...</div>
          ) : !stats ? (
            <div className="py-12 text-center text-slate-500">Failed to load statistics</div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Performance */}
              <Section title="Prediction Performance">
                <div className="grid grid-cols-4 gap-2">
                  <StatBox label="Total" value={stats.performance.total_predictions} />
                  <StatBox
                    label="Exact"
                    value={stats.performance.correct_predictions}
                    color="text-green-400"
                  />
                  <StatBox
                    label="Close"
                    value={stats.performance.close_predictions}
                    color="text-yellow-400"
                  />
                  <StatBox
                    label="Accuracy"
                    value={`${stats.performance.prediction_accuracy.toFixed(1)}%`}
                    color="text-indigo-400"
                  />
                </div>
              </Section>

              {/* Pattern distribution */}
              {barData.length > 0 && (
                <Section title="Pattern Distribution">
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barData}>
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                        <YAxis
                          tick={{ fontSize: 10, fill: '#94a3b8' }}
                          allowDecimals={false}
                        />
                        <Tooltip
                          contentStyle={{
                            background: '#1e293b',
                            border: '1px solid #334155',
                            borderRadius: 8,
                            fontSize: 11,
                          }}
                        />
                        <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Section>
              )}

              {/* Confidence over time */}
              {confData.length > 3 && (
                <Section title="Confidence Over Time">
                  <div className="h-28">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={confData}>
                        <Tooltip
                          contentStyle={{
                            background: '#1e293b',
                            border: '1px solid #334155',
                            borderRadius: 8,
                            fontSize: 11,
                          }}
                          formatter={(value) => [
                            `${Math.round(Number(value) * 100)}%`,
                            'confidence',
                          ]}
                          labelStyle={{ display: 'none' }}
                        />
                        <Line
                          type="monotone"
                          dataKey="v"
                          stroke="#a78bfa"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Section>
              )}

              {/* Adaptation history */}
              {stats.adaptation_history.length > 0 && (
                <Section title="Adaptation History">
                  <div className="flex flex-col divide-y divide-slate-700/50">
                    {[...stats.adaptation_history].reverse().map((a, i) => (
                      <div key={i} className="flex items-center gap-2 py-1.5 text-xs">
                        <span className="text-slate-500 font-mono w-10">#{a.round_number}</span>
                        <span className="text-slate-400">{a.old_pattern.replace(/_/g, ' ')}</span>
                        <span className="text-slate-600">→</span>
                        <span className="text-indigo-400">{a.new_pattern.replace(/_/g, ' ')}</span>
                      </div>
                    ))}
                  </div>
                </Section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
