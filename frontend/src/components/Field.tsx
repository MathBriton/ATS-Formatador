import type { ReactNode } from 'react'
import type { AtsCheckItem } from '../types'

interface FieldProps {
  id: string
  label: string
  hint?: string
  issue?: AtsCheckItem
  children: ReactNode
}

/** Rótulo + controle + aviso inline da checklist ATS (quando houver). */
export default function Field({ id, label, hint, issue, children }: FieldProps) {
  const cls = ['field', issue ? `has-${issue.severity}` : ''].filter(Boolean).join(' ')
  return (
    <div className={cls}>
      <label htmlFor={id}>{label}</label>
      {children}
      {issue ? <span className={`issue ${issue.severity}`}>{issue.message}</span> : hint ? <span className="hint">{hint}</span> : null}
    </div>
  )
}
