import React, { useState, useRef, useEffect, useCallback } from 'react'
import { signInWithEmail, verifyOtp, signOut } from '../services/supabase'

interface AuthFormProps {
  user: any | null
  onAuthSuccess: () => void
}

export const AuthForm: React.FC<AuthFormProps> = ({ user, onAuthSuccess }) => {
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState<string[]>(Array(8).fill(''))
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [resendCountdown, setResendCountdown] = useState(0)
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>(Array(8).fill(null))

  // Countdown timer effect
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCountdown])

  const isValidEmail = (emailStr: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(emailStr)
  }

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')

    if (!isValidEmail(email)) {
      setError('Enter a valid email id to proceed')
      // Clear error after 3 seconds
      setTimeout(() => setError(''), 3000)
      return
    }

    setLoading(true)

    try {
      await signInWithEmail(email)
      setMessage('OTP sent to your email!')
      setStep('otp')
      setOtp(Array(8).fill(''))
      setResendCountdown(60) // Start 60 second countdown
      // Focus first OTP input
      setTimeout(() => otpInputRefs.current[0]?.focus(), 100)
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP')
      // Clear error after 3 seconds
      setTimeout(() => setError(''), 3000)
    } finally {
      setLoading(false)
    }
  }

  const handleOtpChange = (index: number, value: string) => {
    // Only allow digits
    if (!/^\d*$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value.slice(0, 1) // Only one digit per input

    setOtp(newOtp)

    // Move to next input if digit is entered
    if (value && index < 7) {
      otpInputRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus()
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    const otpString = otp.join('')

    if (otpString.length !== 8) {
      setError('Please enter all 8 digits')
      return
    }

    setLoading(true)
    setError('')
    setMessage('')

    try {
      await verifyOtp(email, otpString)
      setMessage('Successfully signed in!')
      setEmail('')
      setOtp(Array(8).fill(''))
      setStep('email')
      onAuthSuccess()
    } catch (err: any) {
      setError(err.message || 'Failed to verify OTP')
      setOtp(Array(8).fill(''))
      otpInputRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    setLoading(true)
    try {
      await signOut()
      setMessage('Signed out successfully')
      onAuthSuccess()
    } catch (err: any) {
      setError(err.message || 'Failed to sign out')
    } finally {
      setLoading(false)
    }
  }

  const containerStyle: React.CSSProperties = {
    padding: '24px',
    background: '#a5a58d',
    borderRadius: '0',
    marginBottom: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    marginTop: '-80px',
  }

  const logoBrand = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '20px',
    justifyContent: 'flex-start',
    marginLeft: '0px',
    width: '100%',
    paddingLeft: '100px',
  }

  const cardStyle: React.CSSProperties = {
    padding: '24px',
    background: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '12px',
    marginBottom: '16px',
    width: '100%',
    maxWidth: '400px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  }

  const titleStyle: React.CSSProperties = {
    margin: '0 0 20px 0',
    fontSize: '20px',
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  }

  const subtitleStyle: React.CSSProperties = {
    margin: '0 0 16px 0',
    fontSize: '13px',
    color: '#e0e0e0',
    textAlign: 'center',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '14px',
    marginBottom: '14px',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  }

  const buttonStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    background: '#b8b6a3',
    color: '#fff',
    border: '2px solid transparent',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.7 : 1,
    transition: 'all 0.2s',
  }

  const signOutButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: '#dc3545',
  }

  const textStyle: React.CSSProperties = {
    margin: '12px 0 0 0',
    fontSize: '12px',
    textAlign: 'center',
  }

  const otpContainerStyle: React.CSSProperties = {
    display: 'flex',
    gap: '8px',
    justifyContent: 'center',
    marginBottom: '20px',
  }

  const otpInputStyle: React.CSSProperties = {
    width: '28px',
    height: '28px',
    padding: '0',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '14px',
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    transition: 'all 0.2s',
  }

  const backButtonStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    background: 'transparent',
    color: '#fff',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginTop: '10px',
  }

  // Show signed-in state (main app content will be rendered in sidebar)
  if (user) {
    return null
  }

  // Email input screen
  if (step === 'email') {
    return (
      <>
        <style>{`
          .send-otp-button:hover:not(:disabled) {
            border-color: rgba(255, 255, 255, 0.5) !important;
            box-shadow: 0 0 12px rgba(255, 255, 255, 0.3) !important;
          }
          .email-input {
            outline: none !important;
            border: none !important;
            box-shadow: none !important;
            background: rgba(255, 255, 255, 0.1) !important;
          }
          .email-input:focus {
            outline: none !important;
            border: none !important;
            box-shadow: none !important;
            background: rgba(255, 255, 255, 0.1) !important;
          }
        `}</style>
        <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={logoBrand}>
            <img src="/icons/spider.png" alt="Chrome Crawler" style={{ width: '48px', height: '48px' }} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0' }}>
              <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: '#fff' }}>Chrome</h1>
              <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: '#fff' }}>Crawler</h1>
            </div>
          </div>
          <p style={{ ...subtitleStyle, fontSize: '11px' }}>Login to existing account or sign up</p>

          <form onSubmit={handleSendOtp} style={{ width: '100%' }}>
            <input
              type="email"
              placeholder="your.email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              required
              disabled={loading}
              autoFocus
              className="email-input"
            />
            <button
              style={buttonStyle}
              type="submit"
              disabled={loading || !email}
              className="send-otp-button"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </form>

          {error && <p style={{ ...textStyle, color: '#ff6b6b' }}>❌ {error}</p>}
        </div>
        </div>
      </>
    )
  }

  // OTP input screen
  return (
    <>
      <style>{`
        .complete-otp-button:hover:not(:disabled) {
          border-color: rgba(255, 255, 255, 0.8) !important;
          box-shadow: 0 0 16px rgba(255, 255, 255, 0.5) !important;
        }
        .back-otp-button:hover:not(:disabled) {
          border-color: rgba(255, 255, 255, 0.5) !important;
          box-shadow: 0 0 12px rgba(255, 255, 255, 0.3) !important;
        }
      `}</style>
      <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={logoBrand}>
          <img src="/icons/spider.png" alt="Chrome Crawler" style={{ width: '48px', height: '48px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0' }}>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: '#fff' }}>Chrome</h1>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: '#fff' }}>Crawler</h1>
          </div>
        </div>
        <p style={subtitleStyle}>Enter the 8-digit code sent to {email}</p>

        <form onSubmit={handleVerifyOtp}>
          <div style={otpContainerStyle}>
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (otpInputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(index, e)}
                style={{
                  ...otpInputStyle,
                  borderColor: digit ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.3)',
                }}
                disabled={loading}
              />
            ))}
          </div>

          <p style={{ fontSize: '10px', color: '#e0e0e0', textAlign: 'center', margin: '12px 0', lineHeight: '1.4' }}>
            This OTP is valid for an hour. {resendCountdown > 0 ? <>Wait <span style={{ background: '#1b5e20', color: '#4ade80', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', marginLeft: '4px', marginRight: '4px' }}>{resendCountdown}s</span> to send again.</> : `Didn't receive an OTP? Click `}<a href="#" onClick={(e) => { e.preventDefault(); if (resendCountdown === 0) handleSendOtp(e as any) }} style={{ color: '#b8b6a3', textDecoration: 'underline', cursor: resendCountdown > 0 ? 'not-allowed' : 'pointer', display: resendCountdown > 0 ? 'none' : 'inline' }}>here</a>{resendCountdown > 0 ? '' : ' to send again.'}
          </p>

          <button
            style={buttonStyle}
            type="submit"
            disabled={loading || otp.some((d) => !d)}
            className="complete-otp-button"
          >
            {loading ? 'Verifying...' : 'Complete'}
          </button>

          <button
            type="button"
            onClick={() => {
              setStep('email')
              setOtp(Array(8).fill(''))
              setError('')
            }}
            style={backButtonStyle}
            disabled={loading}
            className="back-otp-button"
          >
            Back
          </button>
        </form>

        {error && <p style={{ ...textStyle, color: '#ff6b6b' }}>❌ {error}</p>}
      </div>
      </div>
    </>
  )
}
