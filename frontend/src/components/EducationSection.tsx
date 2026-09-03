import { issueFor, issuesFor } from '../ats/validator'
import { emptyEducation, type AtsReport, type EducationItem } from '../types'
import Field from './Field'
import ItemControls from './ItemControls'
import { moveItem, removeItem, replaceItem } from '../lib/listUtils'

interface Props {
  value: EducationItem[]
  report: AtsReport
  onChange: (value: EducationItem[]) => void
}

export default function EducationSection({ value, report, onChange }: Props) {
  const sectionIssues = issuesFor(report, 'education')

  return (
    <section className="card" id="sec-education">
      <div className="card-header">
        <h2>Formação</h2>
        <button type="button" className="btn btn-sm" onClick={() => onChange([...value, emptyEducation()])}>
          + Adicionar formação
        </button>
      </div>

      {value.length === 0 && (
        <p className="muted">
          Nenhuma formação ainda.{' '}
          {sectionIssues[0] && <span className="issue warning">{sectionIssues[0].message}</span>}
        </p>
      )}

      {value.map((item, i) => {
        const p = `education[${i}]`
        const set = (patch: Partial<EducationItem>) => onChange(replaceItem(value, i, { ...item, ...patch }))
        return (
          <div className="item" key={i}>
            <div className="item-header">
              <h3>{item.degree.trim() || `Formação #${i + 1}`}</h3>
              <ItemControls
                index={i}
                count={value.length}
                onMove={(dir) => onChange(moveItem(value, i, dir))}
                onRemove={() => onChange(removeItem(value, i))}
                label="formação"
              />
            </div>
            <div className="grid-2">
              <Field id={`${p}.degree`} label="Curso / grau *" issue={issueFor(report, `${p}.degree`)}>
                <input id={`${p}.degree`} value={item.degree} onChange={(e) => set({ degree: e.target.value })} placeholder="Bacharelado em Ciência da Computação" />
              </Field>
              <Field id={`${p}.institution`} label="Instituição *" issue={issueFor(report, `${p}.institution`)}>
                <input id={`${p}.institution`} value={item.institution} onChange={(e) => set({ institution: e.target.value })} />
              </Field>
            </div>
            <div className="grid-2">
              <Field id={`${p}.startDate`} label="Início *" issue={issueFor(report, `${p}.startDate`)}>
                <input id={`${p}.startDate`} type="month" value={item.startDate} onChange={(e) => set({ startDate: e.target.value })} />
              </Field>
              <Field
                id={`${p}.endDate`}
                label="Conclusão"
                hint="Deixe vazio se em andamento"
                issue={issueFor(report, `${p}.endDate`) ?? issueFor(report, `${p}.dates`)}
              >
                <input id={`${p}.endDate`} type="month" value={item.endDate ?? ''} onChange={(e) => set({ endDate: e.target.value })} />
              </Field>
            </div>
          </div>
        )
      })}
    </section>
  )
}
