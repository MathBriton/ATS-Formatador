import { issueFor, issuesFor } from '../ats/validator'
import { emptyExperience, type AtsReport, type ExperienceItem } from '../types'
import Field from './Field'
import ItemControls from './ItemControls'
import { moveItem, removeItem, replaceItem } from '../lib/listUtils'

interface Props {
  value: ExperienceItem[]
  report: AtsReport
  onChange: (value: ExperienceItem[]) => void
}

export default function ExperienceSection({ value, report, onChange }: Props) {
  const sectionIssues = issuesFor(report, 'experience')

  return (
    <section className="card" id="sec-experience">
      <div className="card-header">
        <h2>Experiência profissional</h2>
        <button type="button" className="btn btn-sm" onClick={() => onChange([...value, emptyExperience()])}>
          + Adicionar experiência
        </button>
      </div>

      {value.length === 0 && (
        <p className="muted">
          Nenhuma experiência ainda.{' '}
          {sectionIssues[0] && <span className="issue warning">{sectionIssues[0].message}</span>}
        </p>
      )}

      {value.map((item, i) => (
        <ExperienceEditor
          key={i}
          index={i}
          count={value.length}
          item={item}
          report={report}
          onChange={(next) => onChange(replaceItem(value, i, next))}
          onMove={(dir) => onChange(moveItem(value, i, dir))}
          onRemove={() => onChange(removeItem(value, i))}
        />
      ))}
    </section>
  )
}

interface EditorProps {
  index: number
  count: number
  item: ExperienceItem
  report: AtsReport
  onChange: (item: ExperienceItem) => void
  onMove: (direction: -1 | 1) => void
  onRemove: () => void
}

function ExperienceEditor({ index, count, item, report, onChange, onMove, onRemove }: EditorProps) {
  const p = `experience[${index}]`
  const set = (patch: Partial<ExperienceItem>) => onChange({ ...item, ...patch })
  const isCurrent = item.endDate === null

  return (
    <div className="item">
      <div className="item-header">
        <h3>{item.role.trim() || `Experiência #${index + 1}`}</h3>
        <ItemControls index={index} count={count} onMove={onMove} onRemove={onRemove} label="experiência" />
      </div>

      <div className="grid-2">
        <Field id={`${p}.role`} label="Cargo *" issue={issueFor(report, `${p}.role`)}>
          <input id={`${p}.role`} value={item.role} onChange={(e) => set({ role: e.target.value })} />
        </Field>
        <Field id={`${p}.company`} label="Empresa *" issue={issueFor(report, `${p}.company`)}>
          <input id={`${p}.company`} value={item.company} onChange={(e) => set({ company: e.target.value })} />
        </Field>
      </div>

      <div className="grid-2">
        <Field id={`${p}.startDate`} label="Início *" issue={issueFor(report, `${p}.startDate`)}>
          <input id={`${p}.startDate`} type="month" value={item.startDate} onChange={(e) => set({ startDate: e.target.value })} />
        </Field>
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <Field id={`${p}.endDate`} label="Término" issue={issueFor(report, `${p}.endDate`) ?? issueFor(report, `${p}.dates`)}>
              <input
                id={`${p}.endDate`}
                type="month"
                value={item.endDate ?? ''}
                disabled={isCurrent}
                onChange={(e) => set({ endDate: e.target.value })}
              />
            </Field>
          </div>
          <label className="inline-check">
            <input
              type="checkbox"
              checked={isCurrent}
              onChange={(e) => set({ endDate: e.target.checked ? null : '' })}
            />
            Atual
          </label>
        </div>
      </div>

      <Field id={`${p}.location`} label="Localização" hint="Cidade, país ou Remoto">
        <input id={`${p}.location`} value={item.location} onChange={(e) => set({ location: e.target.value })} />
      </Field>

      <BulletsEditor
        prefix={p}
        bullets={item.bullets}
        report={report}
        onChange={(bullets) => set({ bullets })}
      />
    </div>
  )
}

interface BulletsProps {
  prefix: string
  bullets: string[]
  report: AtsReport
  onChange: (bullets: string[]) => void
}

function BulletsEditor({ prefix, bullets, report, onChange }: BulletsProps) {
  const listIssue = issueFor(report, `${prefix}.bullets.`)

  return (
    <div className="field">
      <label>Responsabilidades e resultados (bullets)</label>
      {bullets.map((b, i) => {
        const issue = issueFor(report, `${prefix}.bullets[${i}]`)
        return (
          <div key={i}>
            <div className="bullet-row">
              <textarea
                value={b}
                aria-label={`Bullet ${i + 1}`}
                placeholder="Ex.: Reduzi o tempo de build em 40% ao migrar o pipeline de CI para GitHub Actions."
                onChange={(e) => onChange(replaceItem(bullets, i, e.target.value))}
              />
              <ItemControls
                index={i}
                count={bullets.length}
                onMove={(dir) => onChange(moveItem(bullets, i, dir))}
                onRemove={() => onChange(removeItem(bullets, i))}
                label="bullet"
              />
            </div>
            {issue && <span className={`issue ${issue.severity}`}>{issue.message}</span>}
          </div>
        )
      })}
      <div className="row">
        <button type="button" className="btn btn-sm" onClick={() => onChange([...bullets, ''])}>
          + Bullet
        </button>
        {listIssue && <span className={`issue ${listIssue.severity}`}>{listIssue.message}</span>}
      </div>
    </div>
  )
}
