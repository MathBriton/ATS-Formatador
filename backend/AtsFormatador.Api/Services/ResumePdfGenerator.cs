using System.Globalization;
using System.Text.RegularExpressions;
using AtsFormatador.Api.Contracts;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace AtsFormatador.Api.Services;

/// <summary>
/// Template único e validado (seção 6 do MVP). Regras aplicadas aqui:
/// - Layout single-column: ordem de leitura = ordem em que os itens são emitidos.
/// - Sem cabeçalho/rodapé com dados de contato, sem tabelas, sem colunas, sem imagens.
/// - Títulos de seção em texto simples e padronizado.
/// - Datas em MM/YYYY.
/// - Fonte padrão do sistema (Arial com fallbacks), embutida pelo QuestPDF.
/// - Bullets como texto "•" dentro do mesmo parágrafo (não como glifo separado).
/// - Todo conteúdo é texto real (vetorial, selecionável), nunca rasterizado.
/// </summary>
public sealed partial class ResumePdfGenerator
{
    public const string SectionSummary = "Resumo Profissional";
    public const string SectionExperience = "Experiência Profissional";
    public const string SectionEducation = "Formação Acadêmica";
    public const string SectionSkills = "Habilidades";
    public const string SectionLanguages = "Idiomas";
    public const string PresentLabel = "Atual";
    public const string BulletPrefix = "• ";

    private static readonly string[] FontFamilies = ["Arial", "Liberation Sans", "Helvetica", "DejaVu Sans"];

    private const float BodyFontSize = 10.5f;
    private const float NameFontSize = 18f;
    private const float SectionFontSize = 12f;
    private const float MetaFontSize = 9.5f;

    public byte[] Generate(ResumeData data)
    {
        var name = Clean(data.PersonalInfo.FullName);

        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(2, Unit.Centimetre);
                page.DefaultTextStyle(t => t
                    .FontFamily(FontFamilies)
                    .FontSize(BodyFontSize)
                    .FontColor(Colors.Black)
                    .LineHeight(1.25f));

                // Sem page.Header()/page.Footer(): contato fica no fluxo principal do conteúdo.
                page.Content().Column(col =>
                {
                    col.Spacing(0);
                    RenderHeader(col, data.PersonalInfo);
                    RenderSummary(col, data.Summary);
                    RenderExperience(col, data.Experience);
                    RenderEducation(col, data.Education);
                    RenderSkills(col, data.Skills);
                    RenderLanguages(col, data.Languages);
                });
            });
        });

        document.WithMetadata(new DocumentMetadata
        {
            Title = string.IsNullOrEmpty(name) ? "Currículo" : $"{name} - Currículo",
            Author = name,
            Subject = "Currículo",
            Creator = "ATS Formatador",
            Producer = "ATS Formatador (QuestPDF)",
        });

        return document.GeneratePdf();
    }

    private static void RenderHeader(ColumnDescriptor col, PersonalInfo p)
    {
        col.Item().Text(Clean(p.FullName)).FontSize(NameFontSize).Bold();

        var contact = new[] { Clean(p.Email), Clean(p.Phone), Clean(p.Location) }
            .Where(s => s.Length > 0);
        var contactLine = string.Join("  |  ", contact);
        if (contactLine.Length > 0)
            col.Item().PaddingTop(4).Text(contactLine);

        var linkedin = Clean(p.Linkedin);
        if (linkedin.Length > 0)
            col.Item().PaddingTop(2).Text($"LinkedIn: {linkedin}");

        var github = Clean(p.Github);
        if (github.Length > 0)
            col.Item().PaddingTop(2).Text($"GitHub: {github}");
    }

    private static void RenderSummary(ColumnDescriptor col, string summary)
    {
        var text = CleanParagraph(summary);
        if (text.Length == 0)
            return;

        SectionTitle(col, SectionSummary);
        col.Item().Text(text);
    }

    private static void RenderExperience(ColumnDescriptor col, List<ExperienceItem> experience)
    {
        var items = experience.Where(e => Clean(e.Role).Length > 0 || Clean(e.Company).Length > 0).ToList();
        if (items.Count == 0)
            return;

        SectionTitle(col, SectionExperience);

        for (var i = 0; i < items.Count; i++)
        {
            var e = items[i];
            var block = col.Item();
            if (i > 0)
                block = block.PaddingTop(8);

            block.Column(item =>
            {
                var role = Clean(e.Role);
                var company = Clean(e.Company);
                var titleLine = string.Join(" - ", new[] { role, company }.Where(s => s.Length > 0));
                item.Item().Text(titleLine).Bold();

                var period = FormatPeriod(e.StartDate, e.EndDate);
                var location = Clean(e.Location);
                var metaLine = string.Join("  |  ", new[] { period, location }.Where(s => s.Length > 0));
                if (metaLine.Length > 0)
                    item.Item().Text(metaLine).FontSize(MetaFontSize).FontColor(Colors.Grey.Darken2);

                var bullets = e.Bullets.Select(CleanParagraph).Where(b => b.Length > 0).ToList();
                if (bullets.Count > 0)
                {
                    // PaddingLeft mantém o texto no fluxo; o bullet é parte do próprio parágrafo.
                    item.Item().PaddingTop(3).PaddingLeft(10).Column(bl =>
                    {
                        bl.Spacing(1.5f);
                        foreach (var bullet in bullets)
                            bl.Item().Text(BulletPrefix + bullet);
                    });
                }
            });
        }
    }

    private static void RenderEducation(ColumnDescriptor col, List<EducationItem> education)
    {
        var items = education.Where(e => Clean(e.Degree).Length > 0 || Clean(e.Institution).Length > 0).ToList();
        if (items.Count == 0)
            return;

        SectionTitle(col, SectionEducation);

        for (var i = 0; i < items.Count; i++)
        {
            var ed = items[i];
            var block = col.Item();
            if (i > 0)
                block = block.PaddingTop(6);

            block.Column(item =>
            {
                var degree = Clean(ed.Degree);
                var institution = Clean(ed.Institution);
                var titleLine = string.Join(" - ", new[] { degree, institution }.Where(s => s.Length > 0));
                item.Item().Text(titleLine).Bold();

                var period = FormatPeriod(ed.StartDate, ed.EndDate);
                if (period.Length > 0)
                    item.Item().Text(period).FontSize(MetaFontSize).FontColor(Colors.Grey.Darken2);
            });
        }
    }

    private static void RenderSkills(ColumnDescriptor col, List<string> skills)
    {
        var clean = skills.Select(Clean).Where(s => s.Length > 0).ToList();
        if (clean.Count == 0)
            return;

        SectionTitle(col, SectionSkills);
        // Lista em parágrafo único separado por vírgula: sem sidebar, sem colunas.
        col.Item().Text(string.Join(", ", clean));
    }

    private static void RenderLanguages(ColumnDescriptor col, List<LanguageItem> languages)
    {
        var clean = languages
            .Select(l => (Name: Clean(l.Name), Level: Clean(l.Level)))
            .Where(l => l.Name.Length > 0)
            .ToList();
        if (clean.Count == 0)
            return;

        SectionTitle(col, SectionLanguages);
        col.Item().Column(list =>
        {
            list.Spacing(1.5f);
            foreach (var l in clean)
                list.Item().Text(l.Level.Length > 0 ? $"{l.Name} - {l.Level}" : l.Name);
        });
    }

    private static void SectionTitle(ColumnDescriptor col, string title)
    {
        col.Item().PaddingTop(12).Text(title).FontSize(SectionFontSize).Bold();
        col.Item().PaddingTop(2).PaddingBottom(6).LineHorizontal(0.75f).LineColor(Colors.Grey.Darken1);
    }

    /// <summary>Converte YYYY-MM em MM/YYYY; vazio vira "Atual" quando é data de término.</summary>
    public static string FormatPeriod(string? start, string? end)
    {
        var startText = FormatYearMonth(start);
        var endText = string.IsNullOrWhiteSpace(end) ? PresentLabel : FormatYearMonth(end);

        if (startText.Length == 0 && string.IsNullOrWhiteSpace(end))
            return string.Empty;
        if (startText.Length == 0)
            return endText;

        return $"{startText} - {endText}";
    }

    public static string FormatYearMonth(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return string.Empty;

        return AtsValidator.TryParseYearMonth(value, out var date)
            ? date.ToString("MM/yyyy", CultureInfo.InvariantCulture)
            : value.Trim();
    }

    /// <summary>Texto de linha única: remove quebras e espaços duplicados.</summary>
    private static string Clean(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return string.Empty;
        return WhitespaceRegex().Replace(value, " ").Trim();
    }

    /// <summary>Parágrafo: preserva quebras de linha simples, normaliza o resto.</summary>
    private static string CleanParagraph(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return string.Empty;

        var lines = value.Replace("\r\n", "\n").Split('\n')
            .Select(l => WhitespaceRegex().Replace(l, " ").Trim())
            .Where(l => l.Length > 0);
        return string.Join("\n", lines);
    }

    [GeneratedRegex(@"[ \t\r\n\f\v]+")]
    private static partial Regex WhitespaceRegex();
}
