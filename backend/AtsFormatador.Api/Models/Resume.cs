namespace AtsFormatador.Api.Models;

/// <summary>
/// Uma versão de currículo. O conteúdo é o JSON do contrato (ResumeData),
/// armazenado como texto para manter o contrato como única fonte de verdade.
/// </summary>
public sealed class Resume
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string DataJson { get; set; } = "{}";
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }

    public User? User { get; set; }
}
