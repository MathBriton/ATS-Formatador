import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, ApiError } from '../api'
import { emptyResume, type ResumeSummary } from '../types'

function formatDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

export default function ResumesPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<ResumeSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      setItems(await api.listResumes())
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao carregar currículos.')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Operação falhou.')
    } finally {
      setBusy(false)
    }
  }

  const createNew = () =>
    run(async () => {
      const created = await api.createResume('Novo currículo', emptyResume())
      navigate(`/resumes/${created.id}`)
    })

  const duplicate = (r: ResumeSummary) =>
    run(async () => {
      const copy = await api.duplicateResume(r.id)
      navigate(`/resumes/${copy.id}`)
    })

  const remove = (r: ResumeSummary) => {
    if (!window.confirm(`Excluir "${r.title}"? Esta ação não pode ser desfeita.`)) return
    void run(async () => {
      await api.deleteResume(r.id)
      await load()
    })
  }

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h1>Meus currículos</h1>
          <p className="muted" style={{ margin: 0 }}>
            Mantenha uma versão por vaga. Duplique e adapte sem perder a original.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={createNew} disabled={busy}>
          + Novo currículo
        </button>
      </div>

      {error && <div className="alert error">{error}</div>}

      {items === null ? (
        <p className="muted">Carregando…</p>
      ) : items.length === 0 ? (
        <div className="empty">Você ainda não tem currículos. Clique em “Novo currículo” para começar.</div>
      ) : (
        <ul className="resume-list">
          {items.map((r) => (
            <li key={r.id}>
              <div>
                <Link to={`/resumes/${r.id}`} className="name">
                  {r.title}
                </Link>
                <div className="muted" style={{ fontSize: '0.85rem' }}>
                  Atualizado em {formatDate(r.updatedAtUtc)}
                </div>
              </div>
              <div className="row">
                <Link to={`/resumes/${r.id}`} className="btn btn-sm">
                  Editar
                </Link>
                <button type="button" className="btn btn-sm" onClick={() => duplicate(r)} disabled={busy}>
                  Duplicar
                </button>
                <button type="button" className="btn btn-sm btn-danger" onClick={() => remove(r)} disabled={busy}>
                  Excluir
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
