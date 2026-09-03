// Contrato JSON entre o formulário e o gerador de PDF (seção 5 do MVP).
// Nenhum campo é HTML rico: tudo é texto puro estruturado.

export interface PersonalInfo {
  fullName: string
  email: string
  phone: string
  location: string
  linkedin?: string | null
  github?: string | null
}

export interface ExperienceItem {
  company: string
  role: string
  /** YYYY-MM */
  startDate: string
  /** YYYY-MM ou null (atual) */
  endDate: string | null
  location: string
  bullets: string[]
}

export interface EducationItem {
  institution: string
  degree: string
  startDate: string
  endDate: string | null
}

export interface LanguageItem {
  name: string
  level: string
}

export interface ResumeData {
  personalInfo: PersonalInfo
  summary: string
  experience: ExperienceItem[]
  education: EducationItem[]
  skills: string[]
  languages: LanguageItem[]
}

export interface ResumeSummary {
  id: string
  title: string
  createdAtUtc: string
  updatedAtUtc: string
}

export interface ResumeDetail extends ResumeSummary {
  data: ResumeData
}

export interface AuthResponse {
  token: string
  email: string
  expiresAtUtc: string
}

export type AtsSeverity = 'ok' | 'warning' | 'error'

export interface AtsCheckItem {
  code: string
  severity: AtsSeverity
  message: string
}

export interface AtsReport {
  score: number
  passed: boolean
  items: AtsCheckItem[]
  errors: number
  warnings: number
}

export function emptyResume(): ResumeData {
  return {
    personalInfo: {
      fullName: '',
      email: '',
      phone: '',
      location: '',
      linkedin: '',
      github: '',
    },
    summary: '',
    experience: [],
    education: [],
    skills: [],
    languages: [],
  }
}

export function emptyExperience(): ExperienceItem {
  return { company: '', role: '', startDate: '', endDate: null, location: '', bullets: [''] }
}

export function emptyEducation(): EducationItem {
  return { institution: '', degree: '', startDate: '', endDate: '' }
}

export function emptyLanguage(): LanguageItem {
  return { name: '', level: '' }
}
