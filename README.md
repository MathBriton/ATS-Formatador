# ATS Formatador

Ferramenta gratuita para montar um currículo a partir de um formulário estruturado e exportar um PDF **single-column, com texto real e selecionável, legível por parsers de ATS** (Applicant Tracking Systems). Uma checklist determinística mostra um score de compatibilidade enquanto você preenche.

Especificação: [mvp-ats-resume-builder.md](mvp-ats-resume-builder.md).

## Como usar

Não há build, servidor nem dependências. Abra o `index.html` no navegador (ou publique a pasta no GitHub Pages).

1. Preencha as seções; o painel lateral mostra o score ATS e os problemas em tempo real.
2. Use **Pré-visualizar** para ver o currículo como será impresso.
3. Clique em **Exportar PDF** e escolha **Salvar como PDF** no diálogo de impressão. O template zera a margem da página (`@page { margin: 0 }`) e usa padding no próprio currículo, então URL, data e numeração do navegador não entram no PDF. Se algum navegador ainda os mostrar, desmarque "Cabeçalhos e rodapés" no diálogo.

Erros (campos obrigatórios, formatos inválidos) bloqueiam a exportação; avisos são só recomendações.

## Estrutura

```
index.html     página única
style.css      tela + @media print (o template do currículo)
app.js         estado, formulário, armazenamento, renderização do currículo
validator.js   checklist ATS (única fonte das regras)
```

## Dados e versões

- Tudo fica no `localStorage` do navegador; nada é enviado a servidor algum.
- Você pode ter várias versões (Novo, Duplicar, Renomear, Excluir) para adaptar o currículo a vagas diferentes.
- **Exportar JSON / Importar JSON** serve de backup e para levar o currículo a outro navegador ou dispositivo. Limpar os dados do navegador apaga as versões salvas, então exporte de vez em quando.

## Regras do template (seção 6 do MVP)

- Layout single-column; ordem de leitura = ordem do DOM.
- Sem tabelas, colunas, ícones, imagens, cabeçalho/rodapé nem `position: absolute`.
- Títulos fixos em texto: "Resumo Profissional", "Experiência Profissional", "Formação Acadêmica", "Habilidades", "Idiomas".
- Datas `MM/AAAA`; término vazio vira "Atual".
- Fonte Arial (fallback Helvetica / Liberation Sans), embutida pelo navegador no PDF.
- Bullets como texto `• ` no próprio parágrafo; habilidades em um parágrafo separado por vírgula.

## Checklist ATS (seção 7 do MVP)

- **Erros** (bloqueiam o PDF): nome, e-mail e telefone obrigatórios; e-mail válido; empresa/cargo por experiência; instituição/curso por formação; datas em `AAAA-MM`; nome de idioma.
- **Avisos**: resumo fora de 200–600 caracteres; experiência sem bullet; bullet > 300 caracteres ou com emoji; campos longos demais; menos de 3 habilidades; término anterior ao início; localização vazia; URLs inválidas.
- Score = 100 − 15 × erros − 5 × avisos (mínimo 0).

## Fora do escopo (v2+)

Múltiplos templates, importação de LinkedIn/PDF, sugestão de palavras-chave por IA, DOCX, link público, interface multi-idioma, contas e sincronização entre dispositivos.
