# ATS Formatador — MVP ATS Resume Builder

Aplicação web para montar um currículo a partir de um formulário estruturado e gerar um PDF **single-column, com texto real e selecionável, 100% legível por parsers de ATS** (Applicant Tracking Systems). Antes de exportar, uma checklist determinística mostra um score de compatibilidade.

Especificação completa: [mvp-ats-resume-builder.md](mvp-ats-resume-builder.md).

## Stack

| Camada | Tecnologia |
| --- | --- |
| Frontend | React 19 + TypeScript + Vite |
| Backend | ASP.NET Core 10 Web API |
| PDF | QuestPDF (texto vetorial, fontes embutidas) |
| Persistência | SQL Server via EF Core (migrations aplicadas na subida) |
| Autenticação | JWT (HS256) + BCrypt |

## Estrutura

```
backend/
  AtsFormatador.sln
  AtsFormatador.Api/
    Contracts/        ResumeData (contrato JSON), DTOs, AtsReport
    Controllers/      AuthController, ResumesController, AtsController
    Data/             AppDbContext + Migrations
    Models/           User, Resume
    Services/         AtsValidator, ResumePdfGenerator, TokenService
  AtsFormatador.Tests/  xUnit: validador + extração de texto do PDF (PdfPig)
frontend/
  src/ats/validator.ts   espelho client-side da checklist (aviso inline em tempo real)
  src/components/        seções do formulário, painel ATS, controles de reordenação
  src/pages/             Login, lista de currículos, editor
```

## Pré-requisitos

- .NET SDK 10
- Node.js 20+
- SQL Server (Express ou LocalDB). A connection string padrão aponta para `.\SQLEXPRESS04`; ajuste em `backend/AtsFormatador.Api/appsettings.json` ou pela variável de ambiente `ConnectionStrings__Default`.

## Configuração

`Jwt:Key` precisa ter pelo menos 32 caracteres. Em desenvolvimento já existe uma chave em `appsettings.Development.json`. Em produção, defina via variável de ambiente ou user-secrets:

```bash
cd backend/AtsFormatador.Api
dotnet user-secrets init
dotnet user-secrets set "Jwt:Key" "sua-chave-longa-e-secreta-com-32+caracteres"
dotnet user-secrets set "ConnectionStrings:Default" "Server=...;Database=AtsFormatador;..."
```

## Rodando

Backend (cria o banco e aplica as migrations automaticamente):

```bash
cd backend/AtsFormatador.Api
dotnet run
# API em http://localhost:5080  |  OpenAPI em http://localhost:5080/openapi/v1.json
```

Frontend (o Vite faz proxy de `/api` para a porta 5080):

```bash
cd frontend
npm install
npm run dev
# http://localhost:5173
```

## Testes

```bash
cd backend
dotnet test
```

Os testes do gerador extraem o texto do PDF com PdfPig e verificam que nome, contato, seções, experiências e bullets aparecem **na ordem correta** e que as datas saem em `MM/YYYY` (critério de sucesso da seção 10 do MVP).

## API

| Método | Rota | Descrição |
| --- | --- | --- |
| POST | `/api/auth/register` | Cria conta, retorna JWT |
| POST | `/api/auth/login` | Login, retorna JWT |
| GET | `/api/resumes` | Lista versões do usuário |
| POST | `/api/resumes` | Cria versão `{ title, data }` |
| GET/PUT/DELETE | `/api/resumes/{id}` | Detalhe / atualiza / exclui |
| POST | `/api/resumes/{id}/duplicate` | Duplica para adaptar a outra vaga |
| GET | `/api/resumes/{id}/ats` | Checklist ATS da versão salva |
| GET | `/api/resumes/{id}/pdf` | PDF da versão salva (422 + relatório se houver erros) |
| POST | `/api/ats/validate` | Checklist ATS de um `ResumeData` (stateless) |
| POST | `/api/ats/pdf` | PDF de um `ResumeData` (stateless) |

Todas as rotas exceto `auth/*` e `/api/health` exigem `Authorization: Bearer <token>`.

## Regras do gerador de PDF (seção 6)

O template único em `ResumePdfGenerator.cs` garante:

- Layout single-column; ordem de leitura = ordem de emissão dos elementos.
- Sem cabeçalho/rodapé, sem tabelas, sem colunas, sem imagens, sem `position: absolute`.
- Títulos de seção fixos em texto: "Resumo Profissional", "Experiência Profissional", "Formação Acadêmica", "Habilidades", "Idiomas".
- Datas `MM/YYYY`; término vazio vira "Atual".
- Fonte Arial (fallback Liberation Sans / Helvetica / DejaVu Sans) embutida pelo QuestPDF.
- Bullets como texto `• ` dentro do próprio parágrafo.
- Habilidades em parágrafo separado por vírgula (sem sidebar).

## Checklist ATS (seção 7)

Regras determinísticas, idênticas no backend (`AtsValidator.cs`) e no frontend (`validator.ts`):

- **Erros** (bloqueiam o PDF): nome, e-mail e telefone obrigatórios; e-mail válido; empresa/cargo por experiência; instituição/curso por formação; datas em `AAAA-MM`; nome de idioma.
- **Avisos**: resumo fora de 200–600 caracteres; experiência sem bullet; bullet > 300 caracteres ou com emoji; campos longos demais; menos de 3 habilidades; término anterior ao início; localização vazia; URLs inválidas.
- Score = 100 − 15 × erros − 5 × avisos (mínimo 0).

## Fora do escopo (v2+)

Múltiplos templates, importação de LinkedIn/PDF, sugestão de palavras-chave por IA, DOCX, link público, interface multi-idioma.
