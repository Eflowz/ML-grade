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
      <h3 className="text-[11px] font-medium uppercase tracking-[0.18em] text-black/40 mb-3">
        {title}
      </h3>
      {children}
    </div>
  )
}

function StatBox({
  label,
  value,
  color = 'text-black',
}: {
  label: string
  value: string | number
  color?: string
}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-3 text-center">
      <div className="text-[11px] uppercase tracking-wide text-black/45 mb-0.5">
        {label}
      </div>
      <div className={`font-mono text-sm font-medium ${color}`}>{value}</div>
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
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="rounded-3xl border border-black/10 bg-white w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-black/10 shrink-0">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-black/40">
            Detailed Statistics
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-2xl border border-black/10 bg-white text-black/40 hover:text-black/60 hover:bg-black/5 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5">
          {loading ? (
            <div className="py-12 text-center">
              <div className="rounded-2xl border border-black/10 bg-white p-4">
                <p className="text-[11px] uppercase tracking-wide text-black/45 mb-0.5">
                  Loading
                </p>
                <p className="font-mono text-sm text-black/60 animate-pulse">
                  Fetching statistics...
                </p>
              </div>
            </div>
          ) : !stats ? (
            <div className="py-12 text-center">
              <div className="rounded-2xl border border-black/10 bg-white p-4">
                <p className="text-[11px] uppercase tracking-wide text-black/45 mb-0.5">
                  Error
                </p>
                <p className="font-mono text-sm text-black/60">
                  Failed to load statistics
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Performance */}
              <Section title="Prediction Performance">
                <div className="grid grid-cols-4 gap-3">
                  <StatBox label="Total" value={stats.performance.total_predictions} />
                  <StatBox
                    label="Exact"
                    value={stats.performance.correct_predictions}
                    color="text-black"
                  />
                  <StatBox
                    label="Close"
                    value={stats.performance.close_predictions}
                    color="text-black"
                  />
                  <StatBox
                    label="Accuracy"
                    value={`${stats.performance.prediction_accuracy.toFixed(1)}%`}
                  />
                </div>
              </Section>

              {/* Pattern distribution */}
              {barData.length > 0 && (
                <Section title="Pattern Distribution">
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barData}>
                        <XAxis 
                          dataKey="name" 
                          tick={{ fontSize: 10, fill: 'rgba(0,0,0,0.45)' }} 
                          axisLine={{ stroke: 'rgba(0,0,0,0.1)' }}
                          tickLine={{ stroke: 'rgba(0,0,0,0.1)' }}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: 'rgba(0,0,0,0.45)' }}
                          axisLine={{ stroke: 'rgba(0,0,0,0.1)' }}
                          tickLine={{ stroke: 'rgba(0,0,0,0.1)' }}
                          allowDecimals={false}
                        />
                        <Tooltip
                          contentStyle={{
                            background: 'white',
                            border: '1px solid rgba(0,0,0,0.1)',
                            borderRadius: 16,
                            fontSize: 11,
                            boxShadow: 'none',
                          }}
                        />
                        <Bar dataKey="count" fill="black" radius={[8, 8, 0, 0]} opacity={0.4} />
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
                            background: 'white',
                            border: '1px solid rgba(0,0,0,0.1)',
                            borderRadius: 16,
                            fontSize: 11,
                            boxShadow: 'none',
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
                          stroke="black"
                          strokeWidth={1.5}
                          dot={false}
                          opacity={0.4}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Section>
              )}

              {/* Adaptation history */}
              {stats.adaptation_history.length > 0 && (
                <Section title="Adaptation History">
                  <div className="flex flex-col">
                    {[...stats.adaptation_history].reverse().map((a, i) => (
                      <div key={i} className="flex items-center gap-3 py-2 text-sm border-b border-black/5 last:border-0">
                        <span className="font-mono text-black/40 text-xs w-12">#{a.round_number}</span>
                        <span className="text-black/60 text-xs">{a.old_pattern.replace(/_/g, ' ')}</span>
                        <span className="text-black/20">→</span>
                        <span className="text-black font-mono text-xs">{a.new_pattern.replace(/_/g, ' ')}</span>
                      </div>
                    ))}
                  </div>
                </Section>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-black/10 shrink-0">
          <p className="text-xs text-black/45 text-center">
            Statistics based on all predictions
          </p>
        </div>
      </div>
    </div>
  )
}