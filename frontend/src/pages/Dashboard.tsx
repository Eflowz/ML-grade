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
  const { token, username, logout, isAdmin } = useAuth()

  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [pendingPredictions, setPendingPredictions] = useState<number[]>([])
  const [lastEvaluation, setLastEvaluation] = useState<EvaluationResult | null>(null)
  const [showStats, setShowStats] = useState(false)
  const [tempCredentials, setTempCredentials] = useState<{ username: string; password: string; expires_at: number } | null>(null)
  const [generatingTemp, setGeneratingTemp] = useState(false)

  const loadStatus = useCallback(async (showError = false) => {
    try {
      const res = await api.get<StatusResponse>('/api/status')
      setStatus((current) => {
        if (current?.last_updated === res.data.last_updated) {
          return current
        }
        return res.data
      })
      setPendingPredictions(res.data.current_predictions ?? [])
      return res.data
    } catch {
      if (showError) {
        toast.error('Unable to reach prediction engine')
      }
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadStatus(true)
  }, [loadStatus])

  useEffect(() => {
    if (!token) {
      return
    }

    const baseUrl = import.meta.env.VITE_API_URL ?? window.location.origin
    const streamUrl = new URL('/api/status/stream', baseUrl)
    streamUrl.searchParams.set('token', token)

    const eventSource = new EventSource(streamUrl.toString())
    let hasShownRealtimeError = false

    const handleStatusUpdate = (event: MessageEvent) => {
      const nextStatus = JSON.parse(event.data) as StatusResponse
      setStatus((current) => {
        if (current?.last_updated === nextStatus.last_updated) {
          return current
        }
        return nextStatus
      })
      setPendingPredictions(nextStatus.current_predictions ?? [])
      hasShownRealtimeError = false
      setLoading(false)
    }

    const handleStreamError = () => {
      if (!hasShownRealtimeError) {
        hasShownRealtimeError = true
        toast.error('Live updates disconnected, retrying...')
      }
      void loadStatus(false)
    }

    eventSource.addEventListener('status_updated', handleStatusUpdate as EventListener)
    eventSource.onerror = handleStreamError

    return () => {
      eventSource.removeEventListener('status_updated', handleStatusUpdate as EventListener)
      eventSource.close()
    }
  }, [loadStatus, token])

  const handleSubmit = async (multiplier: number) => {
    if (!isAdmin) {
      toast.error('Only admins can submit new multipliers')
      return
    }

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

      await loadStatus(false)
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
      setLastEvaluation(null)
      await loadStatus(false)
      toast.success('System reset')
    } catch {
      toast.error('Failed to clear data')
    }
  }

  const handleGenerateTemp = async (duration: string) => {
    setGeneratingTemp(true)
    try {
      const res = await api.post('/api/generate_temp', { duration })
      setTempCredentials(res.data)
      toast.success('Temporary access generated')
    } catch {
      toast.error('Failed to generate temporary access')
    } finally {
      setGeneratingTemp(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="animate-pulse text-sm text-black/50">
          Connecting ...
        </div>
      </div>
    )
  }

  const currentPredictions = status?.current_predictions ?? []
  const currentFutureTurnPredictions = status?.future_turn_predictions ?? []
  const currentPattern = status?.prediction_pattern ?? status?.model_state.current_pattern ?? 'random'
  const currentConfidence = status?.prediction_confidence ?? status?.model_state.confidence_level ?? 0
  const currentAllPatterns = status?.all_patterns ?? {}

  return (
    <div className="min-h-screen bg-white text-black">
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

            {isAdmin && (
              <button
                onClick={() => setShowStats(true)}
                className="rounded-xl border border-black/10 px-3 py-1.5 text-sm transition hover:bg-black hover:text-white"
              >
                Stats
              </button>
            )}

            {isAdmin && (
              <button
                onClick={handleClear}
                className="rounded-xl border border-black/10 px-3 py-1.5 text-sm text-red-600 transition hover:bg-red-50"
              >
                Clear
              </button>
            )}

            {isAdmin && (
              <select
                onChange={(e) => handleGenerateTemp(e.target.value)}
                disabled={generatingTemp}
                className="rounded-xl border border-black/10 px-3 py-1.5 text-sm transition hover:bg-black hover:text-white disabled:opacity-50"
                defaultValue=""
              >
                <option value="" disabled>Generate Temp Access</option>
                <option value="30min">30 minutes</option>
                <option value="1hour">1 hour</option>
                <option value="2hours">2 hours</option>
                <option value="6hours">6 hours</option>
                <option value="12hours">12 hours</option>
                <option value="24hours">24 hours</option>
                <option value="48hours">48 hours</option>
                <option value="72hours">72 hours</option>
              </select>
            )}

            <button
              onClick={logout}
              className="rounded-xl border border-black/10 px-3 py-1.5 text-sm text-black/60 transition hover:bg-black hover:text-white"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {tempCredentials && (
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl border border-black/10 bg-white p-5 shadow-sm">
            <button
              onClick={() => setTempCredentials(null)}
              className="absolute right-4 top-4 text-black/40 transition hover:text-black/80"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="mb-4 flex items-center gap-2">
              <div className="rounded-full bg-black/5 p-1.5">
                <svg className="h-5 w-5 text-black/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-black/80">Temporary Access Generated</h3>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="min-w-[70px] text-sm text-black/50">Username</span>
                <div className="min-w-0 flex-1">
                  <code className="block w-full truncate rounded bg-black/5 px-2 py-1.5 font-mono text-sm text-black/80">
                    {tempCredentials.username}
                  </code>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(tempCredentials.username)
                    toast.success('Username copied')
                  }}
                  className="shrink-0 rounded-lg border border-black/10 px-2.5 py-1.5 text-xs text-black/60 transition hover:bg-black hover:text-white"
                >
                  Copy
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="min-w-[70px] text-sm text-black/50">Password</span>
                <div className="min-w-0 flex-1">
                  <code className="block w-full truncate rounded bg-black/5 px-2 py-1.5 font-mono text-sm text-black/80">
                    {tempCredentials.password}
                  </code>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(tempCredentials.password)
                    toast.success('Password copied')
                  }}
                  className="shrink-0 rounded-lg border border-black/10 px-2.5 py-1.5 text-xs text-black/60 transition hover:bg-black hover:text-white"
                >
                  Copy
                </button>
              </div>

              <div className="flex items-center gap-2 border-t border-black/5 pt-2">
                <span className="min-w-[70px] text-sm text-black/50">Expires</span>
                <span className="flex-1 text-sm text-black/70">
                  {new Date(tempCredentials.expires_at * 1000).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`Username: ${tempCredentials.username}\nPassword: ${tempCredentials.password}`)
                  toast.success('Full credentials copied')
                }}
                className="flex-1 rounded-xl border border-black/10 px-3 py-2 text-sm text-black/70 transition hover:bg-black hover:text-white"
              >
                Copy Both
              </button>
              <button
                onClick={() => setTempCredentials(null)}
                className="flex-1 rounded-xl border border-black/10 px-3 py-2 text-sm text-black/50 transition hover:bg-black/5"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {isAdmin && (
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
          )}

          <div className={`flex flex-col gap-6 ${isAdmin ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
            <div className="rounded-3xl border border-black/10 bg-white p-5">
              <PredictionDisplay
                predictions={currentPredictions}
                futureTurnPredictions={currentFutureTurnPredictions}
                pattern={currentPattern}
                confidence={currentConfidence}
                dataPoints={status?.total_data_points ?? 0}
                allPatterns={currentAllPatterns}
              />
            </div>

            {/* {!isAdmin && (
              <div className="rounded-3xl border border-black/10 bg-black/[0.02] p-5 text-sm text-black/60">
                Read-only access is active. Only the admin can add data, and your dashboard will keep updating with the live next 3 and next 5 predictions.
              </div>
            )} */}

            {lastEvaluation && isAdmin && (
              <div className="rounded-3xl border border-black/10 bg-white p-5">
                <EvaluationResultCard evaluation={lastEvaluation} />
              </div>
            )}

            {status && isAdmin && (
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

      {showStats && isAdmin && <StatsModal onClose={() => setShowStats(false)} />}
    </div>
  )
}
