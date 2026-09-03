using System.Security.Claims;
using System.Text.Json;
using AtsFormatador.Api.Contracts;
using AtsFormatador.Api.Data;
using AtsFormatador.Api.Models;
using AtsFormatador.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AtsFormatador.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/resumes")]
public sealed class ResumesController(
    AppDbContext db,
    AtsValidator validator,
    ResumePdfGenerator pdfGenerator) : ControllerBase
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ResumeSummaryDto>>> List(CancellationToken ct)
    {
        var userId = CurrentUserId();
        var items = await db.Resumes
            .Where(r => r.UserId == userId)
            .OrderByDescending(r => r.UpdatedAtUtc)
            .Select(r => new ResumeSummaryDto(r.Id, r.Title, r.CreatedAtUtc, r.UpdatedAtUtc))
            .ToListAsync(ct);

        return Ok(items);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ResumeDetailDto>> Get(Guid id, CancellationToken ct)
    {
        var resume = await FindOwnedAsync(id, ct);
        return resume is null ? NotFound() : Ok(ToDetail(resume));
    }

    [HttpPost]
    public async Task<ActionResult<ResumeDetailDto>> Create(SaveResumeRequest request, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var resume = new Resume
        {
            Id = Guid.NewGuid(),
            UserId = CurrentUserId(),
            Title = request.Title.Trim(),
            DataJson = JsonSerializer.Serialize(request.Data, JsonOptions),
            CreatedAtUtc = now,
            UpdatedAtUtc = now,
        };

        db.Resumes.Add(resume);
        await db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(Get), new { id = resume.Id }, ToDetail(resume));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ResumeDetailDto>> Update(Guid id, SaveResumeRequest request, CancellationToken ct)
    {
        var resume = await FindOwnedAsync(id, ct);
        if (resume is null)
            return NotFound();

        resume.Title = request.Title.Trim();
        resume.DataJson = JsonSerializer.Serialize(request.Data, JsonOptions);
        resume.UpdatedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        return Ok(ToDetail(resume));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var resume = await FindOwnedAsync(id, ct);
        if (resume is null)
            return NotFound();

        db.Resumes.Remove(resume);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    /// <summary>Duplica um currículo para adaptá-lo a outra vaga (fluxo 6 do MVP).</summary>
    [HttpPost("{id:guid}/duplicate")]
    public async Task<ActionResult<ResumeDetailDto>> Duplicate(Guid id, DuplicateResumeRequest? request, CancellationToken ct)
    {
        var source = await FindOwnedAsync(id, ct);
        if (source is null)
            return NotFound();

        var now = DateTime.UtcNow;
        var copy = new Resume
        {
            Id = Guid.NewGuid(),
            UserId = source.UserId,
            Title = string.IsNullOrWhiteSpace(request?.Title) ? $"{source.Title} (cópia)" : request.Title.Trim(),
            DataJson = source.DataJson,
            CreatedAtUtc = now,
            UpdatedAtUtc = now,
        };

        db.Resumes.Add(copy);
        await db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(Get), new { id = copy.Id }, ToDetail(copy));
    }

    [HttpGet("{id:guid}/ats")]
    public async Task<ActionResult<AtsReport>> Validate(Guid id, CancellationToken ct)
    {
        var resume = await FindOwnedAsync(id, ct);
        if (resume is null)
            return NotFound();

        return Ok(validator.Validate(Deserialize(resume.DataJson)));
    }

    /// <summary>Gera o PDF da versão salva. Bloqueia se a checklist ATS tiver erros.</summary>
    [HttpGet("{id:guid}/pdf")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType<AtsReport>(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Pdf(Guid id, CancellationToken ct)
    {
        var resume = await FindOwnedAsync(id, ct);
        if (resume is null)
            return NotFound();

        var data = Deserialize(resume.DataJson);
        var report = validator.Validate(data);
        if (!report.Passed)
            return UnprocessableEntity(report);

        var bytes = pdfGenerator.Generate(data);
        return File(bytes, "application/pdf", BuildFileName(data, resume.Title));
    }

    public static string BuildFileName(ResumeData data, string? title)
    {
        var baseName = string.IsNullOrWhiteSpace(data.PersonalInfo.FullName) ? (title ?? "curriculo") : data.PersonalInfo.FullName;
        var safe = new string(baseName.Trim().Select(c => char.IsLetterOrDigit(c) ? c : '-').ToArray()).Trim('-');
        return $"{(safe.Length == 0 ? "curriculo" : safe)}-curriculo.pdf";
    }

    private Guid CurrentUserId()
    {
        var sub = User.FindFirstValue("sub") ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(sub, out var id) ? id : throw new UnauthorizedAccessException("Token sem identificador de usuário.");
    }

    private Task<Resume?> FindOwnedAsync(Guid id, CancellationToken ct)
    {
        var userId = CurrentUserId();
        return db.Resumes.SingleOrDefaultAsync(r => r.Id == id && r.UserId == userId, ct);
    }

    private static ResumeDetailDto ToDetail(Resume r) =>
        new(r.Id, r.Title, Deserialize(r.DataJson), r.CreatedAtUtc, r.UpdatedAtUtc);

    private static ResumeData Deserialize(string json) =>
        JsonSerializer.Deserialize<ResumeData>(json, JsonOptions) ?? new ResumeData();
}
