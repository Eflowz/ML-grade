import { useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import {
  FiUser,
  FiLock,
  FiEye,
  FiEyeOff,
  FiArrowRight,
} from 'react-icons/fi'
import { HiOutlineShieldCheck } from 'react-icons/hi2'
import { LuFingerprint } from 'react-icons/lu'

export default function LoginPage() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!username || !password) return

    setLoading(true)
    try {
      await login(username, password)
    } catch {
      toast.error('Invalid credentials', {
        style: {
          borderRadius: '14px',
          background: '#111111',
          color: '#ffffff',
          border: '1px solid #222222',
        },
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* Left Panel */}
        <div className="hidden lg:flex flex-col justify-between border-r border-black/10 bg-white px-12 py-10 xl:px-16">
          <div>
            <div className="inline-flex items-center gap-3 rounded-full border border-black/10 px-4 py-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-white">
                <LuFingerprint className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold tracking-tight">Prediction System</p>
                <p className="text-xs text-black/50">Secure intelligence access</p>
              </div>
            </div>
          </div>

          <div className="max-w-md">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium text-black/60">
              <HiOutlineShieldCheck className="h-4 w-4" />
              Trusted authentication
            </div>

            <h1 className="text-5xl font-semibold leading-tight tracking-tight">
              Simple.
              <br />
              Secure.
              <br />
              Premium.
            </h1>

            <p className="mt-6 max-w-sm text-base leading-7 text-black/60">
              A refined access experience designed with clarity, trust, and focus.
            </p>
          </div>

          <div className="flex items-center justify-between border-t border-black/10 pt-6 text-sm text-black/45">
            <span>© 2026 Prediction System</span>
            <span>Protected access</span>
          </div>
        </div>

        {/* Right Panel */}
        <div className="flex items-center justify-center px-6 py-10 sm:px-10 lg:px-16">
          <div className="w-full max-w-md">
            {/* Mobile Brand */}
            <div className="mb-10 lg:hidden">
              <div className="inline-flex items-center gap-3 rounded-full border border-black/10 px-4 py-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-white">
                  <LuFingerprint className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold tracking-tight">Prediction System</p>
                  <p className="text-xs text-black/50">Secure intelligence access</p>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <p className="mb-3 text-sm font-medium uppercase tracking-[0.18em] text-black/40">
                Welcome back
              </p>
              <h2 className="text-3xl font-semibold tracking-tight">Sign in</h2>
              <p className="mt-2 text-sm leading-6 text-black/55">
                Enter your credentials to continue securely.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="rounded-3xl border border-black/10 bg-white p-6 shadow-[0_10px_40px_rgba(0,0,0,0.04)] sm:p-8"
            >
              <div className="space-y-5">
                {/* Username */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-black/80">
                    Username
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-black/35">
                      <FiUser className="h-4 w-4" />
                    </span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter your username"
                      autoFocus
                      autoComplete="username"
                      disabled={loading}
                      className="h-14 w-full rounded-2xl border border-black/12 bg-white pl-11 pr-4 text-sm text-black outline-none transition placeholder:text-black/30 focus:border-black focus:ring-0 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-black/80">
                    Password
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-black/35">
                      <FiLock className="h-4 w-4" />
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      disabled={loading}
                      className="h-14 w-full rounded-2xl border border-black/12 bg-white pl-11 pr-12 text-sm text-black outline-none transition placeholder:text-black/30 focus:border-black focus:ring-0 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-black/40 transition hover:text-black"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <FiEyeOff className="h-4 w-4" />
                      ) : (
                        <FiEye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Top Row */}
                <div className="flex items-center justify-between gap-4 pt-1">
                  <label className="flex items-center gap-2 text-sm text-black/60">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-black/20 text-black focus:ring-0"
                    />
                    <span>Remember me</span>
                  </label>

                  <button
                    type="button"
                    className="text-sm font-medium text-black/60 transition hover:text-black"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading || !username || !password}
                  className="group flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-black text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign in</span>
                      <FiArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-6 flex items-center gap-2 text-xs text-black/45">
              <HiOutlineShieldCheck className="h-4 w-4" />
              <span>Encrypted session • Role-based access</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}