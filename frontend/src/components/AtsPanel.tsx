import type { AtsCheckItem, AtsReport } from '../types'

interface Props {
  report: AtsReport
  serverReport?: AtsReport | null
  generating: boolean
  saving: boolean
  dirty: boolean
  onSave: () => void
  onGenerate: () => void
}

const ORDER: Record<AtsCheckItem['severity'], number> = { error: 0, warning: 1, ok: 2 }
const ICON: Record<AtsCheckItem['severity'], string> = { error: '✖', warning: '⚠', ok: '✔' }

export default function AtsPanel({ report, serverReport, generating, saving, dirty, onSave, onGenerate }: Props) {
  const shown = serverReport ?? report
  const sorted = [...shown.items].sort((a, b) => ORDER[a.severity] - ORDER[b.severity])
  const cls = shown.score >= 80 ? 'score-good' : shown.score >= 50 ? 'score-mid' : 'score-bad'

  return (
    <aside className="card editor-side">
      <h2>Compatibilidade ATS</h2>
      <div className="score">
        <span className="score-value">{shown.score}</span>
        <span className="muted">/ 100</span>
      </div>
      <div className={`score-bar ${cls}`}>
        <div style={{ width: `${shown.score}%` }} />
      </div>
      <p className="muted" style={{ fontSize: '0.85rem' }}>
        {shown.errors} erro(s) · {shown.warnings} aviso(s). Erros bloqueiam a geração do PDF; avisos são recomendações.
      </p>

      {serverReport && (
        <div className="alert warning">O servidor recusou a geração do PDF. Corrija os erros abaixo e tente novamente.</div>
      )}

      <div className="row wrap" style={{ marginBottom: '0.75rem' }}>
        <button type="button" className="btn" onClick={onSave} disabled={saving || !dirty}>
          {saving ? 'Salvando…' : dirty ? 'Salvar' : 'Salvo'}
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onGenerate}
          disabled={generating || saving || !report.passed}
          title={report.passed ? 'Gera e baixa o PDF' : 'Corrija os erros antes de gerar o PDF'}
        >
          {generating ? 'Gerando…' : 'Gerar PDF'}
        </button>
      </div>

      <ul className="check-list">
        {sorted.map((item) => (
          <li key={item.code} className={item.severity}>
            <span className="icon" aria-hidden="true">
              {ICON[item.severity]}
            </span>
            <span>{item.message}</span>
          </li>
        ))}
      </ul>
    </aside>
  )
}
