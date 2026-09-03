using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using AtsFormatador.Api.Models;
using Microsoft.IdentityModel.Tokens;

namespace AtsFormatador.Api.Services;

public sealed class JwtOptions
{
    public const string SectionName = "Jwt";
    public string Key { get; set; } = string.Empty;
    public string Issuer { get; set; } = "AtsFormatador";
    public string Audience { get; set; } = "AtsFormatador";
    public int ExpirationDays { get; set; } = 7;
}

public sealed class TokenService(JwtOptions options)
{
    public (string Token, DateTime ExpiresAtUtc) CreateToken(User user)
    {
        var expires = DateTime.UtcNow.AddDays(options.ExpirationDays);
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(options.Key));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
        };

        var token = new JwtSecurityToken(
            issuer: options.Issuer,
            audience: options.Audience,
            claims: claims,
            expires: expires,
            signingCredentials: creds);

        return (new JwtSecurityTokenHandler().WriteToken(token), expires);
    }
}
