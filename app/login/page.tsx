'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useAuth } from '@/hooks/use-auth'
import { authService } from '@/lib/services/auth.service'
import { toast } from 'sonner'

export default function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const authDebug = process.env.NEXT_PUBLIC_DEBUG_AUTH === '1'

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Please enter email and password')
      return
    }

    if (authDebug) {
      console.debug('[auth-debug] login submit', {
        email,
        hasPassword: Boolean(password),
      })
    }

    setIsLoading(true)
    try {
      const data = await authService.login({ email, password })
      const apiUser = data.user
      if (authDebug) {
        console.debug('[auth-debug] login success', {
          userId: apiUser?.id,
          email: apiUser?.email,
          role: apiUser?.role,
        })
      }
      const roleMap: Record<string, any> = {
        admin: 'clinic_admin',
        doctor: 'clinician',
        trainer: 'staff',
        user: 'staff',
      }
      const mappedRole = roleMap[apiUser?.role] ?? 'clinic_admin'
      login(email, password, {
        id: apiUser?.id ?? '',
        name: apiUser?.email ?? email,
        email: apiUser?.email ?? email,
        role: mappedRole,
      })
      toast.success('Welcome back!')
      // Redirect is handled inside login() via window.location.href
    } catch (err: any) {
      if (authDebug) {
        console.debug('[auth-debug] login failed', {
          message: err?.message,
          status: err?.response?.status,
          serverMessage: err?.response?.data?.message,
        })
      }
      toast.error(err?.response?.data?.message || 'Login failed. Check your credentials.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{ width: '100%', maxWidth: '420px', padding: '0 16px' }}>

        {/* Logo area */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '72px', height: '72px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #10b981 0%, #0d9488 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 10px 25px rgba(16,185,129,0.35)',
            overflow: 'hidden',
          }}>
            <Image src="/fitflix_logo.png" alt="Fitflix Logo" width={56} height={56} style={{ objectFit: 'contain' }} />
          </div>
          <h1 style={{ color: '#f8fafc', fontSize: '26px', fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.5px' }}>
            Fitflix
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Admin Panel</p>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.9)',
          border: '1px solid rgba(51, 65, 85, 0.6)',
          borderRadius: '16px',
          padding: '32px',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
        }}>
          <h2 style={{ color: '#f1f5f9', fontSize: '18px', fontWeight: 600, margin: '0 0 4px' }}>
            Sign in to admin panel
          </h2>
          <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 24px' }}>
            Authorized staff and administrators only
          </p>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@fitflix.com"
                required
                autoComplete="email"
                style={{
                  width: '100%', padding: '10px 12px',
                  background: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid rgba(71, 85, 105, 0.6)',
                  borderRadius: '8px',
                  color: '#f1f5f9',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => e.target.style.borderColor = '#10b981'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(71, 85, 105, 0.6)'}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                style={{
                  width: '100%', padding: '10px 12px',
                  background: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid rgba(71, 85, 105, 0.6)',
                  borderRadius: '8px',
                  color: '#f1f5f9',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => e.target.style.borderColor = '#10b981'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(71, 85, 105, 0.6)'}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%', padding: '11px',
                background: isLoading
                  ? 'rgba(16,185,129,0.5)'
                  : 'linear-gradient(135deg, #10b981 0%, #0d9488 100%)',
                border: 'none', borderRadius: '8px',
                color: 'white', fontSize: '14px', fontWeight: 600,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'opacity 0.2s',
                letterSpacing: '0.2px',
              }}
              onMouseEnter={(e) => { if (!isLoading) (e.target as HTMLButtonElement).style.opacity = '0.9' }}
              onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.opacity = '1' }}
            >
              {isLoading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', color: '#334155', fontSize: '12px', marginTop: '24px' }}>
          © {new Date().getFullYear()} Fitflix. Internal use only.
        </p>
      </div>
    </div>
  )
}
