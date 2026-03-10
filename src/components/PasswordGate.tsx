import { useState, useEffect, useRef } from 'react'

const SESSION_KEY = 'ntf_auth_token'

function isAuthenticated(): boolean {
  try {
    return !!sessionStorage.getItem(SESSION_KEY)
  } catch {
    return false
  }
}

export default function PasswordGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false)
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setAuthed(isAuthenticated())
    setReady(true)
  }, [])

  useEffect(() => {
    if (ready && !authed) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [ready, authed])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim() || loading) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (res.ok) {
        const { token } = await res.json()
        sessionStorage.setItem(SESSION_KEY, token)
        setAuthed(true)
      } else {
        setError('รหัสผ่านไม่ถูกต้อง')
        setPassword('')
        setShake(true)
        setTimeout(() => setShake(false), 600)
        inputRef.current?.focus()
      }
    } catch {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง')
    } finally {
      setLoading(false)
    }
  }

  // Not ready yet — avoid flash
  if (!ready) return null

  // Already authenticated — show the app
  if (authed) return <>{children}</>

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'rgb(var(--prada-offwhite))' }}>

      {/* Ambient background decorations */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-1"
          style={{ background: 'linear-gradient(90deg, rgb(var(--prada-charcoal)), rgb(var(--prada-gold)), rgb(var(--prada-charcoal)))' }} />
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, rgb(var(--prada-gold)), transparent)' }} />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full opacity-8"
          style={{ background: 'radial-gradient(circle, rgb(var(--prada-charcoal)), transparent)' }} />
      </div>

      {/* Card */}
      <div
        className={`relative w-full max-w-sm mx-4 ${shake ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}
        style={{
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(var(--prada-warm), 0.4)',
          borderRadius: '4px',
          boxShadow: '0 20px 60px rgba(180,35,55,0.10), 0 4px 16px rgba(0,0,0,0.06)',
        }}
      >
        {/* Top accent bar */}
        <div className="h-0.5 w-full"
          style={{ background: 'linear-gradient(90deg, transparent, rgb(var(--prada-charcoal)), transparent)' }} />

        <div className="px-10 py-12">
          {/* Logo / Brand */}
          <div className="text-center mb-10">
            <p className="text-xs tracking-[0.35em] uppercase mb-3"
              style={{ color: 'rgb(var(--prada-taupe))', fontFamily: 'Inter, sans-serif', fontWeight: 300 }}>
              NAMTAN TIPNAREE
            </p>
            <h1 className="text-3xl tracking-[0.15em]"
              style={{
                fontFamily: 'Cormorant Garamond, serif',
                fontWeight: 700,
                color: 'rgb(var(--prada-black))',
                letterSpacing: '0.15em',
              }}>
              PRADA
            </h1>
            <div className="mt-3 mx-auto w-12 h-px"
              style={{ background: 'rgb(var(--prada-charcoal))' }} />
            <p className="mt-4 text-xs tracking-widest uppercase"
              style={{ color: 'rgb(var(--prada-taupe))', fontFamily: 'Inter, sans-serif', fontWeight: 300 }}>
              Private Access
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative">
              <label className="block text-xs tracking-widest uppercase mb-2"
                style={{ color: 'rgb(var(--prada-taupe))', fontFamily: 'Inter, sans-serif', fontWeight: 400 }}>
                Password
              </label>
              <input
                ref={inputRef}
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError('') }}
                placeholder="••••••••••"
                autoComplete="current-password"
                disabled={loading}
                className="w-full px-4 py-3 text-sm outline-none transition-all duration-200 disabled:opacity-50"
                style={{
                  background: 'rgb(var(--prada-cream))',
                  border: error
                    ? '1px solid rgb(var(--prada-charcoal))'
                    : '1px solid rgba(var(--prada-warm), 0.5)',
                  borderRadius: '2px',
                  color: 'rgb(var(--prada-black))',
                  fontFamily: 'Inter, sans-serif',
                  letterSpacing: '0.05em',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'rgb(var(--prada-charcoal))'
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(180,35,55,0.08)'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = error
                    ? 'rgb(var(--prada-charcoal))'
                    : 'rgba(var(--prada-warm), 0.5)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              />
            </div>

            {/* Error message */}
            {error && (
              <p className="text-xs text-center animate-[fadeIn_0.3s_ease]"
                style={{ color: 'rgb(var(--prada-charcoal))', fontFamily: 'Inter, sans-serif' }}>
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="w-full py-3 text-xs tracking-[0.2em] uppercase transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: password.trim() && !loading
                  ? 'rgb(var(--prada-charcoal))'
                  : 'rgba(var(--prada-charcoal), 0.5)',
                color: 'rgb(var(--prada-offwhite))',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 500,
                borderRadius: '2px',
                border: 'none',
                cursor: loading || !password.trim() ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={(e) => {
                if (!loading && password.trim()) {
                  e.currentTarget.style.background = 'rgb(var(--prada-black))'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = password.trim() && !loading
                  ? 'rgb(var(--prada-charcoal))'
                  : 'rgba(var(--prada-charcoal), 0.5)'
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" />
                  Verifying
                </span>
              ) : 'Enter'}
            </button>
          </form>

          {/* Footer note */}
          <p className="mt-8 text-center text-xs"
            style={{ color: 'rgb(var(--prada-stone))', fontFamily: 'Inter, sans-serif', fontWeight: 300 }}>
            This area is restricted to authorized users only.
          </p>
        </div>

        {/* Bottom accent bar */}
        <div className="h-0.5 w-full"
          style={{ background: 'linear-gradient(90deg, transparent, rgb(var(--prada-charcoal)), transparent)' }} />
      </div>

      {/* Shake keyframe injection */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-8px); }
          30% { transform: translateX(8px); }
          45% { transform: translateX(-6px); }
          60% { transform: translateX(6px); }
          75% { transform: translateX(-3px); }
          90% { transform: translateX(3px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
