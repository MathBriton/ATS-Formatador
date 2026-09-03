using AtsFormatador.Api.Contracts;
using AtsFormatador.Api.Services;

namespace AtsFormatador.Tests;

public class AtsValidatorTests
{
    private readonly AtsValidator _validator = new();

    [Fact]
    public void ValidResume_PassesWithFullScore()
    {
        var report = _validator.Validate(SampleResumes.Valid());

        Assert.True(report.Passed);
        Assert.Equal(100, report.Score);
        Assert.Equal(0, report.Errors);
        Assert.Equal(0, report.Warnings);
    }

    [Fact]
    public void MissingRequiredContactFields_AreErrors()
    {
        var data = SampleResumes.Valid();
        data.PersonalInfo.FullName = "";
        data.PersonalInfo.Email = "";
        data.PersonalInfo.Phone = "   ";

        var report = _validator.Validate(data);

        Assert.False(report.Passed);
        Assert.Contains(report.Items, i => i.Code == "personal.fullName.required" && i.Severity == AtsSeverity.Error);
        Assert.Contains(report.Items, i => i.Code == "personal.email.required" && i.Severity == AtsSeverity.Error);
        Assert.Contains(report.Items, i => i.Code == "personal.phone.required" && i.Severity == AtsSeverity.Error);
        Assert.Equal(100 - 3 * 15, report.Score);
    }

    [Fact]
    public void InvalidEmail_IsError()
    {
        var data = SampleResumes.Valid();
        data.PersonalInfo.Email = "nao-e-email";

        var report = _validator.Validate(data);

        Assert.Contains(report.Items, i => i.Code == "personal.email.format" && i.Severity == AtsSeverity.Error);
    }

    [Fact]
    public void ExperienceWithoutBullets_IsWarning()
    {
        var data = SampleResumes.Valid();
        data.Experience[0].Bullets = ["", "   "];

        var report = _validator.Validate(data);

        Assert.True(report.Passed);
        Assert.Contains(report.Items, i => i.Code == "experience[0].bullets.empty" && i.Severity == AtsSeverity.Warning);
    }

    [Theory]
    [InlineData("2021-13")]
    [InlineData("03/2021")]
    [InlineData("2021")]
    [InlineData("abc")]
    public void BadStartDateFormat_IsError(string date)
    {
        var data = SampleResumes.Valid();
        data.Experience[0].StartDate = date;

        var report = _validator.Validate(data);

        Assert.Contains(report.Items, i => i.Code == "experience[0].startDate.format" && i.Severity == AtsSeverity.Error);
    }

    [Fact]
    public void EndDateBeforeStart_IsWarning()
    {
        var data = SampleResumes.Valid();
        data.Experience[1].StartDate = "2021-02";
        data.Experience[1].EndDate = "2018-01";

        var report = _validator.Validate(data);

        Assert.Contains(report.Items, i => i.Code == "experience[1].dates.order" && i.Severity == AtsSeverity.Warning);
    }

    [Fact]
    public void NullEndDate_MeansCurrent_NoIssue()
    {
        var data = SampleResumes.Valid();
        data.Experience[0].EndDate = null;

        var report = _validator.Validate(data);

        Assert.DoesNotContain(report.Items, i => i.Code.StartsWith("experience[0].endDate"));
    }

    [Theory]
    [InlineData("")]
    [InlineData("Curto demais.")]
    public void SummaryOutsideRange_IsWarning(string summary)
    {
        var data = SampleResumes.Valid();
        data.Summary = summary;

        var report = _validator.Validate(data);

        Assert.Contains(report.Items, i => i.Code.StartsWith("summary.") && i.Severity == AtsSeverity.Warning);
    }

    [Fact]
    public void EmojiInBullet_IsWarning()
    {
        var data = SampleResumes.Valid();
        data.Experience[0].Bullets[0] = "🚀 Entreguei o projeto no prazo";

        var report = _validator.Validate(data);

        Assert.Contains(report.Items, i => i.Code == "experience[0].bullets[0].glyphs" && i.Severity == AtsSeverity.Warning);
    }

    [Fact]
    public void OverlongBullet_IsWarning()
    {
        var data = SampleResumes.Valid();
        data.Experience[0].Bullets[0] = new string('a', AtsValidator.BulletMaxChars + 1);

        var report = _validator.Validate(data);

        Assert.Contains(report.Items, i => i.Code == "experience[0].bullets[0].length" && i.Severity == AtsSeverity.Warning);
    }

    [Fact]
    public void FewSkills_IsWarning()
    {
        var data = SampleResumes.Valid();
        data.Skills = ["C#"];

        var report = _validator.Validate(data);

        Assert.Contains(report.Items, i => i.Code == "skills.few" && i.Severity == AtsSeverity.Warning);
    }

    [Fact]
    public void ScoreNeverGoesBelowZero()
    {
        var report = _validator.Validate(new ResumeData
        {
            Experience = Enumerable.Range(0, 10).Select(_ => new ExperienceItem()).ToList(),
        });

        Assert.Equal(0, report.Score);
        Assert.False(report.Passed);
    }
}
