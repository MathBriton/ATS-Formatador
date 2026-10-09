// ATS Formatador — formulário estruturado, checklist ATS e currículo para impressão.
// Dados ficam no localStorage; o PDF sai do window.print() (texto real, selecionável).

(function () {
  'use strict'

  const STORE_KEY = 'ats-formatador:v1'
  const V = window.AtsValidator

  // ---------- Modelo ----------

  const emptyResume = () => ({
    personalInfo: { fullName: '', email: '', phone: '', location: '', linkedin: '', github: '' },
    summary: '',
    experience: [],
    education: [],
    skills: [],
    languages: [],
  })
  const emptyExperience = () => ({ company: '', role: '', startDate: '', endDate: null, location: '', bullets: [''] })
  const emptyEducation = () => ({ institution: '', degree: '', startDate: '', endDate: '' })
  const emptyLanguage = () => ({ name: '', level: '' })

  const FACTORIES = {
    experience: emptyExperience,
    education: emptyEducation,
    languages: emptyLanguage,
    bullets: () => '',
  }

  const plural = (n, one, many) => (n === 1 ? one : many)
  const str = (v) => (typeof v === 'string' ? v : '')
  const arr = (v) => (Array.isArray(v) ? v : [])

  /** Aceita JSON vindo de fora (importação) e devolve sempre um ResumeData completo. */
  function normalize(raw) {
    const r = emptyResume()
    if (!raw || typeof raw !== 'object') return r
    const p = raw.personalInfo || {}
    for (const k of Object.keys(r.personalInfo)) r.personalInfo[k] = str(p[k])
    r.summary = str(raw.summary)
    r.experience = arr(raw.experience).map((e) => ({
      company: str(e?.company),
      role: str(e?.role),
      startDate: str(e?.startDate),
      endDate: e?.endDate == null ? null : str(e.endDate),
      location: str(e?.location),
      bullets: arr(e?.bullets).map(str),
    }))
    r.education = arr(raw.education).map((e) => ({
      institution: str(e?.institution),
      degree: str(e?.degree),
      startDate: str(e?.startDate),
      endDate: e?.endDate == null ? '' : str(e.endDate),
    }))
    r.skills = arr(raw.skills).map(str).map((s) => s.trim()).filter(Boolean)
    r.languages = arr(raw.languages).map((l) => ({ name: str(l?.name), level: str(l?.level) }))
    return r
  }

  // ---------- Armazenamento ----------

  const newId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random())

  function newResume(title, data) {
    const now = new Date().toISOString()
    return { id: newId(), title, createdAt: now, updatedAt: now, data: data || emptyResume() }
  }

  function loadState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORE_KEY))
      if (parsed && Array.isArray(parsed.resumes) && parsed.resumes.length > 0) {
        parsed.resumes.forEach((r) => (r.data = normalize(r.data)))
        if (!parsed.resumes.some((r) => r.id === parsed.currentId)) parsed.currentId = parsed.resumes[0].id
        return parsed
      }
    } catch {
      /* storage vazio, corrompido ou indisponível: começa do zero */
    }
    const first = newResume('Currículo 1')
    return { resumes: [first], currentId: first.id }
  }

  let state = loadState()
  let report = null
  let saveTimer = null

  const current = () => state.resumes.find((r) => r.id === state.currentId)

  function persist() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state))
      setStatus('Salvo no navegador')
    } catch {
      setStatus('Não foi possível salvar neste navegador. Use "Baixar cópia de segurança" no menu Arquivo.')
    }
  }

  function scheduleSave() {
    setStatus('Salvando…')
    clearTimeout(saveTimer)
    saveTimer = setTimeout(persist, 300)
  }

  // ---------- Utilidades ----------

  const $ = (sel, root = document) => root.querySelector(sel)
  const form = $('#form')
  const printArea = $('#print-area')

  const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

  function getByPath(obj, path) {
    return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj)
  }

  function setByPath(obj, path, value) {
    const keys = path.split('.')
    const last = keys.pop()
    const target = keys.reduce((o, k) => o[k], obj)
    target[last] = value
  }

  function setStatus(text) {
    $('#save-status').textContent = text
  }

  function move(list, index, dir) {
    const target = index + dir
    if (target < 0 || target >= list.length) return
    ;[list[index], list[target]] = [list[target], list[index]]
  }

  // ---------- Formulário ----------

  function field({ label, path, type = 'text', hint = '', issue = '', area = false, rows = 3, placeholder = '', disabled = false }) {
    const id = 'f-' + path.replace(/\./g, '-')
    const value = esc(getByPath(current().data, path))
    const common = `id="${id}" data-path="${path}" placeholder="${esc(placeholder)}" ${disabled ? 'disabled' : ''}`
    const control = area
      ? `<textarea ${common} rows="${rows}">${value}</textarea>`
      : `<input ${common} type="${type}" value="${value}" />`
    return `<div class="field">
      <label for="${id}">${label}</label>
      ${control}
      ${hint ? `<small class="muted">${hint}</small>` : ''}
      ${issue ? `<span class="issue" data-issue="${issue}"></span>` : ''}
    </div>`
  }

  function controls(list, index, count, label, dirs = ['↑', '↓']) {
    const btn = (action, extra, text, aria, disabled) =>
      `<button type="button" class="icon-btn" data-action="${action}" data-list="${list}" data-index="${index}" ${extra}
        aria-label="${aria}" ${disabled ? 'disabled' : ''}>${text}</button>`
    return `<div class="controls">
      ${btn('move', 'data-dir="-1"', dirs[0], `Mover ${label} para cima`, index === 0)}
      ${btn('move', 'data-dir="1"', dirs[1], `Mover ${label} para baixo`, index === count - 1)}
      ${btn('remove', '', '✕', `Remover ${label}`, false)}
    </div>`
  }

  function itemTitle(path, fallback, value) {
    return `<h3 data-title="${path}" data-fallback="${fallback}">${esc(value.trim() || fallback)}</h3>`
  }

  function personalHtml() {
    return `<section class="card">
      <h2>Dados pessoais</h2>
      <div class="grid-2">
        ${field({ label: 'Nome completo *', path: 'personalInfo.fullName', issue: 'personal.fullName' })}
        ${field({ label: 'E-mail *', path: 'personalInfo.email', type: 'email', issue: 'personal.email' })}
      </div>
      <div class="grid-2">
        ${field({ label: 'Telefone *', path: 'personalInfo.phone', type: 'tel', issue: 'personal.phone', placeholder: '+55 11 99999-9999' })}
        ${field({ label: 'Localização', path: 'personalInfo.location', hint: 'Cidade, país', issue: 'personal.location' })}
      </div>
      <div class="grid-2">
        ${field({ label: 'LinkedIn', path: 'personalInfo.linkedin', issue: 'personal.linkedin', placeholder: 'https://linkedin.com/in/seu-nome' })}
        ${field({ label: 'GitHub', path: 'personalInfo.github', issue: 'personal.github', placeholder: 'https://github.com/seu-usuario' })}
      </div>
    </section>`
  }

  function summaryHtml() {
    const len = current().data.summary.trim().length
    return `<section class="card">
      <h2>Resumo profissional</h2>
      ${field({
        label: 'Resumo',
        path: 'summary',
        area: true,
        rows: 5,
        issue: 'summary',
        hint: `Ideal: 3 a 5 linhas (${V.LIMITS.summaryMin} a ${V.LIMITS.summaryMax} caracteres). Agora: <span id="summary-count">${len}</span>.`,
      })}
    </section>`
  }

  function experienceHtml(d) {
    const items = d.experience
      .map((e, i) => {
        const p = `experience.${i}`
        const ip = `experience[${i}]`
        const isCurrent = e.endDate === null
        const bullets = e.bullets
          .map(
            (b, bi) => `<div class="bullet-row">
              <div>
                <textarea data-path="${p}.bullets.${bi}" rows="2" aria-label="Tópico ${bi + 1}"
                  placeholder="Ex.: Aumentei as vendas da loja em 20% em seis meses com uma nova campanha.">${esc(b)}</textarea>
                <span class="issue" data-issue="${ip}.bullets[${bi}]."></span>
              </div>
              ${controls(`${p}.bullets`, bi, e.bullets.length, 'tópico')}
            </div>`,
          )
          .join('')
        return `<div class="item">
          <div class="item-header">
            ${itemTitle(`${p}.role`, `Experiência #${i + 1}`, e.role)}
            ${controls('experience', i, d.experience.length, 'experiência')}
          </div>
          <div class="grid-2">
            ${field({ label: 'Cargo *', path: `${p}.role`, issue: `${ip}.role.` })}
            ${field({ label: 'Empresa *', path: `${p}.company`, issue: `${ip}.company.` })}
          </div>
          <div class="grid-2">
            ${field({ label: 'Início *', path: `${p}.startDate`, type: 'month', placeholder: 'AAAA-MM', issue: `${ip}.startDate.` })}
            <div class="row end-row">
              ${field({ label: 'Término', path: `${p}.endDate`, type: 'month', placeholder: 'AAAA-MM', issue: `${ip}.endDate. ${ip}.dates.`, disabled: isCurrent })}
              <label class="inline-check">
                <input type="checkbox" data-action="toggle-current" data-path="${p}.endDate" ${isCurrent ? 'checked' : ''} /> Emprego atual
              </label>
            </div>
          </div>
          ${field({ label: 'Localização', path: `${p}.location`, hint: 'Cidade, país ou Remoto' })}
          <div class="field">
            <label>Responsabilidades e resultados</label>
            <small class="muted">Escreva um tópico para cada responsabilidade ou conquista. Se puder, use números.</small>
            ${bullets}
            <div class="row">
              <button type="button" class="btn btn-sm" data-action="add" data-list="${p}.bullets">+ Adicionar tópico</button>
              <span class="issue" data-issue="${ip}.bullets."></span>
            </div>
          </div>
        </div>`
      })
      .join('')

    return `<section class="card">
      <div class="card-header">
        <h2>Experiência profissional</h2>
        <button type="button" class="btn btn-sm" data-action="add" data-list="experience">+ Adicionar experiência</button>
      </div>
      ${d.experience.length === 0 ? '<p class="muted">Nenhuma experiência ainda. <span class="issue" data-issue="experience.empty"></span></p>' : ''}
      ${items}
    </section>`
  }

  function educationHtml(d) {
    const items = d.education
      .map((e, i) => {
        const p = `education.${i}`
        const ip = `education[${i}]`
        return `<div class="item">
          <div class="item-header">
            ${itemTitle(`${p}.degree`, `Formação #${i + 1}`, e.degree)}
            ${controls('education', i, d.education.length, 'formação')}
          </div>
          <div class="grid-2">
            ${field({ label: 'Curso / grau *', path: `${p}.degree`, issue: `${ip}.degree.` })}
            ${field({ label: 'Instituição *', path: `${p}.institution`, issue: `${ip}.institution.` })}
          </div>
          <div class="grid-2">
            ${field({ label: 'Início *', path: `${p}.startDate`, type: 'month', placeholder: 'AAAA-MM', issue: `${ip}.startDate.` })}
            ${field({ label: 'Término', path: `${p}.endDate`, type: 'month', placeholder: 'AAAA-MM', hint: 'Deixe vazio se ainda estiver cursando', issue: `${ip}.endDate. ${ip}.dates.` })}
          </div>
        </div>`
      })
      .join('')

    return `<section class="card">
      <div class="card-header">
        <h2>Formação acadêmica</h2>
        <button type="button" class="btn btn-sm" data-action="add" data-list="education">+ Adicionar formação</button>
      </div>
      ${d.education.length === 0 ? '<p class="muted">Nenhuma formação ainda. <span class="issue" data-issue="education.empty"></span></p>' : ''}
      ${items}
    </section>`
  }

  function skillsHtml(d) {
    const chips = d.skills
      .map(
        (s, i) => `<li class="chip" data-issue="skills[${i}]." data-chip>
          ${esc(s)}
          <button type="button" data-action="move" data-list="skills" data-index="${i}" data-dir="-1" aria-label="Mover ${esc(s)} para a esquerda" ${i === 0 ? 'disabled' : ''}>‹</button>
          <button type="button" data-action="move" data-list="skills" data-index="${i}" data-dir="1" aria-label="Mover ${esc(s)} para a direita" ${i === d.skills.length - 1 ? 'disabled' : ''}>›</button>
          <button type="button" data-action="remove" data-list="skills" data-index="${i}" aria-label="Remover ${esc(s)}">✕</button>
        </li>`,
      )
      .join('')

    return `<section class="card">
      <h2>Habilidades</h2>
      <p class="muted">Escreva cada habilidade em poucas palavras (ex.: Excel, Atendimento ao cliente, Vendas). No PDF elas aparecem em uma única linha, separadas por vírgula.</p>
      <div class="field">
        <label for="skill-draft">Adicionar habilidade</label>
        <div class="row">
          <input id="skill-draft" placeholder="Ex.: Excel, Atendimento ao cliente, Vendas (Enter ou vírgula para adicionar)" />
          <button type="button" class="btn" data-action="add-skill">Adicionar</button>
        </div>
        <span class="issue" data-issue="skills."></span>
      </div>
      ${chips ? `<ul class="chip-list" aria-label="Habilidades">${chips}</ul>` : ''}
    </section>`
  }

  function languagesHtml(d) {
    const items = d.languages
      .map((l, i) => {
        const p = `languages.${i}`
        const ip = `languages[${i}]`
        return `<div class="item">
          <div class="item-header">
            ${itemTitle(`${p}.name`, `Idioma #${i + 1}`, l.name)}
            ${controls('languages', i, d.languages.length, 'idioma')}
          </div>
          <div class="grid-2">
            ${field({ label: 'Idioma *', path: `${p}.name`, issue: `${ip}.name.` })}
            ${field({ label: 'Nível', path: `${p}.level`, hint: 'Básico, Intermediário, Avançado, Fluente', issue: `${ip}.level.` })}
          </div>
        </div>`
      })
      .join('')

    return `<section class="card">
      <div class="card-header">
        <h2>Idiomas</h2>
        <button type="button" class="btn btn-sm" data-action="add" data-list="languages">+ Adicionar idioma</button>
      </div>
      ${d.languages.length === 0 ? '<p class="muted">Nenhum idioma ainda (opcional).</p>' : ''}
      ${items}
    </section>`
  }

  function renderForm(focusSelector) {
    const d = current().data
    form.innerHTML = personalHtml() + summaryHtml() + experienceHtml(d) + educationHtml(d) + skillsHtml(d) + languagesHtml(d)
    refresh()
    if (focusSelector) $(focusSelector, form)?.focus()
  }

  // ---------- Relatório ATS ----------

  const ORDER = { error: 0, warning: 1, ok: 2 }
  const ICON = { error: '✖', warning: '⚠', ok: '✔' }

  function refresh() {
    report = V.validateResume(current().data)
    refreshIssues()
    refreshPanel()
    renderPrint()
  }

  function refreshIssues() {
    form.querySelectorAll('[data-issue]').forEach((el) => {
      const prefixes = el.dataset.issue.split(' ')
      const item = report.items.find((i) => i.severity !== 'ok' && prefixes.some((p) => i.code.startsWith(p)))
      if (el.hasAttribute('data-chip')) {
        el.classList.toggle('has-issue', !!item)
        el.title = item ? item.message : ''
      } else {
        el.className = 'issue' + (item ? ' ' + item.severity : '')
        el.textContent = item ? item.message : ''
      }
    })
    form.querySelectorAll('[data-title]').forEach((el) => {
      const value = getByPath(current().data, el.dataset.title)
      el.textContent = (value || '').trim() || el.dataset.fallback
    })
    const count = $('#summary-count')
    if (count) count.textContent = current().data.summary.trim().length
  }

  function refreshPanel() {
    $('#score-value').textContent = report.score
    const bar = $('#score-bar')
    bar.className = 'score-bar ' + (report.score >= 80 ? 'score-good' : report.score >= 50 ? 'score-mid' : 'score-bad')
    bar.firstElementChild.style.width = report.score + '%'
    $('#score-summary').textContent = `${report.errors} ${plural(report.errors, 'erro', 'erros')} · ${report.warnings} ${plural(report.warnings, 'aviso', 'avisos')}.`
    $('#export-pdf').disabled = !report.passed
    $('#export-pdf').title = report.passed ? 'Abre a janela de impressão para salvar o PDF' : 'Corrija os erros antes de exportar'

    const sorted = [...report.items].sort((a, b) => ORDER[a.severity] - ORDER[b.severity])
    $('#check-list').innerHTML = sorted
      .map((i) => `<li class="${i.severity}"><span class="icon" aria-hidden="true">${ICON[i.severity]}</span><span>${esc(i.message)}</span></li>`)
      .join('')
  }

  // ---------- Currículo para impressão (template único) ----------
  // Regras da seção 6: single-column, sem tabelas/ícones/imagens, títulos fixos em texto,
  // datas MM/AAAA, bullets como "• " no próprio parágrafo, contato no fluxo principal.

  const SECTION = {
    summary: 'Resumo Profissional',
    experience: 'Experiência Profissional',
    education: 'Formação Acadêmica',
    skills: 'Habilidades',
    languages: 'Idiomas',
  }

  const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim()
  const cleanParagraph = (s) =>
    String(s ?? '')
      .split(/\r?\n/)
      .map(clean)
      .filter(Boolean)
      .join('\n')
  const join = (parts, sep) => parts.filter((p) => p.length > 0).join(sep)

  function formatYearMonth(value) {
    const v = clean(value)
    const m = /^(\d{4})-(\d{2})$/.exec(v)
    return m ? `${m[2]}/${m[1]}` : v
  }

  function formatPeriod(start, end) {
    const s = formatYearMonth(start)
    const e = clean(end) ? formatYearMonth(end) : 'Atual'
    if (!s && !clean(end)) return ''
    return s ? `${s} - ${e}` : e
  }

  function renderPrint() {
    const d = current().data
    const p = d.personalInfo
    const out = []

    out.push(`<h1>${esc(clean(p.fullName))}</h1>`)
    const contact = join([clean(p.email), clean(p.phone), clean(p.location)], ' | ')
    if (contact) out.push(`<p>${esc(contact)}</p>`)
    if (clean(p.linkedin)) out.push(`<p>LinkedIn: ${esc(clean(p.linkedin))}</p>`)
    if (clean(p.github)) out.push(`<p>GitHub: ${esc(clean(p.github))}</p>`)

    const summary = cleanParagraph(d.summary)
    if (summary) out.push(`<h2>${SECTION.summary}</h2><p class="pre">${esc(summary)}</p>`)

    const exps = d.experience.filter((e) => clean(e.role) || clean(e.company))
    if (exps.length) {
      out.push(`<h2>${SECTION.experience}</h2>`)
      for (const e of exps) {
        const meta = join([formatPeriod(e.startDate, e.endDate), clean(e.location)], ' | ')
        const bullets = e.bullets.map(cleanParagraph).filter(Boolean)
        out.push(`<div class="entry">
          <p class="entry-title">${esc(join([clean(e.role), clean(e.company)], ' - '))}</p>
          ${meta ? `<p class="meta">${esc(meta)}</p>` : ''}
          ${bullets.map((b) => `<p class="bullet pre">${esc('• ' + b)}</p>`).join('')}
        </div>`)
      }
    }

    const eds = d.education.filter((e) => clean(e.degree) || clean(e.institution))
    if (eds.length) {
      out.push(`<h2>${SECTION.education}</h2>`)
      for (const e of eds) {
        const period = formatPeriod(e.startDate, e.endDate)
        out.push(`<div class="entry">
          <p class="entry-title">${esc(join([clean(e.degree), clean(e.institution)], ' - '))}</p>
          ${period ? `<p class="meta">${esc(period)}</p>` : ''}
        </div>`)
      }
    }

    const skills = d.skills.map(clean).filter(Boolean)
    if (skills.length) out.push(`<h2>${SECTION.skills}</h2><p>${esc(skills.join(', '))}</p>`)

    const langs = d.languages.filter((l) => clean(l.name))
    if (langs.length) {
      out.push(`<h2>${SECTION.languages}</h2>`)
      for (const l of langs) out.push(`<p>${esc(join([clean(l.name), clean(l.level)], ' - '))}</p>`)
    }

    printArea.innerHTML = out.join('\n')
  }

  function exportPdf() {
    if (!report.passed) return
    const previous = document.title
    const name = clean(current().data.personalInfo.fullName)
    // O navegador usa o título da página como nome sugerido do arquivo.
    document.title = name ? `${name} - Currículo` : 'Currículo'
    window.addEventListener('afterprint', () => (document.title = previous), { once: true })
    renderPrint()
    window.print()
  }

  // ---------- Topbar: título editável + menu Arquivo (várias versões) ----------

  const titleInput = $('#resume-title')
  const menuBtn = $('#file-menu-btn')
  const menu = $('#file-menu')

  function menuItem(label, attrs, { icon = '', danger = false, role = 'menuitem' } = {}) {
    return `<button type="button" role="${role}" class="menu-item${danger ? ' danger' : ''}" ${attrs}>
      <span class="menu-icon" aria-hidden="true">${icon}</span>${label}
    </button>`
  }

  function renderTopbar() {
    titleInput.value = current().title
    menu.innerHTML = `
      <div class="menu-label">Meus currículos</div>
      <div class="menu-list">
        ${state.resumes
          .map((r) => {
            const active = r.id === state.currentId
            return menuItem(esc(r.title), `data-resume="${esc(r.id)}" aria-checked="${active}"`, {
              icon: active ? '✓' : '',
              role: 'menuitemradio',
            })
          })
          .join('')}
      </div>
      <hr class="menu-sep" />
      ${menuItem('Novo currículo', 'data-top="new"', { icon: '+' })}
      ${menuItem('Duplicar', 'data-top="duplicate"', { icon: '⧉' })}
      <hr class="menu-sep" />
      ${menuItem('Abrir cópia de segurança', 'data-top="import"', { icon: '↑' })}
      ${menuItem('Baixar cópia de segurança', 'data-top="export"', { icon: '↓' })}
      <hr class="menu-sep" />
      ${menuItem('Excluir currículo', 'data-top="delete"', { icon: '✕', danger: true })}`
  }

  function setMenu(open, focusFirst = false) {
    menu.hidden = !open
    menuBtn.setAttribute('aria-expanded', String(open))
    if (open && focusFirst) menu.querySelector('.menu-item')?.focus()
  }

  function switchTo(id) {
    state.currentId = id
    renderTopbar()
    renderForm()
    persist()
  }

  function addResume(title, data) {
    const r = newResume(title, data)
    state.resumes.push(r)
    switchTo(r.id)
  }

  const slug = (s) =>
    clean(s)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'curriculo'

  function topAction(action) {
    const cur = current()
    if (action === 'new') {
      addResume(`Currículo ${state.resumes.length + 1}`)
    } else if (action === 'duplicate') {
      addResume(`${cur.title} (cópia)`, JSON.parse(JSON.stringify(cur.data)))
    } else if (action === 'delete') {
      if (!confirm(`Excluir "${cur.title}"? Esta ação não pode ser desfeita.`)) return
      state.resumes = state.resumes.filter((r) => r.id !== cur.id)
      if (state.resumes.length === 0) state.resumes.push(newResume('Currículo 1'))
      switchTo(state.resumes[0].id)
    } else if (action === 'export') {
      const blob = new Blob([JSON.stringify({ title: cur.title, data: cur.data }, null, 2)], { type: 'application/json' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${slug(cur.title)}.json`
      a.click()
      URL.revokeObjectURL(a.href)
    } else if (action === 'import') {
      $('#import-file').click()
    }
  }

  async function importFile(file) {
    try {
      const raw = JSON.parse(await file.text())
      const hasWrapper = raw && typeof raw === 'object' && raw.data && typeof raw.data === 'object'
      const title = hasWrapper && clean(raw.title) ? clean(raw.title) : file.name.replace(/\.json$/i, '')
      addResume(title, normalize(hasWrapper ? raw.data : raw))
    } catch {
      alert('Arquivo inválido: não foi possível ler este arquivo como uma cópia de segurança de currículo.')
    }
  }

  // ---------- Eventos ----------

  function changed() {
    current().updatedAt = new Date().toISOString()
    scheduleSave()
    refresh()
  }

  form.addEventListener('input', (e) => {
    const t = e.target
    if (!t.dataset.path || t.type === 'checkbox') return
    setByPath(current().data, t.dataset.path, t.value)
    changed()
  })

  form.addEventListener('change', (e) => {
    const t = e.target
    if (t.dataset.action !== 'toggle-current') return
    setByPath(current().data, t.dataset.path, t.checked ? null : '')
    changed()
    renderForm(t.checked ? null : `[data-path="${t.dataset.path}"]`)
  })

  function addSkills() {
    const input = $('#skill-draft')
    const d = current().data
    const parts = input.value
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter((s) => s && !d.skills.includes(s))
    if (parts.length === 0) return
    d.skills.push(...parts)
    changed()
    renderForm('#skill-draft')
  }

  form.addEventListener('keydown', (e) => {
    if (e.target.id === 'skill-draft' && e.key === 'Enter') {
      e.preventDefault()
      addSkills()
    }
  })

  form.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]')
    if (!btn || btn.disabled) return
    const { action, list, index, dir } = btn.dataset
    const d = current().data

    if (action === 'add-skill') return addSkills()

    const items = getByPath(d, list)
    if (action === 'add') {
      items.push(FACTORIES[list.split('.').pop()]())
      changed()
      const last = `${list}.${items.length - 1}`
      renderForm(`[data-path="${last}"], [data-path^="${last}."]`)
    } else if (action === 'move') {
      move(items, Number(index), Number(dir))
      changed()
      renderForm()
    } else if (action === 'remove') {
      items.splice(Number(index), 1)
      changed()
      renderForm()
    }
  })

  // Título inline: renomeia sem diálogo; vazio volta para um nome padrão ao sair do campo.
  titleInput.addEventListener('input', () => {
    current().title = titleInput.value
    current().updatedAt = new Date().toISOString()
    scheduleSave()
  })
  titleInput.addEventListener('blur', () => {
    current().title = clean(titleInput.value) || 'Currículo sem título'
    renderTopbar()
    persist()
  })
  titleInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') titleInput.blur()
  })

  menuBtn.addEventListener('click', () => setMenu(menu.hidden, true))

  menu.addEventListener('click', (e) => {
    const item = e.target.closest('.menu-item')
    if (!item) return
    setMenu(false)
    menuBtn.focus()
    if (item.dataset.resume) switchTo(item.dataset.resume)
    else if (item.dataset.top) topAction(item.dataset.top)
  })

  document.addEventListener('click', (e) => {
    if (!menu.hidden && !e.target.closest('.menu-wrap')) setMenu(false)
  })

  document.addEventListener('keydown', (e) => {
    if (menu.hidden) return
    const items = [...menu.querySelectorAll('.menu-item')]
    const i = items.indexOf(document.activeElement)
    if (e.key === 'Escape') {
      setMenu(false)
      menuBtn.focus()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      items[(i + 1) % items.length].focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      items[(i - 1 + items.length) % items.length].focus()
    } else if (e.key === 'Home') {
      e.preventDefault()
      items[0].focus()
    } else if (e.key === 'End') {
      e.preventDefault()
      items[items.length - 1].focus()
    } else if (e.key === 'Tab') {
      setMenu(false)
    }
  })

  $('#import-file').addEventListener('change', (e) => {
    const file = e.target.files[0]
    e.target.value = ''
    if (file) importFile(file)
  })

  document.querySelectorAll('.tab').forEach((tab) =>
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t === tab))
      document.body.classList.toggle('view-preview', tab.dataset.tab === 'preview')
    }),
  )

  $('#export-pdf').addEventListener('click', exportPdf)

  // Última chance de gravar edições pendentes (debounce) ao fechar a aba.
  window.addEventListener('pagehide', () => {
    if (saveTimer) persist()
  })

  // ---------- Início ----------

  renderTopbar()
  renderForm()
})()
