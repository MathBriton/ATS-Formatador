using System.ComponentModel.DataAnnotations;

namespace AtsFormatador.Api.Contracts;

public sealed record ResumeSummaryDto(Guid Id, string Title, DateTime CreatedAtUtc, DateTime UpdatedAtUtc);

public sealed record ResumeDetailDto(Guid Id, string Title, ResumeData Data, DateTime CreatedAtUtc, DateTime UpdatedAtUtc);

public sealed record SaveResumeRequest(
    [Required, MaxLength(120)] string Title,
    [Required] ResumeData Data);

public sealed record DuplicateResumeRequest([MaxLength(120)] string? Title);
