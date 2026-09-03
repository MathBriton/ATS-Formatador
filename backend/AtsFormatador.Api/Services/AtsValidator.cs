using System.Globalization;
using System.Text.RegularExpressions;
using AtsFormatador.Api.Contracts;

namespace AtsFormatador.Api.Services;

/// <summary>
/// Checklist determinística de compatibilidade ATS (seção 7 do MVP).
/// Não é IA: são regras fixas. O frontend espelha as mesmas regras em
/// tempo real; o backend é a autoridade final antes de gerar o PDF.
/// </summary>
public sealed partial class AtsValidator
{
    public const int SummaryMinChars = 200;
    public const int SummaryMaxChars = 600;
    public const int FullNameMaxChars = 80;
    public const int ShortFieldMaxChars = 100;
    public const int BulletMaxChars = 300;
    public const int SkillMaxChars = 40;
    public const int MinSkills = 3;
    public const int MaxBulletsPerExperience = 8;

    private const int ErrorPenalty = 15;
    private const int WarningPenalty = 5;

    public AtsReport Validate(ResumeData data)
    {
        var items = new List<AtsCheckItem>();

        ValidatePersonalInfo(data.PersonalInfo, items);
        ValidateSummary(data.Summary, items);
        ValidateExperience(data.Experience, items);
        ValidateEducation(data.Education, items);
        ValidateSkills(data.Skills, items);
        ValidateLanguages(data.Languages, items);

        var errors = items.Count(i => i.Severity == AtsSeverity.Error);
        var warnings = items.Count(i => i.Severity == AtsSeverity.Warning);
        var score = Math.Clamp(100 - errors * ErrorPenalty - warnings * WarningPenalty, 0, 100);

        return new AtsReport(score, errors == 0, items);
    }

    private static void ValidatePersonalInfo(PersonalInfo p, List<AtsCheckItem> items)
    {
        if (string.IsNullOrWhiteSpace(p.FullName))
            items.Add(Error("personal.fullName.required", "Nome completo é obrigatório."));
        else if (p.FullName.Trim().Length > FullNameMaxChars)
            items.Add(Warn("personal.fullName.length", $"Nome com mais de {FullNameMaxChars} caracteres pode quebrar de forma estranha."));
        else
            items.Add(Ok("personal.fullName", "Nome completo preenchido."));

        if (string.IsNullOrWhiteSpace(p.Email))
            items.Add(Error("personal.email.required", "E-mail é obrigatório."));
        else if (!EmailRegex().IsMatch(p.Email.Trim()))
            items.Add(Error("personal.email.format", "E-mail em formato inválido."));
        else
            items.Add(Ok("personal.email", "E-mail preenchido."));

        if (string.IsNullOrWhiteSpace(p.Phone))
            items.Add(Error("personal.phone.required", "Telefone é obrigatório."));
        else if (!PhoneRegex().IsMatch(p.Phone.Trim()))
            items.Add(Warn("personal.phone.format", "Telefone deve conter apenas dígitos, espaços, +, ( ) e -."));
        else
            items.Add(Ok("personal.phone", "Telefone preenchido."));

        if (string.IsNullOrWhiteSpace(p.Location))
            items.Add(Warn("personal.location.missing", "Informe cidade e país: muitos ATS filtram por localização."));

        if (!string.IsNullOrWhiteSpace(p.Linkedin) && !UrlRegex().IsMatch(p.Linkedin.Trim()))
            items.Add(Warn("personal.linkedin.format", "LinkedIn deve ser uma URL (ex.: https://linkedin.com/in/seu-nome)."));

        if (!string.IsNullOrWhiteSpace(p.Github) && !UrlRegex().IsMatch(p.Github.Trim()))
            items.Add(Warn("personal.github.format", "GitHub deve ser uma URL (ex.: https://github.com/seu-usuario)."));
    }

    private static void ValidateSummary(string summary, List<AtsCheckItem> items)
    {
        var len = (summary ?? string.Empty).Trim().Length;
        if (len == 0)
            items.Add(Warn("summary.missing", "Resumo profissional vazio. Recomendado: 3 a 5 linhas com cargo, área e principais competências."));
        else if (len < SummaryMinChars)
            items.Add(Warn("summary.short", $"Resumo curto ({len} caracteres). Recomendado entre {SummaryMinChars} e {SummaryMaxChars}."));
        else if (len > SummaryMaxChars)
            items.Add(Warn("summary.long", $"Resumo longo ({len} caracteres). Recomendado entre {SummaryMinChars} e {SummaryMaxChars}."));
        else
            items.Add(Ok("summary", "Resumo profissional com tamanho adequado."));
    }

    private static void ValidateExperience(List<ExperienceItem> experience, List<AtsCheckItem> items)
    {
        if (experience.Count == 0)
        {
            items.Add(Warn("experience.empty", "Nenhuma experiência profissional informada."));
            return;
        }

        for (var i = 0; i < experience.Count; i++)
        {
            var e = experience[i];
            var label = string.IsNullOrWhiteSpace(e.Role) ? $"Experiência #{i + 1}" : e.Role.Trim();
            var prefix = $"experience[{i}]";

            if (string.IsNullOrWhiteSpace(e.Company))
                items.Add(Error($"{prefix}.company.required", $"{label}: empresa é obrigatória."));
            else if (e.Company.Trim().Length > ShortFieldMaxChars)
                items.Add(Warn($"{prefix}.company.length", $"{label}: nome da empresa muito longo (máx. {ShortFieldMaxChars})."));

            if (string.IsNullOrWhiteSpace(e.Role))
                items.Add(Error($"{prefix}.role.required", $"Experiência #{i + 1}: cargo é obrigatório."));
            else if (e.Role.Trim().Length > ShortFieldMaxChars)
                items.Add(Warn($"{prefix}.role.length", $"{label}: cargo muito longo (máx. {ShortFieldMaxChars})."));

            ValidateDateRange(prefix, label, e.StartDate, e.EndDate, items);

            var bullets = e.Bullets.Where(b => !string.IsNullOrWhiteSpace(b)).ToList();
            if (bullets.Count == 0)
                items.Add(Warn($"{prefix}.bullets.empty", $"{label}: adicione pelo menos 1 bullet com resultado/responsabilidade."));
            else if (bullets.Count > MaxBulletsPerExperience)
                items.Add(Warn($"{prefix}.bullets.many", $"{label}: muitos bullets ({bullets.Count}). Recomendado até {MaxBulletsPerExperience}."));
            else
                items.Add(Ok($"{prefix}.bullets", $"{label}: {bullets.Count} bullet(s)."));

            for (var b = 0; b < bullets.Count; b++)
            {
                if (bullets[b].Trim().Length > BulletMaxChars)
                    items.Add(Warn($"{prefix}.bullets[{b}].length", $"{label}: bullet #{b + 1} com mais de {BulletMaxChars} caracteres."));
                if (ContainsRiskyGlyphs(bullets[b]))
                    items.Add(Warn($"{prefix}.bullets[{b}].glyphs", $"{label}: bullet #{b + 1} contém emoji/símbolos que parsers ATS podem não ler."));
            }
        }
    }

    private static void ValidateEducation(List<EducationItem> education, List<AtsCheckItem> items)
    {
        if (education.Count == 0)
        {
            items.Add(Warn("education.empty", "Nenhuma formação informada."));
            return;
        }

        for (var i = 0; i < education.Count; i++)
        {
            var ed = education[i];
            var label = string.IsNullOrWhiteSpace(ed.Degree) ? $"Formação #{i + 1}" : ed.Degree.Trim();
            var prefix = $"education[{i}]";

            if (string.IsNullOrWhiteSpace(ed.Institution))
                items.Add(Error($"{prefix}.institution.required", $"{label}: instituição é obrigatória."));
            if (string.IsNullOrWhiteSpace(ed.Degree))
                items.Add(Error($"{prefix}.degree.required", $"Formação #{i + 1}: curso/grau é obrigatório."));

            ValidateDateRange(prefix, label, ed.StartDate, ed.EndDate, items);
        }
    }

    private static void ValidateSkills(List<string> skills, List<AtsCheckItem> items)
    {
        var clean = skills.Where(s => !string.IsNullOrWhiteSpace(s)).Select(s => s.Trim()).ToList();
        if (clean.Count == 0)
            items.Add(Warn("skills.empty", "Nenhuma habilidade informada. ATS costumam casar palavras-chave desta seção com a vaga."));
        else if (clean.Count < MinSkills)
            items.Add(Warn("skills.few", $"Poucas habilidades ({clean.Count}). Recomendado pelo menos {MinSkills}."));
        else
            items.Add(Ok("skills", $"{clean.Count} habilidades informadas."));

        for (var i = 0; i < clean.Count; i++)
        {
            if (clean[i].Length > SkillMaxChars)
                items.Add(Warn($"skills[{i}].length", $"Habilidade \"{clean[i]}\" muito longa (máx. {SkillMaxChars}). Prefira palavras-chave curtas."));
        }
    }

    private static void ValidateLanguages(List<LanguageItem> languages, List<AtsCheckItem> items)
    {
        for (var i = 0; i < languages.Count; i++)
        {
            var l = languages[i];
            if (string.IsNullOrWhiteSpace(l.Name))
                items.Add(Error($"languages[{i}].name.required", $"Idioma #{i + 1}: nome é obrigatório."));
            if (string.IsNullOrWhiteSpace(l.Level))
                items.Add(Warn($"languages[{i}].level.missing", $"Idioma #{i + 1}: informe o nível (ex.: Básico, Intermediário, Avançado, Fluente)."));
        }
    }

    private static void ValidateDateRange(string prefix, string label, string? start, string? end, List<AtsCheckItem> items)
    {
        var startOk = TryParseYearMonth(start, out var startDate);
        if (!startOk)
            items.Add(Error($"{prefix}.startDate.format", $"{label}: data de início deve estar no formato AAAA-MM."));

        if (string.IsNullOrWhiteSpace(end))
            return;

        if (!TryParseYearMonth(end, out var endDate))
        {
            items.Add(Error($"{prefix}.endDate.format", $"{label}: data de término deve estar no formato AAAA-MM ou vazia (atual)."));
            return;
        }

        if (startOk && endDate < startDate)
            items.Add(Warn($"{prefix}.dates.order", $"{label}: data de término anterior à data de início."));
    }

    public static bool TryParseYearMonth(string? value, out DateTime result)
    {
        result = default;
        if (string.IsNullOrWhiteSpace(value) || !YearMonthRegex().IsMatch(value.Trim()))
            return false;

        return DateTime.TryParseExact(value.Trim(), "yyyy-MM", CultureInfo.InvariantCulture, DateTimeStyles.None, out result);
    }

    /// <summary>
    /// Emoji e símbolos fora do BMP costumam virar "?" ou lixo em extratores de texto.
    /// </summary>
    public static bool ContainsRiskyGlyphs(string text)
    {
        foreach (var ch in text)
        {
            if (char.IsSurrogate(ch))
                return true;
            var cat = CharUnicodeInfo.GetUnicodeCategory(ch);
            if (cat is UnicodeCategory.OtherSymbol or UnicodeCategory.PrivateUse)
                return true;
        }
        return false;
    }

    private static AtsCheckItem Ok(string code, string message) => new(code, AtsSeverity.Ok, message);
    private static AtsCheckItem Warn(string code, string message) => new(code, AtsSeverity.Warning, message);
    private static AtsCheckItem Error(string code, string message) => new(code, AtsSeverity.Error, message);

    [GeneratedRegex(@"^[^@\s]+@[^@\s]+\.[^@\s]+$")]
    private static partial Regex EmailRegex();

    [GeneratedRegex(@"^\+?[\d\s()\-]{8,20}$")]
    private static partial Regex PhoneRegex();

    [GeneratedRegex(@"^(https?://)?([\w\-]+\.)+[\w\-]+(/[^\s]*)?$", RegexOptions.IgnoreCase)]
    private static partial Regex UrlRegex();

    [GeneratedRegex(@"^\d{4}-(0[1-9]|1[0-2])$")]
    private static partial Regex YearMonthRegex();
}
