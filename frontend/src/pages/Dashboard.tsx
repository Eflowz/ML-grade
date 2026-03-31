import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import type { StatusResponse, AddResponse, EvaluationResult } from '../types'
import api from '../api/client'
import StatusPanel from '../components/StatusPanel'
import MultiplierInput from '../components/MultiplierInput'
import PredictionDisplay from '../components/PredictionDisplay'
import EvaluationResultCard from '../components/EvaluationResult'
import RecentHistory from '../components/RecentHistory'
import StatsModal from '../components/StatsModal'

export default function Dashboard() {
  const { username, logout } = useAuth()

  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [pendingPredictions, setPendingPredictions] = useState<number[]>([])
  const [currentPredictions, setCurrentPredictions] = useState<number[]>([])
  const [currentPattern, setCurrentPattern] = useState('random')
  const [currentConfidence, setCurrentConfidence] = useState(0)
  const [currentAllPatterns, setCurrentAllPatterns] = useState<Record<string, number>>({})

  const [lastEvaluation, setLastEvaluation] = useState<EvaluationResult | null>(null)
  const [showStats, setShowStats] = useState(false)

  const loadStatus = useCallback(async () => {
    try {
      const res = await api.get<StatusResponse>('/api/status')
      setStatus(res.data)
    } catch {
      toast.error('Unable to reach prediction engine')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  const handleSubmit = async (multiplier: number) => {
    setSubmitting(true)

    try {
      const res = await api.post<AddResponse>('/api/add', {
        multiplier,
        pending_predictions: pendingPredictions,
      })

      if (res.data.evaluation) {
        setLastEvaluation(res.data.evaluation)

        if (res.data.evaluation.correct) {
          toast.success('Exact prediction')
        } else if (res.data.evaluation.close) {
          toast('Close prediction', { icon: '👍' })
        } else {
          toast('Adapting...', { icon: '🔄' })
        }
      }

      setPendingPredictions(res.data.next_predictions)
      setCurrentPredictions(res.data.next_predictions)
      setCurrentPattern(res.data.pattern)
      setCurrentConfidence(res.data.confidence)
      setCurrentAllPatterns(res.data.all_patterns ?? {})

      await loadStatus()
    } catch {
      toast.error('Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClear = async () => {
    if (!confirm('Clear all data and reset the system?')) return

    try {
      await api.post('/api/clear')

      setPendingPredictions([])
      setCurrentPredictions([])
      setLastEvaluation(null)

      await loadStatus()

      toast.success('System reset')
    } catch {
      toast.error('Failed to clear data')
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-sm text-black/50 animate-pulse">
          Connecting ...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-black">
      
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-black/10 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">

          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              Prediction Dashboard
            </h1>
            <p className="text-xs text-black/50">
              Adaptive pattern learning engine
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">

            <span className="hidden text-sm text-black/60 sm:block">
              {username}
            </span>

            <button
              onClick={() => setShowStats(true)}
              className="rounded-xl border border-black/10 px-3 py-1.5 text-sm transition hover:bg-black hover:text-white"
            >
              Stats
            </button>

            <button
              onClick={handleClear}
              className="rounded-xl border border-black/10 px-3 py-1.5 text-sm text-red-600 transition hover:bg-red-50"
            >
              Clear
            </button>

            <button
              onClick={logout}
              className="rounded-xl border border-black/10 px-3 py-1.5 text-sm text-black/60 transition hover:bg-black hover:text-white"
            >
              Sign out
            </button>

          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* Left column */}
          <div className="flex flex-col gap-6 lg:col-span-1">
            <div className="rounded-3xl border border-black/10 bg-white p-5">
              <StatusPanel status={status} />
            </div>

            <div className="rounded-3xl border border-black/10 bg-white p-5">
              <MultiplierInput
                onSubmit={handleSubmit}
                loading={submitting}
              />
            </div>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-6 lg:col-span-2">

            <div className="rounded-3xl border border-black/10 bg-white p-5">
              <PredictionDisplay
                predictions={currentPredictions}
                pattern={currentPattern}
                confidence={currentConfidence}
                dataPoints={status?.total_data_points ?? 0}
                allPatterns={currentAllPatterns}
              />
            </div>

            {lastEvaluation && (
              <div className="rounded-3xl border border-black/10 bg-white p-5">
                <EvaluationResultCard evaluation={lastEvaluation} />
              </div>
            )}

            {status && (
              <div className="rounded-3xl border border-black/10 bg-white p-5">
                <RecentHistory
                  recentData={status.recent_data}
                  history={status.performance.recent_history}
                />
              </div>
            )}

          </div>
        </div>
      </main>

      {showStats && <StatsModal onClose={() => setShowStats(false)} />}
    </div>
  )
}