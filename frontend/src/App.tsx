import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import EditorPage from './pages/EditorPage'
import LoginPage from './pages/LoginPage'
import ResumesPage from './pages/ResumesPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function TopBar() {
  const { email, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <header className="topbar">
      <Link to="/" className="brand">
        ATS Formatador
      </Link>
      {isAuthenticated && (
        <div className="topbar-right">
          <span className="muted">{email}</span>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              logout()
              navigate('/login')
            }}
          >
            Sair
          </button>
        </div>
      )}
    </header>
  )
}

export default function App() {
  return (
    <div className="app">
      <TopBar />
      <main className="page">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <ResumesPage />
              </RequireAuth>
            }
          />
          <Route
            path="/resumes/:id"
            element={
              <RequireAuth>
                <EditorPage />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}
