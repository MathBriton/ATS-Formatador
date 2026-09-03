using System.ComponentModel.DataAnnotations;

namespace AtsFormatador.Api.Contracts;

public sealed record RegisterRequest(
    [Required, EmailAddress, MaxLength(256)] string Email,
    [Required, MinLength(6), MaxLength(128)] string Password);

public sealed record LoginRequest(
    [Required, EmailAddress] string Email,
    [Required] string Password);

public sealed record AuthResponse(string Token, string Email, DateTime ExpiresAtUtc);
