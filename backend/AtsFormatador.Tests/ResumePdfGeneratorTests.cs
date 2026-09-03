using AtsFormatador.Api.Services;
using QuestPDF.Infrastructure;
using UglyToad.PdfPig;
using UglyToad.PdfPig.DocumentLayoutAnalysis.TextExtractor;

namespace AtsFormatador.Tests;

/// <summary>
/// Critério de sucesso do MVP (seção 10): o texto extraído do PDF deve preservar
/// conteúdo e ordem de leitura. Aqui simulamos a extração que um parser ATS faria.
/// </summary>
public class ResumePdfGeneratorTests
{
    private readonly ResumePdfGenerator _generator = new();

    static ResumePdfGeneratorTests()
    {
        QuestPDF.Settings.License = LicenseType.Community;
    }

    /// <summary>
    /// Extrai o texto na ordem do content stream (como um parser ATS faria) e normaliza
    /// espaços/quebras de linha: quebras por largura de página são esperadas em qualquer PDF.
    /// </summary>
    private static string ExtractText(byte[] pdf)
    {
        using var doc = PdfDocument.Open(pdf);
        var pages = doc.GetPages().Select(p => ContentOrderTextExtractor.GetText(p));
        return System.Text.RegularExpressions.Regex.Replace(string.Join("\n", pages), @"\s+", " ");
    }

    [Fact]
    public void Generate_ProducesNonEmptyPdf()
    {
        var bytes = _generator.Generate(SampleResumes.Valid());

        Assert.NotEmpty(bytes);
        Assert.Equal("%PDF", System.Text.Encoding.ASCII.GetString(bytes, 0, 4));
    }

    [Fact]
    public void ExtractedText_ContainsAllContactData_AsPlainText()
    {
        var data = SampleResumes.Valid();
        var text = ExtractText(_generator.Generate(data));

        Assert.Contains(data.PersonalInfo.FullName, text);
        Assert.Contains(data.PersonalInfo.Email, text);
        Assert.Contains(data.PersonalInfo.Phone, text);
        Assert.Contains(data.PersonalInfo.Location, text);
        Assert.Contains(data.PersonalInfo.Linkedin!, text);
        Assert.Contains(data.PersonalInfo.Github!, text);
    }

    [Fact]
    public void ExtractedText_PreservesSectionOrder()
    {
        var text = ExtractText(_generator.Generate(SampleResumes.Valid()));

        var positions = new[]
        {
            text.IndexOf("Maria Oliveira Santos", StringComparison.Ordinal),
            text.IndexOf(ResumePdfGenerator.SectionSummary, StringComparison.Ordinal),
            text.IndexOf(ResumePdfGenerator.SectionExperience, StringComparison.Ordinal),
            text.IndexOf(ResumePdfGenerator.SectionEducation, StringComparison.Ordinal),
            text.IndexOf(ResumePdfGenerator.SectionSkills, StringComparison.Ordinal),
            text.IndexOf(ResumePdfGenerator.SectionLanguages, StringComparison.Ordinal),
        };

        Assert.All(positions, p => Assert.True(p >= 0, "Título de seção ausente no texto extraído."));
        for (var i = 1; i < positions.Length; i++)
            Assert.True(positions[i] > positions[i - 1], $"Seção {i} fora de ordem.");
    }

    [Fact]
    public void ExtractedText_PreservesExperienceOrder_AndBullets()
    {
        var data = SampleResumes.Valid();
        var text = ExtractText(_generator.Generate(data));

        var first = text.IndexOf(data.Experience[0].Role, StringComparison.Ordinal);
        var second = text.IndexOf(data.Experience[1].Role, StringComparison.Ordinal);
        Assert.True(first >= 0 && second > first, "Experiências fora da ordem informada.");

        foreach (var bullet in data.Experience.SelectMany(e => e.Bullets))
            Assert.Contains(bullet, text);

        Assert.Contains(ResumePdfGenerator.BulletPrefix.Trim(), text);
    }

    [Fact]
    public void Dates_AreFormattedAsMonthSlashYear()
    {
        var text = ExtractText(_generator.Generate(SampleResumes.Valid()));

        Assert.Contains("03/2021 - " + ResumePdfGenerator.PresentLabel, text);
        Assert.Contains("01/2018 - 02/2021", text);
        Assert.Contains("02/2013 - 12/2017", text);
        Assert.DoesNotContain("2021-03", text);
    }

    [Fact]
    public void Skills_AreRenderedAsCommaSeparatedParagraph()
    {
        var data = SampleResumes.Valid();
        var text = ExtractText(_generator.Generate(data));

        Assert.Contains(string.Join(", ", data.Skills), text);
    }

    [Fact]
    public void Metadata_UsesCandidateName()
    {
        using var doc = PdfDocument.Open(_generator.Generate(SampleResumes.Valid()));

        Assert.Contains("Maria Oliveira Santos", doc.Information.Title);
        Assert.Equal("Maria Oliveira Santos", doc.Information.Author);
    }

    [Fact]
    public void Fonts_AreEmbedded()
    {
        using var doc = PdfDocument.Open(_generator.Generate(SampleResumes.Valid()));
        var page = doc.GetPage(1);

        Assert.NotEmpty(page.Letters);
        // Todo texto deve vir de fontes reais (não rasterizado) e o glifo deve ser recuperável.
        Assert.All(page.Letters, l => Assert.False(string.IsNullOrEmpty(l.FontName)));
    }

    [Fact]
    public void EmptySections_AreOmitted()
    {
        var data = SampleResumes.Valid();
        data.Languages = [];
        data.Skills = [];

        var text = ExtractText(_generator.Generate(data));

        Assert.DoesNotContain(ResumePdfGenerator.SectionLanguages, text);
        Assert.DoesNotContain(ResumePdfGenerator.SectionSkills, text);
    }

    [Theory]
    [InlineData("2021-03", null, "03/2021 - Atual")]
    [InlineData("2018-01", "2021-02", "01/2018 - 02/2021")]
    [InlineData("", null, "")]
    [InlineData("", "2021-02", "02/2021")]
    public void FormatPeriod_Cases(string start, string? end, string expected)
    {
        Assert.Equal(expected, ResumePdfGenerator.FormatPeriod(start, end));
    }
}
