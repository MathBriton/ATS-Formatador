import { issueFor } from '../ats/validator'
import type { AtsReport, PersonalInfo } from '../types'
import Field from './Field'

interface Props {
  value: PersonalInfo
  report: AtsReport
  onChange: (value: PersonalInfo) => void
}

export default function PersonalInfoSection({ value, report, onChange }: Props) {
  const set = (patch: Partial<PersonalInfo>) => onChange({ ...value, ...patch })

  return (
    <section className="card" id="sec-personal">
      <h2>Dados pessoais</h2>
      <Field id="fullName" label="Nome completo *" issue={issueFor(report, 'personal.fullName')}>
        <input id="fullName" value={value.fullName} onChange={(e) => set({ fullName: e.target.value })} autoComplete="name" />
      </Field>
      <div className="grid-2">
        <Field id="email" label="E-mail *" issue={issueFor(report, 'personal.email')}>
          <input id="email" type="email" value={value.email} onChange={(e) => set({ email: e.target.value })} autoComplete="email" />
        </Field>
        <Field id="phone" label="Telefone *" hint="Ex.: +55 11 91234-5678" issue={issueFor(report, 'personal.phone')}>
          <input id="phone" type="tel" value={value.phone} onChange={(e) => set({ phone: e.target.value })} autoComplete="tel" />
        </Field>
      </div>
      <Field id="location" label="Localização" hint="Cidade, país" issue={issueFor(report, 'personal.location')}>
        <input id="location" value={value.location} onChange={(e) => set({ location: e.target.value })} placeholder="São Paulo, Brasil" />
      </Field>
      <div className="grid-2">
        <Field id="linkedin" label="LinkedIn" hint="URL (opcional)" issue={issueFor(report, 'personal.linkedin')}>
          <input id="linkedin" value={value.linkedin ?? ''} onChange={(e) => set({ linkedin: e.target.value })} placeholder="https://linkedin.com/in/seu-nome" />
        </Field>
        <Field id="github" label="GitHub" hint="URL (opcional)" issue={issueFor(report, 'personal.github')}>
          <input id="github" value={value.github ?? ''} onChange={(e) => set({ github: e.target.value })} placeholder="https://github.com/seu-usuario" />
        </Field>
      </div>
    </section>
  )
}
