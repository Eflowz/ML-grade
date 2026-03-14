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
    <div className="rounded-3xl border border-black/10 bg-white p-5">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-black/40">
          Enter Multiplier
        </h2>

        {error && (
          <span className="text-sm font-medium text-red-600">
            Invalid
          </span>
        )}
      </div>

      {/* Input form */}
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
          className="w-full rounded-2xl border border-black/10 bg-white p-3 text-2xl font-mono text-black outline-none transition-colors placeholder-black/25 focus:border-black/20 disabled:opacity-50"
        />
        
        <button
          type="submit"
          disabled={loading || !value}
          className="w-full rounded-2xl border border-black/10 bg-white p-3 font-mono text-sm font-medium text-black transition-colors hover:bg-black/5 disabled:opacity-50 disabled:hover:bg-white"
        >
          {loading ? 'Processing...' : 'Submit →'}
        </button>
      </form>

      {/* Footer */}
      <p className="mt-3 text-xs text-black/45">
        Enter a value between 1.00 and 10000
      </p>

    </div>
  )
}