// Espelho client-side da checklist determinística do backend
// (backend/AtsFormatador.Api/Services/AtsValidator.cs). Mesmos códigos e limites,
// para o aviso inline em tempo real (fluxo 3 do MVP). O backend continua sendo
// a autoridade final na hora de gerar o PDF.

import type { AtsCheckItem, AtsReport, ResumeData } from '../types'

export const LIMITS = {
  summaryMin: 200,
  summaryMax: 600,
  fullNameMax: 80,
  shortFieldMax: 100,
  bulletMax: 300,
  skillMax: 40,
  minSkills: 3,
  maxBulletsPerExperience: 8,
} as const

const ERROR_PENALTY = 15
const WARNING_PENALTY = 5

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const PHONE_RE = /^\+?[\d\s()-]{8,20}$/
const URL_RE = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[^\s]*)?$/i
const YEAR_MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/
// Emoji / símbolos fora do BMP e "Other Symbol" (So): extratores costumam ler como lixo.
const RISKY_GLYPH_RE = /[\p{So}\p{Co}]|[\uD800-\uDFFF]/u

const blank = (v: string | null | undefined) => !v || v.trim().length === 0

function ok(code: string, message: string): AtsCheckItem {
  return { code, severity: 'ok', message }
}
function warn(code: string, message: string): AtsCheckItem {
  return { code, severity: 'warning', message }
}
function error(code: string, message: string): AtsCheckItem {
  return { code, severity: 'error', message }
}

export function isYearMonth(value: string | null | undefined): boolean {
  return !!value && YEAR_MONTH_RE.test(value.trim())
}

export function validateResume(data: ResumeData): AtsReport {
  const items: AtsCheckItem[] = []

  validatePersonalInfo(data, items)
  validateSummary(data.summary, items)
  validateExperience(data, items)
  validateEducation(data, items)
  validateSkills(data.skills, items)
  validateLanguages(data, items)

  const errors = items.filter((i) => i.severity === 'error').length
  const warnings = items.filter((i) => i.severity === 'warning').length
  const score = Math.max(0, Math.min(100, 100 - errors * ERROR_PENALTY - warnings * WARNING_PENALTY))

  return { score, passed: errors === 0, items, errors, warnings }
}

function validatePersonalInfo(data: ResumeData, items: AtsCheckItem[]) {
  const p = data.personalInfo

  if (blank(p.fullName)) items.push(error('personal.fullName.required', 'Nome completo é obrigatório.'))
  else if (p.fullName.trim().length > LIMITS.fullNameMax)
    items.push(warn('personal.fullName.length', `Nome com mais de ${LIMITS.fullNameMax} caracteres pode quebrar de forma estranha.`))
  else items.push(ok('personal.fullName', 'Nome completo preenchido.'))

  if (blank(p.email)) items.push(error('personal.email.required', 'E-mail é obrigatório.'))
  else if (!EMAIL_RE.test(p.email.trim())) items.push(error('personal.email.format', 'E-mail em formato inválido.'))
  else items.push(ok('personal.email', 'E-mail preenchido.'))

  if (blank(p.phone)) items.push(error('personal.phone.required', 'Telefone é obrigatório.'))
  else if (!PHONE_RE.test(p.phone.trim()))
    items.push(warn('personal.phone.format', 'Telefone deve conter apenas dígitos, espaços, +, ( ) e -.'))
  else items.push(ok('personal.phone', 'Telefone preenchido.'))

  if (blank(p.location))
    items.push(warn('personal.location.missing', 'Informe cidade e país: muitos ATS filtram por localização.'))

  if (!blank(p.linkedin) && !URL_RE.test(p.linkedin!.trim()))
    items.push(warn('personal.linkedin.format', 'LinkedIn deve ser uma URL (ex.: https://linkedin.com/in/seu-nome).'))

  if (!blank(p.github) && !URL_RE.test(p.github!.trim()))
    items.push(warn('personal.github.format', 'GitHub deve ser uma URL (ex.: https://github.com/seu-usuario).'))
}

function validateSummary(summary: string, items: AtsCheckItem[]) {
  const len = (summary ?? '').trim().length
  if (len === 0)
    items.push(warn('summary.missing', 'Resumo profissional vazio. Recomendado: 3 a 5 linhas com cargo, área e principais competências.'))
  else if (len < LIMITS.summaryMin)
    items.push(warn('summary.short', `Resumo curto (${len} caracteres). Recomendado entre ${LIMITS.summaryMin} e ${LIMITS.summaryMax}.`))
  else if (len > LIMITS.summaryMax)
    items.push(warn('summary.long', `Resumo longo (${len} caracteres). Recomendado entre ${LIMITS.summaryMin} e ${LIMITS.summaryMax}.`))
  else items.push(ok('summary', 'Resumo profissional com tamanho adequado.'))
}

function validateDateRange(prefix: string, label: string, start: string, end: string | null, items: AtsCheckItem[]) {
  const startOk = isYearMonth(start)
  if (!startOk) items.push(error(`${prefix}.startDate.format`, `${label}: data de início deve estar no formato AAAA-MM.`))

  if (blank(end)) return

  if (!isYearMonth(end)) {
    items.push(error(`${prefix}.endDate.format`, `${label}: data de término deve estar no formato AAAA-MM ou vazia (atual).`))
    return
  }

  if (startOk && end!.trim() < start.trim())
    items.push(warn(`${prefix}.dates.order`, `${label}: data de término anterior à data de início.`))
}

function validateExperience(data: ResumeData, items: AtsCheckItem[]) {
  if (data.experience.length === 0) {
    items.push(warn('experience.empty', 'Nenhuma experiência profissional informada.'))
    return
  }

  data.experience.forEach((e, i) => {
    const label = blank(e.role) ? `Experiência #${i + 1}` : e.role.trim()
    const prefix = `experience[${i}]`

    if (blank(e.company)) items.push(error(`${prefix}.company.required`, `${label}: empresa é obrigatória.`))
    else if (e.company.trim().length > LIMITS.shortFieldMax)
      items.push(warn(`${prefix}.company.length`, `${label}: nome da empresa muito longo (máx. ${LIMITS.shortFieldMax}).`))

    if (blank(e.role)) items.push(error(`${prefix}.role.required`, `Experiência #${i + 1}: cargo é obrigatório.`))
    else if (e.role.trim().length > LIMITS.shortFieldMax)
      items.push(warn(`${prefix}.role.length`, `${label}: cargo muito longo (máx. ${LIMITS.shortFieldMax}).`))

    validateDateRange(prefix, label, e.startDate, e.endDate, items)

    const bullets = e.bullets.filter((b) => !blank(b))
    if (bullets.length === 0)
      items.push(warn(`${prefix}.bullets.empty`, `${label}: adicione pelo menos 1 bullet com resultado/responsabilidade.`))
    else if (bullets.length > LIMITS.maxBulletsPerExperience)
      items.push(warn(`${prefix}.bullets.many`, `${label}: muitos bullets (${bullets.length}). Recomendado até ${LIMITS.maxBulletsPerExperience}.`))
    else items.push(ok(`${prefix}.bullets`, `${label}: ${bullets.length} bullet(s).`))

    bullets.forEach((b, bi) => {
      if (b.trim().length > LIMITS.bulletMax)
        items.push(warn(`${prefix}.bullets[${bi}].length`, `${label}: bullet #${bi + 1} com mais de ${LIMITS.bulletMax} caracteres.`))
      if (RISKY_GLYPH_RE.test(b))
        items.push(warn(`${prefix}.bullets[${bi}].glyphs`, `${label}: bullet #${bi + 1} contém emoji/símbolos que parsers ATS podem não ler.`))
    })
  })
}

function validateEducation(data: ResumeData, items: AtsCheckItem[]) {
  if (data.education.length === 0) {
    items.push(warn('education.empty', 'Nenhuma formação informada.'))
    return
  }

  data.education.forEach((ed, i) => {
    const label = blank(ed.degree) ? `Formação #${i + 1}` : ed.degree.trim()
    const prefix = `education[${i}]`

    if (blank(ed.institution)) items.push(error(`${prefix}.institution.required`, `${label}: instituição é obrigatória.`))
    if (blank(ed.degree)) items.push(error(`${prefix}.degree.required`, `Formação #${i + 1}: curso/grau é obrigatório.`))

    validateDateRange(prefix, label, ed.startDate, ed.endDate, items)
  })
}

function validateSkills(skills: string[], items: AtsCheckItem[]) {
  const clean = skills.filter((s) => !blank(s)).map((s) => s.trim())
  if (clean.length === 0)
    items.push(warn('skills.empty', 'Nenhuma habilidade informada. ATS costumam casar palavras-chave desta seção com a vaga.'))
  else if (clean.length < LIMITS.minSkills)
    items.push(warn('skills.few', `Poucas habilidades (${clean.length}). Recomendado pelo menos ${LIMITS.minSkills}.`))
  else items.push(ok('skills', `${clean.length} habilidades informadas.`))

  clean.forEach((s, i) => {
    if (s.length > LIMITS.skillMax)
      items.push(warn(`skills[${i}].length`, `Habilidade "${s}" muito longa (máx. ${LIMITS.skillMax}). Prefira palavras-chave curtas.`))
  })
}

function validateLanguages(data: ResumeData, items: AtsCheckItem[]) {
  data.languages.forEach((l, i) => {
    if (blank(l.name)) items.push(error(`languages[${i}].name.required`, `Idioma #${i + 1}: nome é obrigatório.`))
    if (blank(l.level))
      items.push(warn(`languages[${i}].level.missing`, `Idioma #${i + 1}: informe o nível (ex.: Básico, Intermediário, Avançado, Fluente).`))
  })
}

/** Primeiro problema (erro ou aviso) cujo código começa com o prefixo informado. */
export function issueFor(report: AtsReport, prefix: string): AtsCheckItem | undefined {
  return report.items.find((i) => i.severity !== 'ok' && i.code.startsWith(prefix))
}

/** Problemas de uma seção inteira (por prefixo de código). */
export function issuesFor(report: AtsReport, prefix: string): AtsCheckItem[] {
  return report.items.filter((i) => i.severity !== 'ok' && i.code.startsWith(prefix))
}
