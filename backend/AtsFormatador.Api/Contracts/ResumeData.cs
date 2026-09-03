namespace AtsFormatador.Api.Contracts;

/// <summary>
/// Contrato JSON entre o formulário e o gerador de PDF (seção 5 do MVP).
/// Regra chave: nenhum campo é HTML rico — tudo é texto puro estruturado.
/// </summary>
public sealed class ResumeData
{
    public PersonalInfo PersonalInfo { get; set; } = new();
    public string Summary { get; set; } = string.Empty;
    public List<ExperienceItem> Experience { get; set; } = [];
    public List<EducationItem> Education { get; set; } = [];
    public List<string> Skills { get; set; } = [];
    public List<LanguageItem> Languages { get; set; } = [];
}

public sealed class PersonalInfo
{
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string? Linkedin { get; set; }
    public string? Github { get; set; }
}

public sealed class ExperienceItem
{
    public string Company { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    /// <summary>YYYY-MM</summary>
    public string StartDate { get; set; } = string.Empty;
    /// <summary>YYYY-MM ou null (atual)</summary>
    public string? EndDate { get; set; }
    public string Location { get; set; } = string.Empty;
    public List<string> Bullets { get; set; } = [];
}

public sealed class EducationItem
{
    public string Institution { get; set; } = string.Empty;
    public string Degree { get; set; } = string.Empty;
    public string StartDate { get; set; } = string.Empty;
    public string? EndDate { get; set; }
}

public sealed class LanguageItem
{
    public string Name { get; set; } = string.Empty;
    public string Level { get; set; } = string.Empty;
}
