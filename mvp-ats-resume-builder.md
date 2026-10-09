# MVP — ATS Resume Builder

## 1. Problema

Currículos com layout "bonito" (colunas, tabelas, ícones, texto em caixas, fontes decorativas) costumam ser mal interpretados pelos parsers de ATS (*Applicant Tracking Systems*), resultando em campos vazios, texto fora de ordem ou reprovação automática antes de um humano ler o currículo. O objetivo do MVP é permitir preencher dados estruturados e gerar um PDF **limpo, semântico e 100% legível por ATS**, sem abrir mão de uma leitura humana agradável.

## 2. Objetivo do MVP

Uma aplicação web onde o usuário:
1. Preenche os dados do currículo em um formulário estruturado (não em texto livre solto).
2. Gera um PDF com layout linear (single-column), texto selecionável, sem elementos que quebram parsers.
3. Recebe um *score* básico de compatibilidade ATS antes de exportar.

## 3. Escopo do MVP (in)

- [ ] Formulário estruturado com seções fixas: Dados pessoais, Resumo profissional, Experiência, Formação, Habilidades, Idiomas.
- [ ] Reordenação de itens dentro de cada seção (drag ou botões up/down).
- [ ] Geração de PDF via template único (HTML/CSS de impressão, não WYSIWYG livre).
- [ ] Validador de compatibilidade ATS (checklist automática, ver seção 6).
- [ ] Exportação do PDF final.
- [ ] Salvar/editar múltiplas versões do currículo (para adaptar a vagas diferentes).
- [ ] Persistência local no navegador (`localStorage`) com exportar/importar JSON — sem login nem backend.

## 4. Fora do escopo (v2+)

- Múltiplos templates visuais / temas de cor.
- Importação automática de LinkedIn ou PDF existente (parsing reverso).
- Sugestão de palavras-chave via IA comparando com descrição da vaga.
- Exportação DOCX.
- Compartilhamento público (link de currículo).
- Multi-idioma na interface.

## 5. Modelo de dados (JSON — contrato entre form e gerador de PDF)

```json
{
  "personalInfo": {
    "fullName": "string",
    "email": "string",
    "phone": "string",
    "location": "string (cidade, país)",
    "linkedin": "string (url, opcional)",
    "github": "string (url, opcional)"
  },
  "summary": "string (3-5 linhas, texto puro)",
  "experience": [
    {
      "company": "string",
      "role": "string",
      "startDate": "YYYY-MM",
      "endDate": "YYYY-MM | null (atual)",
      "location": "string",
      "bullets": ["string", "string"]
    }
  ],
  "education": [
    {
      "institution": "string",
      "degree": "string",
      "startDate": "YYYY-MM",
      "endDate": "YYYY-MM"
    }
  ],
  "skills": ["string"],
  "languages": [
    { "name": "string", "level": "string" }
  ]
}
```

Regra chave: **nenhum campo é HTML rico**. Tudo é texto puro estruturado — quem decide formatação visual é o template do gerador, nunca o usuário.

## 6. Checklist de compatibilidade ATS (regras do gerador)

O gerador de PDF **nunca** deve produzir:

- ❌ Tabelas HTML/CSS para layout (colunas lado a lado).
- ❌ Cabeçalhos/rodapés com dados de contato (muitos parsers ignoram).
- ❌ Ícones no lugar de texto (ex: ícone de telefone sem o número em texto ao lado).
- ❌ Caixas de texto sobrepostas ou elementos posicionados via `position: absolute` fora do fluxo.
- ❌ Fontes não-padrão / não embutidas corretamente no PDF.
- ❌ Imagens de fundo, marcas d'água, foto do candidato (opcional, mas arriscado).
- ❌ Colunas duplas (sidebar de skills ao lado do texto principal).

O gerador **sempre** deve produzir:

- ✅ Layout single-column, ordem de leitura = ordem do DOM/PDF.
- ✅ Títulos de seção em texto simples e padronizado ("Experiência Profissional", não ícone).
- ✅ Datas em formato consistente (MM/YYYY).
- ✅ Texto selecionável e copiável (nunca renderizar como imagem/rasterizado).
- ✅ Fonte padrão do sistema (Arial, Calibri, Helvetica) embutida no PDF.
- ✅ Bullets com caractere ASCII simples (`-` ou `•` padrão, não glifos customizados).

## 7. Validador ATS (feature simples do MVP)

Antes de exportar, rodar checklist automática client-side:
- Todos os campos obrigatórios preenchidos (nome, email, telefone)?
- Pelo menos 1 bullet por experiência?
- Resumo profissional entre X e Y caracteres?
- Nenhum campo excede limite de comprimento que force quebra estranha no PDF?

Resultado: lista de ✅/⚠️ simples, não é IA — é regra determinística.

## 8. Arquitetura

Aplicação estática, sem build e sem backend:

```
index.html + style.css + app.js + validator.js
     form → JSON (contrato da seção 5) → localStorage
     validator.js → checklist ATS em tempo real
     template HTML semântico + @media print → window.print() → "Salvar como PDF"
```

O navegador gera o PDF a partir de HTML real, então o texto é vetorial e selecionável (nunca rasterizado), e a ordem de leitura é a ordem do DOM. Versões múltiplas ficam no `localStorage`; exportar/importar JSON serve de backup.

## 9. Fluxo do usuário (MVP)

1. Abre a página e cria um novo currículo → preenche o formulário por seções.
2. O sistema roda a checklist ATS em tempo real (aviso inline + painel de score).
3. Usuário clica "Exportar PDF" e escolhe "Salvar como PDF" no diálogo de impressão.
4. Pode duplicar o currículo para adaptar a outra vaga.

## 10. Critério de sucesso do MVP

- PDF gerado passa em teste manual de extração de texto (copiar/colar do PDF preserva ordem e conteúdo).
- PDF testado em pelo menos 1 ferramenta pública de simulação de parsing ATS (ex: Jobscan free tier) sem perda de seções.
- Usuário consegue gerar currículo completo em menos de 10 minutos.
