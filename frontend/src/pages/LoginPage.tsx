import { useState, type FormEvent, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { 
  FiUser, 
  FiLock, 
  FiLogIn, 
  FiShield, 
  FiCpu,
  FiAlertCircle,
  FiEye,
  FiEyeOff,
  FiArrowRight
} from 'react-icons/fi'
import { BiBot } from 'react-icons/bi'
import { RiSparklingLine, RiRadarLine } from 'react-icons/ri'

export default function LoginPage() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [focusedField, setFocusedField] = useState<'username' | 'password' | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!username || !password) return
    setLoading(true)
    try {
      await login(username, password)
    } catch {
      toast.error('Invalid credentials', {
        icon: '🔐',
        style: {
          borderRadius: '10px',
          background: '#1E293B',
          color: '#fff',
          border: '1px solid #334155'
        },
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-linear(rgba(99,102,241,0.03)_1px,transparent_1px),linear-linear(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-size-[50px_50px] [mask-image:radial-linear(ellipse_80%_50% at 50% 50%,black,transparent)]" />
        
        {/* Glowing Orbs */}
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob" />
        <div className="absolute top-0 -right-4 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000" />
        
        {/* Floating Particles */}
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute bg-indigo-500/20 rounded-full animate-float"
            style={{
              width: Math.random() * 4 + 2 + 'px',
              height: Math.random() * 4 + 2 + 'px',
              left: Math.random() * 100 + '%',
              top: Math.random() * 100 + '%',
              animationDelay: Math.random() * 5 + 's',
              animationDuration: Math.random() * 10 + 10 + 's',
            }}
          />
        ))}
      </div>

      {/* Main Content */}
      <div 
        className={`w-full max-w-md transform transition-all duration-700 ${
          mounted ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}
      >
        {/* Header Section */}
        <div className="text-center mb-8 relative">
          {/* Logo Container */}
          <div className="relative inline-block mb-6 group">
            {/* Animated Rings */}
            <div className="absolute inset-0 rounded-full bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500 animate-spin-slow blur-xl opacity-75 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="absolute inset-2 rounded-full bg-linear-to-r from-indigo-600 via-purple-600 to-pink-600 animate-spin-slower" />
            
            {/* Logo */}
            <div className="relative w-24 h-24 bg-linear-to-br from-slate-900 to-slate-800 rounded-2xl flex items-center justify-center transform hover:scale-110 transition-transform duration-300 border border-indigo-500/30">
              <div className="absolute inset-0 bg-indigo-500/10 rounded-2xl animate-pulse" />
              <BiBot className="w-12 h-12 text-indigo-400" />
              <RiSparklingLine className="absolute -top-1 -right-1 w-5 h-5 text-yellow-400 animate-ping" />
            </div>
          </div>

          {/* Title with linear */}
          <h1 className="text-4xl font-bold mb-2 bg-linear-to-r from-indigo-400 via-purple-400 to-pink-400 text-transparent bg-clip-text">
            Prediction System
          </h1>
          
          {/* Version Badge */}
          <div className="flex items-center justify-center gap-2">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-800/50 backdrop-blur-sm rounded-full border border-indigo-500/30">
              <RiRadarLine className="w-4 h-4 text-indigo-400 animate-pulse" />
              <span className="text-sm text-slate-300">v2.1 — Adaptive Pattern Learning</span>
              <FiShield className="w-4 h-4 text-green-400" />
            </div>
          </div>
        </div>

        {/* Login Form */}
        <form
          onSubmit={handleSubmit}
          className="relative backdrop-blur-xl bg-slate-900/70 border border-slate-700/50 rounded-3xl p-8 shadow-2xl shadow-indigo-500/10"
        >
          {/* Form Header */}
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 px-4 bg-slate-900 rounded-full border border-indigo-500/30">
            <span className="text-xs font-medium text-indigo-400">SECURE ACCESS</span>
          </div>

          <div className="space-y-6 mt-4">
            {/* Username Field */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <FiUser className="w-4 h-4 text-indigo-400" />
                Username
              </label>
              <div className="relative group">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onFocus={() => setFocusedField('username')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Enter your username"
                  autoFocus
                  autoComplete="username"
                  disabled={loading}
                  className="w-full bg-slate-800/50 border-2 border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3.5 text-slate-100 outline-none transition-all duration-300 placeholder-slate-500 pr-10 group-hover:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <div className={`absolute inset-0 rounded-xl bg-linear-to-r from-indigo-500/20 to-purple-500/20 blur-xl transition-opacity duration-500 -z-10 ${
                  focusedField === 'username' ? 'opacity-100' : 'opacity-0'
                }`} />
                {username && (
                  <FiUser className="absolute right-4 top-1/2 transform -translate-y-1/2 text-indigo-400 w-4 h-4" />
                )}
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <FiLock className="w-4 h-4 text-indigo-400" />
                Password
              </label>
              <div className="relative group">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={loading}
                  className="w-full bg-slate-800/50 border-2 border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3.5 text-slate-100 outline-none transition-all duration-300 placeholder-slate-500 pr-12 group-hover:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-indigo-400 transition-colors"
                >
                  {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                </button>
                <div className={`absolute inset-0 rounded-xl bg-linear-to-r from-indigo-500/20 to-purple-500/20 blur-xl transition-opacity duration-500 -z-10 ${
                  focusedField === 'password' ? 'opacity-100' : 'opacity-0'
                }`} />
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0 focus:ring-1" />
                <span className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">Remember me</span>
              </label>
              <button type="button" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1">
                Forgot password?
                <FiArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !username || !password}
              className="relative w-full py-4 bg-linear-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 disabled:from-slate-700 disabled:to-slate-700 rounded-xl font-semibold text-white transition-all duration-300 transform hover:scale-[1.02] disabled:hover:scale-100 disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden"
            >
              {/* Animated Background Effect */}
              <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              
              {/* Button Content */}
              <div className="relative flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <FiLogIn className="w-5 h-5" />
                    <span>Sign In</span>
                    <FiCpu className="w-4 h-4 animate-pulse" />
                  </>
                )}
              </div>
            </button>

            {/* Security Note */}
            <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
              <FiShield className="w-3 h-3" />
              <span>End-to-end encrypted</span>
              <span className="w-1 h-1 bg-slate-600 rounded-full" />
              <FiAlertCircle className="w-3 h-3" />
              <span>2FA available</span>
            </div>
          </div>

          {/* Decorative Corner Elements */}
          <div className="absolute top-0 left-0 w-20 h-20 border-l-2 border-t-2 border-indigo-500/30 rounded-tl-3xl" />
          <div className="absolute top-0 right-0 w-20 h-20 border-r-2 border-t-2 border-indigo-500/30 rounded-tr-3xl" />
          <div className="absolute bottom-0 left-0 w-20 h-20 border-l-2 border-b-2 border-indigo-500/30 rounded-bl-3xl" />
          <div className="absolute bottom-0 right-0 w-20 h-20 border-r-2 border-b-2 border-indigo-500/30 rounded-br-3xl" />
        </form>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-slate-600">
          <p>© 2024 Prediction System. All rights reserved.</p>
          <p className="mt-1">Secure Access • Role-based Authentication • Audit Logging</p>
        </div>
      </div>
    </div>
  )
}