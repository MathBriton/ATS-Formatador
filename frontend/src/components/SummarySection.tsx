import { issueFor, LIMITS } from '../ats/validator'
import type { AtsReport } from '../types'
import Field from './Field'

interface Props {
  value: string
  report: AtsReport
  onChange: (value: string) => void
}

export default function SummarySection({ value, report, onChange }: Props) {
  const len = value.trim().length
  return (
    <section className="card" id="sec-summary">
      <h2>Resumo profissional</h2>
      <Field
        id="summary"
        label="Resumo"
        hint={`${len} caracteres (recomendado ${LIMITS.summaryMin}–${LIMITS.summaryMax}). Texto puro, 3 a 5 linhas.`}
        issue={issueFor(report, 'summary')}
      >
        <textarea
          id="summary"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ex.: Desenvolvedor(a) full stack com 6 anos de experiência em .NET e React, atuando em produtos SaaS de alta escala…"
        />
      </Field>
    </section>
  )
}
