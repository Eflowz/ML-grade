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
  const [lastEvaluation, setLastEvaluation] = useState<EvaluationResult | null>(null)
  const [showStats, setShowStats] = useState(false)

  const loadStatus = useCallback(async () => {
    try {
      const res = await api.get<StatusResponse>('/api/status')
      setStatus(res.data)
    } catch {
      toast.error('Failed to connect to backend')
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
          toast.success('Exact prediction!')
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
      await loadStatus()
    } catch {
      toast.error('Failed to submit')
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
      toast.success('Data cleared')
    } catch {
      toast.error('Failed to clear data')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="text-slate-400 animate-pulse">Connecting to prediction engine...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-6">
      {/* Header */}
      <div className="max-w-5xl mx-auto mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-indigo-400">Adaptive Prediction System</h1>
          <p className="text-slate-500 text-xs mt-0.5">v2.1 — Pattern Learning Engine</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500 text-sm hidden sm:block">{username}</span>
          <button
            onClick={() => setShowStats(true)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm transition-colors"
          >
            Stats
          </button>
          <button
            onClick={handleClear}
            className="px-3 py-1.5 bg-slate-800 hover:bg-red-900/40 border border-slate-700 hover:border-red-700 rounded-lg text-sm transition-colors text-red-400"
          >
            Clear
          </button>
          <button
            onClick={logout}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm transition-colors text-slate-400"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Main grid */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 flex flex-col gap-4">
          <StatusPanel status={status} />
          <MultiplierInput onSubmit={handleSubmit} loading={submitting} />
        </div>

        <div className="lg:col-span-2 flex flex-col gap-4">
          <PredictionDisplay
            predictions={currentPredictions}
            pattern={currentPattern}
            confidence={currentConfidence}
            dataPoints={status?.total_data_points ?? 0}
          />
          {lastEvaluation && <EvaluationResultCard evaluation={lastEvaluation} />}
          {status && (
            <RecentHistory
              recentData={status.recent_data}
              history={status.performance.recent_history}
            />
          )}
        </div>
      </div>

      {showStats && <StatsModal onClose={() => setShowStats(false)} />}
    </div>
  )
}
