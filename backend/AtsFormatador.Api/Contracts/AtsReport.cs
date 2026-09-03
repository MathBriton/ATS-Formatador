namespace AtsFormatador.Api.Contracts;

public enum AtsSeverity
{
    Ok,
    Warning,
    Error,
}

/// <summary>Um item da checklist determinística (seção 7 do MVP).</summary>
public sealed record AtsCheckItem(string Code, AtsSeverity Severity, string Message);

public sealed record AtsReport(int Score, bool Passed, IReadOnlyList<AtsCheckItem> Items)
{
    public int Errors => Items.Count(i => i.Severity == AtsSeverity.Error);
    public int Warnings => Items.Count(i => i.Severity == AtsSeverity.Warning);
}
