using AtsFormatador.Api.Contracts;
using AtsFormatador.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AtsFormatador.Api.Controllers;

/// <summary>
/// Endpoints stateless: recebem o contrato JSON direto do formulário,
/// permitindo validar e gerar PDF de edições ainda não salvas.
/// </summary>
[ApiController]
[Authorize]
[Route("api/ats")]
public sealed class AtsController(AtsValidator validator, ResumePdfGenerator pdfGenerator) : ControllerBase
{
    [HttpPost("validate")]
    public ActionResult<AtsReport> Validate(ResumeData data) => Ok(validator.Validate(data));

    [HttpPost("pdf")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType<AtsReport>(StatusCodes.Status422UnprocessableEntity)]
    public IActionResult Pdf(ResumeData data)
    {
        var report = validator.Validate(data);
        if (!report.Passed)
            return UnprocessableEntity(report);

        var bytes = pdfGenerator.Generate(data);
        return File(bytes, "application/pdf", ResumesController.BuildFileName(data, null));
    }
}
