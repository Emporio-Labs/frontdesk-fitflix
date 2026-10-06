'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { authService } from '@/lib/services/auth.service'
import { toast } from 'sonner'

// FX-30.2 — first-sign-in / set-password page. Reached from the one-time link the
// backend emails to a newly invited staff account. Public route (middleware only
// guards /admin and /dashboard). The person sets their own password here; no
// plaintext password is ever handled by an admin.

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  background: 'rgba(30, 41, 59, 0.8)',
  border: '1px solid rgba(71, 85, 105, 0.6)',
  borderRadius: '8px',
  color: '#f1f5f9',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: '#94a3b8',
  fontSize: '13px',
  fontWeight: 500,
  marginBottom: '6px',
}

// Same rules as the member/admin form (app/admin/users/page.tsx): ≥8 chars,
// at least one letter and one number.
function validatePassword(pw: string): string | null {
  if (pw.length < 8) return 'Password must be at least 8 characters'
  if (!/[A-Za-z]/.test(pw)) return 'Password must include at least one letter'
  if (!/\d/.test(pw)) return 'Password must include at least one number'
  return null
}

function SetPasswordInner() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''

  const [phase, setPhase] = useState<'verifying' | 'invalid' | 'ready' | 'done'>('verifying')
  const [email, setEmail] = useState('')
  const [invalidMessage, setInvalidMessage] = useState('This link is invalid or has expired.')

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (!token) {
      setInvalidMessage('This link is missing its token. Please use the link from your invite email.')
      setPhase('invalid')
      return
    }
    authService
      .verifyInvite(token)
      .then((res) => {
        if (cancelled) return
        if (res.valid) {
          setEmail(res.email || '')
          setPhase('ready')
        } else {
          setInvalidMessage(res.message || 'This link is invalid or has expired.')
          setPhase('invalid')
        }
      })
      .catch((err: any) => {
        if (cancelled) return
        setInvalidMessage(
          err?.response?.data?.message || 'This link is invalid or has expired.'
        )
        setPhase('invalid')
      })
    return () => {
      cancelled = true
    }
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const pwError = validatePassword(password)
    if (pwError) {
      setError(pwError)
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setIsSubmitting(true)
    try {
      await authService.setPassword({ token, password })
      setPhase('done')
      toast.success('Password set. You can now sign in.')
      setTimeout(() => {
        window.location.href = '/login'
      }, 1500)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not set your password. The link may have expired.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div style={{ width: '100%', maxWidth: '420px', padding: '0 16px' }}>
        {/* Logo area */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #10b981 0%, #0d9488 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 10px 25px rgba(16,185,129,0.35)',
              overflow: 'hidden',
            }}
          >
            <Image src="/fitflix_logo.png" alt="Fitflix Logo" width={56} height={56} style={{ objectFit: 'contain' }} />
          </div>
          <h1 style={{ color: '#f8fafc', fontSize: '26px', fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.5px' }}>
            Fitflix
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Admin Panel</p>
        </div>

        {/* Card */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.9)',
            border: '1px solid rgba(51, 65, 85, 0.6)',
            borderRadius: '16px',
            padding: '32px',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
          }}
        >
          {phase === 'verifying' && (
            <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0, textAlign: 'center' }}>
              Checking your invite link…
            </p>
          )}

          {phase === 'invalid' && (
            <div>
              <h2 style={{ color: '#f1f5f9', fontSize: '18px', fontWeight: 600, margin: '0 0 8px' }}>
                Link not valid
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 16px', lineHeight: 1.5 }}>
                {invalidMessage} Please ask your administrator to resend your first-sign-in link.
              </p>
              <a
                href="/login"
                style={{ color: '#10b981', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}
              >
                Go to sign in →
              </a>
            </div>
          )}

          {phase === 'done' && (
            <div>
              <h2 style={{ color: '#f1f5f9', fontSize: '18px', fontWeight: 600, margin: '0 0 8px' }}>
                Password set
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0, lineHeight: 1.5 }}>
                You can now sign in with your email and new password. Redirecting…
              </p>
            </div>
          )}

          {phase === 'ready' && (
            <>
              <h2 style={{ color: '#f1f5f9', fontSize: '18px', fontWeight: 600, margin: '0 0 4px' }}>
                Set your password
              </h2>
              <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 24px' }}>
                Choose a password for your personal front-desk account.
              </p>

              <form onSubmit={handleSubmit}>
                {email && (
                  <div style={{ marginBottom: '16px' }}>
                    <label style={labelStyle}>Email</label>
                    <input type="email" value={email} readOnly style={{ ...inputStyle, opacity: 0.7 }} autoComplete="username" />
                  </div>
                )}

                <div style={{ marginBottom: '16px' }}>
                  <label style={labelStyle}>New password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 chars, 1 letter, 1 number"
                    required
                    autoComplete="new-password"
                    style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = '#10b981')}
                    onBlur={(e) => (e.target.style.borderColor = 'rgba(71, 85, 105, 0.6)')}
                  />
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={labelStyle}>Confirm password</label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="new-password"
                    style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = '#10b981')}
                    onBlur={(e) => (e.target.style.borderColor = 'rgba(71, 85, 105, 0.6)')}
                  />
                </div>

                {error && (
                  <p style={{ color: '#f87171', fontSize: '12px', margin: '0 0 16px' }}>{error}</p>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    padding: '11px',
                    background: isSubmitting
                      ? 'rgba(16,185,129,0.5)'
                      : 'linear-gradient(135deg, #10b981 0%, #0d9488 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    transition: 'opacity 0.2s',
                    letterSpacing: '0.2px',
                  }}
                >
                  {isSubmitting ? 'Setting password…' : 'Set password'}
                </button>
              </form>
            </>
          )}
        </div>

        <p style={{ textAlign: 'center', color: '#334155', fontSize: '12px', marginTop: '24px' }}>
          © {new Date().getFullYear()} Fitflix. Internal use only.
        </p>
      </div>
    </div>
  )
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <SetPasswordInner />
    </Suspense>
  )
}
