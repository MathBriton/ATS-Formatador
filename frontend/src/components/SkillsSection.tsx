import { useState, type KeyboardEvent } from 'react'
import { issueFor, issuesFor } from '../ats/validator'
import type { AtsReport } from '../types'
import { moveItem, removeItem } from '../lib/listUtils'

interface Props {
  value: string[]
  report: AtsReport
  onChange: (value: string[]) => void
}

export default function SkillsSection({ value, report, onChange }: Props) {
  const [draft, setDraft] = useState('')
  const listIssue = issueFor(report, 'skills.') ?? issuesFor(report, 'skills')[0]

  function add() {
    const parts = draft
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !value.includes(s))
    if (parts.length === 0) return
    onChange([...value, ...parts])
    setDraft('')
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      add()
    }
  }

  return (
    <section className="card" id="sec-skills">
      <h2>Habilidades</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        Palavras-chave curtas (tecnologias, ferramentas, competências). No PDF elas saem em uma lista separada por vírgula, sem colunas.
      </p>

      <div className="field">
        <label htmlFor="skill-draft">Adicionar habilidade</label>
        <div className="row">
          <input
            id="skill-draft"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ex.: C#, React, SQL Server (Enter ou vírgula para adicionar)"
          />
          <button type="button" className="btn" onClick={add}>
            Adicionar
          </button>
        </div>
        {listIssue && <span className={`issue ${listIssue.severity}`}>{listIssue.message}</span>}
      </div>

      {value.length > 0 && (
        <ul className="chip-list" aria-label="Habilidades">
          {value.map((s, i) => {
            const issue = issueFor(report, `skills[${i}]`)
            return (
              <li key={`${s}-${i}`} className="chip" title={issue?.message} style={issue ? { borderColor: 'var(--warning)' } : undefined}>
                {s}
                <button type="button" aria-label={`Mover ${s} para a esquerda`} disabled={i === 0} onClick={() => onChange(moveItem(value, i, -1))}>
                  ‹
                </button>
                <button
                  type="button"
                  aria-label={`Mover ${s} para a direita`}
                  disabled={i === value.length - 1}
                  onClick={() => onChange(moveItem(value, i, 1))}
                >
                  ›
                </button>
                <button type="button" aria-label={`Remover ${s}`} onClick={() => onChange(removeItem(value, i))}>
                  ✕
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
