using AtsFormatador.Api.Contracts;

namespace AtsFormatador.Tests;

internal static class SampleResumes
{
    public static ResumeData Valid() => new()
    {
        PersonalInfo = new PersonalInfo
        {
            FullName = "Maria Oliveira Santos",
            Email = "maria.santos@example.com",
            Phone = "+55 11 91234-5678",
            Location = "São Paulo, Brasil",
            Linkedin = "https://linkedin.com/in/maria-santos",
            Github = "https://github.com/mariasantos",
        },
        Summary = "Desenvolvedora full stack com 6 anos de experiência em .NET e React, atuando em produtos SaaS " +
                  "de alta escala. Especialista em APIs REST, bancos SQL Server e pipelines de CI/CD. " +
                  "Foco em código limpo, testes automatizados e entrega contínua de valor para o negócio.",
        Experience =
        [
            new ExperienceItem
            {
                Company = "Acme Tecnologia",
                Role = "Desenvolvedora Sênior",
                StartDate = "2021-03",
                EndDate = null,
                Location = "Remoto",
                Bullets =
                [
                    "Liderei a migração de monolito .NET Framework para .NET 8, reduzindo custos de infraestrutura em 30%.",
                    "Implementei pipeline de CI/CD com GitHub Actions, cortando o tempo de deploy de 2 horas para 15 minutos.",
                ],
            },
            new ExperienceItem
            {
                Company = "Beta Sistemas",
                Role = "Desenvolvedora Pleno",
                StartDate = "2018-01",
                EndDate = "2021-02",
                Location = "São Paulo, Brasil",
                Bullets = ["Desenvolvi módulos de faturamento em C# e React utilizados por 200 clientes."],
            },
        ],
        Education =
        [
            new EducationItem
            {
                Institution = "Universidade de São Paulo",
                Degree = "Bacharelado em Ciência da Computação",
                StartDate = "2013-02",
                EndDate = "2017-12",
            },
        ],
        Skills = ["C#", ".NET", "React", "TypeScript", "SQL Server", "Azure"],
        Languages =
        [
            new LanguageItem { Name = "Português", Level = "Nativo" },
            new LanguageItem { Name = "Inglês", Level = "Avançado" },
        ],
    };
}
