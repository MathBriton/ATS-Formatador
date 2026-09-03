namespace AtsFormatador.Api.Models;

public sealed class User
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }

    public List<Resume> Resumes { get; set; } = [];
}
