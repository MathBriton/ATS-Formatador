import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, ApiError, downloadBlob, isAtsReport } from '../api'
import { validateResume } from '../ats/validator'
import AtsPanel from '../components/AtsPanel'
import EducationSection from '../components/EducationSection'
import ExperienceSection from '../components/ExperienceSection'
import LanguagesSection from '../components/LanguagesSection'
import PersonalInfoSection from '../components/PersonalInfoSection'
import SkillsSection from '../components/SkillsSection'
import SummarySection from '../components/SummarySection'
import { emptyResume, type AtsReport, type ResumeData } from '../types'

export default function EditorPage() {
  const { id = '' } = useParams()
  const [title, setTitle] = useState('')
  const [data, setData] = useState<ResumeData>(emptyResume)
  const [loaded, setLoaded] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [serverReport, setServerReport] = useState<AtsReport | null>(null)

  // Checklist ATS em tempo real (fluxo 3 do MVP) — regra determinística, client-side.
  const report = useMemo(() => validateResume(data), [data])

  useEffect(() => {
    let cancelled = false
    api
      .getResume(id)
      .then((r) => {
        if (cancelled) return
        setTitle(r.title)
        setData({ ...emptyResume(), ...r.data })
        setDirty(false)
        setLoaded(true)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Falha ao carregar o currículo.')
      })
    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  const patch = useCallback((changes: Partial<ResumeData>) => {
    setData((d) => ({ ...d, ...changes }))
    setDirty(true)
    setServerReport(null)
  }, [])

  const save = useCallback(async (): Promise<boolean> => {
    setSaving(true)
    setError(null)
    try {
      await api.updateResume(id, title.trim() || 'Sem título', data)
      setDirty(false)
      setNotice('Currículo salvo.')
      return true
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao salvar.')
      return false
    } finally {
      setSaving(false)
    }
  }, [id, title, data])

  const generate = useCallback(async () => {
    setGenerating(true)
    setError(null)
    setNotice(null)
    setServerReport(null)
    try {
      if (dirty && !(await save())) return
      const { blob, filename } = await api.generatePdf(data)
      downloadBlob(blob, filename)
      setNotice('PDF gerado. Dica: abra o arquivo, selecione tudo (Ctrl+A) e copie para conferir que o texto sai na ordem certa.')
    } catch (err) {
      if (err instanceof ApiError && err.status === 422 && isAtsReport(err.body)) {
        setServerReport(err.body)
      } else {
        setError(err instanceof ApiError ? err.message : 'Falha ao gerar o PDF.')
      }
    } finally {
      setGenerating(false)
    }
  }, [dirty, save, data])

  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 6000)
    return () => clearTimeout(t)
  }, [notice])

  if (!loaded && !error) return <p className="muted">Carregando…</p>

  return (
    <div>
      <div className="editor-toolbar">
        <Link to="/" className="btn btn-ghost">
          ← Meus currículos
        </Link>
        <input
          className="title-input"
          aria-label="Título da versão"
          value={title}
          placeholder="Título da versão (ex.: Backend .NET — Empresa X)"
          onChange={(e) => {
            setTitle(e.target.value)
            setDirty(true)
          }}
        />
        {dirty && <span className="muted">Alterações não salvas</span>}
      </div>

      {error && <div className="alert error">{error}</div>}
      {notice && <div className="alert ok">{notice}</div>}

      <div className="editor">
        <div>
          <PersonalInfoSection value={data.personalInfo} report={report} onChange={(personalInfo) => patch({ personalInfo })} />
          <SummarySection value={data.summary} report={report} onChange={(summary) => patch({ summary })} />
          <ExperienceSection value={data.experience} report={report} onChange={(experience) => patch({ experience })} />
          <EducationSection value={data.education} report={report} onChange={(education) => patch({ education })} />
          <SkillsSection value={data.skills} report={report} onChange={(skills) => patch({ skills })} />
          <LanguagesSection value={data.languages} report={report} onChange={(languages) => patch({ languages })} />
        </div>

        <AtsPanel
          report={report}
          serverReport={serverReport}
          generating={generating}
          saving={saving}
          dirty={dirty}
          onSave={() => void save()}
          onGenerate={() => void generate()}
        />
      </div>
    </div>
  )
}
