import { useState, type FormEvent } from 'react'

interface Props {
  onSubmit: (multiplier: number) => void
  loading: boolean
}

export default function MultiplierInput({ onSubmit, loading }: Props) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const num = parseFloat(value)
    if (isNaN(num)) {
      setError('Enter a valid number')
      return
    }
    if (num < 1.0 || num > 10000) {
      setError('Must be between 1.00 and 10000')
      return
    }
    setError('')
    setValue('')
    onSubmit(num)
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
        Enter Multiplier
      </h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="number"
          step="0.01"
          min="1"
          max="10000"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setError('')
          }}
          placeholder="e.g. 2.45"
          autoFocus
          disabled={loading}
          className="w-full bg-slate-900 border border-slate-600 focus:border-indigo-500 rounded-lg px-4 py-3 text-2xl font-mono text-slate-100 outline-none transition-colors placeholder-slate-700"
        />
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <button
          type="submit"
          disabled={loading || !value}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg font-semibold transition-colors text-white"
        >
          {loading ? 'Processing...' : 'Submit →'}
        </button>
      </form>
    </div>
  )
}
