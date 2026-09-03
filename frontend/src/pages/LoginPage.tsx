import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ApiError } from '../api'
import { useAuth } from '../auth/AuthContext'

type Mode = 'login' | 'register'

export default function LoginPage() {
  const { isAuthenticated, login, register } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (isAuthenticated) return <Navigate to="/" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (mode === 'login') await login(email, password)
      else await register(email, password)
      navigate('/')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível conectar ao servidor.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card auth-box">
      <h1>Entrar</h1>
      <p className="muted">Faça login para salvar e editar várias versões do seu currículo.</p>

      <div className="tabs" role="tablist">
        <button type="button" role="tab" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>
          Login
        </button>
        <button
          type="button"
          role="tab"
          className={mode === 'register' ? 'active' : ''}
          onClick={() => setMode('register')}
        >
          Criar conta
        </button>
      </div>

      {error && <div className="alert error">{error}</div>}

      <form onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="password">Senha</label>
          <input
            id="password"
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {mode === 'register' && <span className="hint">Mínimo de 6 caracteres.</span>}
        </div>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta'}
        </button>
      </form>
    </div>
  )
}
