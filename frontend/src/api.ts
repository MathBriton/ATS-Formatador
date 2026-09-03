import type {
  AtsReport,
  AuthResponse,
  ResumeData,
  ResumeDetail,
  ResumeSummary,
} from './types'

const TOKEN_KEY = 'ats.token'
const EMAIL_KEY = 'ats.email'

export class ApiError extends Error {
  status: number
  body: unknown

  constructor(status: number, message: string, body: unknown) {
    super(message)
    this.status = status
    this.body = body
  }
}

export const session = {
  get token(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  },
  get email(): string | null {
    try {
      return localStorage.getItem(EMAIL_KEY)
    } catch {
      return null
    }
  },
  save(auth: AuthResponse) {
    try {
      localStorage.setItem(TOKEN_KEY, auth.token)
      localStorage.setItem(EMAIL_KEY, auth.email)
    } catch {
      /* armazenamento indisponível: sessão só em memória */
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(EMAIL_KEY)
    } catch {
      /* ignore */
    }
  },
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  auth?: boolean
}

function extractMessage(status: number, body: unknown): string {
  if (body && typeof body === 'object') {
    const b = body as Record<string, unknown>
    if (typeof b.title === 'string') return b.title
    if (typeof b.detail === 'string') return b.detail
    if (b.errors && typeof b.errors === 'object') {
      const first = Object.values(b.errors as Record<string, string[]>)[0]
      if (Array.isArray(first) && first.length > 0) return first[0]
    }
  }
  if (status === 401) return 'Sessão expirada. Faça login novamente.'
  return `Erro ${status} ao falar com o servidor.`
}

async function parseBody(res: Response): Promise<unknown> {
  const ct = res.headers.get('content-type') ?? ''
  if (ct.includes('application/json') || ct.includes('application/problem+json')) {
    return res.json().catch(() => null)
  }
  const text = await res.text().catch(() => '')
  return text.length > 0 ? text : null
}

async function request(path: string, options: RequestOptions = {}): Promise<Response> {
  const headers: Record<string, string> = {}
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (options.auth !== false) {
    const token = session.token
    if (token) headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(path, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })

  if (!res.ok) {
    const body = await parseBody(res)
    if (res.status === 401 && options.auth !== false) session.clear()
    throw new ApiError(res.status, extractMessage(res.status, body), body)
  }
  return res
}

async function json<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const res = await request(path, options)
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

function filenameFromDisposition(header: string | null, fallback: string): string {
  if (!header) return fallback
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(header)
  if (utf8) return decodeURIComponent(utf8[1])
  const plain = /filename="?([^";]+)"?/i.exec(header)
  return plain ? plain[1] : fallback
}

export interface PdfResult {
  blob: Blob
  filename: string
}

export const api = {
  register: (email: string, password: string) =>
    json<AuthResponse>('/api/auth/register', { method: 'POST', body: { email, password }, auth: false }),

  login: (email: string, password: string) =>
    json<AuthResponse>('/api/auth/login', { method: 'POST', body: { email, password }, auth: false }),

  listResumes: () => json<ResumeSummary[]>('/api/resumes'),

  getResume: (id: string) => json<ResumeDetail>(`/api/resumes/${id}`),

  createResume: (title: string, data: ResumeData) =>
    json<ResumeDetail>('/api/resumes', { method: 'POST', body: { title, data } }),

  updateResume: (id: string, title: string, data: ResumeData) =>
    json<ResumeDetail>(`/api/resumes/${id}`, { method: 'PUT', body: { title, data } }),

  deleteResume: (id: string) => json<void>(`/api/resumes/${id}`, { method: 'DELETE' }),

  duplicateResume: (id: string, title?: string) =>
    json<ResumeDetail>(`/api/resumes/${id}/duplicate`, { method: 'POST', body: { title: title ?? null } }),

  validate: (data: ResumeData) => json<AtsReport>('/api/ats/validate', { method: 'POST', body: data }),

  /** Gera o PDF do JSON atual. Lança ApiError(422) com AtsReport no body se houver erros. */
  generatePdf: async (data: ResumeData): Promise<PdfResult> => {
    const res = await request('/api/ats/pdf', { method: 'POST', body: data })
    const blob = await res.blob()
    const filename = filenameFromDisposition(res.headers.get('content-disposition'), 'curriculo.pdf')
    return { blob, filename }
  },
}

export function isAtsReport(value: unknown): value is AtsReport {
  return (
    !!value &&
    typeof value === 'object' &&
    Array.isArray((value as AtsReport).items) &&
    typeof (value as AtsReport).score === 'number'
  )
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
