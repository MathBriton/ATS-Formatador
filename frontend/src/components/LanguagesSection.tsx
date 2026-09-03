import { issueFor } from '../ats/validator'
import { emptyLanguage, type AtsReport, type LanguageItem } from '../types'
import Field from './Field'
import ItemControls from './ItemControls'
import { moveItem, removeItem, replaceItem } from '../lib/listUtils'

interface Props {
  value: LanguageItem[]
  report: AtsReport
  onChange: (value: LanguageItem[]) => void
}

const LEVELS = ['Básico', 'Intermediário', 'Avançado', 'Fluente', 'Nativo']

export default function LanguagesSection({ value, report, onChange }: Props) {
  return (
    <section className="card" id="sec-languages">
      <div className="card-header">
        <h2>Idiomas</h2>
        <button type="button" className="btn btn-sm" onClick={() => onChange([...value, emptyLanguage()])}>
          + Adicionar idioma
        </button>
      </div>

      {value.length === 0 && <p className="muted">Nenhum idioma informado (opcional).</p>}

      {value.map((item, i) => {
        const p = `languages[${i}]`
        const set = (patch: Partial<LanguageItem>) => onChange(replaceItem(value, i, { ...item, ...patch }))
        return (
          <div className="item" key={i}>
            <div className="item-header">
              <h3>{item.name.trim() || `Idioma #${i + 1}`}</h3>
              <ItemControls
                index={i}
                count={value.length}
                onMove={(dir) => onChange(moveItem(value, i, dir))}
                onRemove={() => onChange(removeItem(value, i))}
                label="idioma"
              />
            </div>
            <div className="grid-2">
              <Field id={`${p}.name`} label="Idioma *" issue={issueFor(report, `${p}.name`)}>
                <input id={`${p}.name`} value={item.name} onChange={(e) => set({ name: e.target.value })} placeholder="Inglês" />
              </Field>
              <Field id={`${p}.level`} label="Nível" issue={issueFor(report, `${p}.level`)}>
                <input id={`${p}.level`} list="language-levels" value={item.level} onChange={(e) => set({ level: e.target.value })} placeholder="Avançado" />
              </Field>
            </div>
          </div>
        )
      })}

      <datalist id="language-levels">
        {LEVELS.map((l) => (
          <option key={l} value={l} />
        ))}
      </datalist>
    </section>
  )
}
