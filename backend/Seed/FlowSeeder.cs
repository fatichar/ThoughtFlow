using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using ThoughtFlow.Api.Data;
using ThoughtFlow.Api.Data.Entities;

namespace ThoughtFlow.Api.Seed;

public sealed class FlowSeeder(ThoughtFlowDbContext dbContext, IWebHostEnvironment environment)
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public async Task<Flow> SeedVeganEthicsFlowAsync(CancellationToken cancellationToken)
    {
        var seedPath = Path.Combine(environment.ContentRootPath, "Seed", "vegan-ethics-flow.json");
        await using var stream = File.OpenRead(seedPath);
        var seed = await JsonSerializer.DeserializeAsync<SeedFlow>(stream, JsonOptions, cancellationToken)
            ?? throw new InvalidOperationException("Could not read vegan ethics seed flow.");

        var now = DateTimeOffset.UtcNow;
        var flowJson = JsonDocument.Parse(seed.Flow.GetRawText());
        var existing = await dbContext.Flows.SingleOrDefaultAsync(
            flow => flow.Slug == seed.Slug,
            cancellationToken);

        if (existing is null)
        {
            var flow = new Flow
            {
                Id = Guid.NewGuid(),
                Slug = seed.Slug,
                Title = seed.Title,
                Description = seed.Description,
                FlowJson = flowJson,
                IsPublished = seed.IsPublished,
                CreatedAt = now,
                UpdatedAt = now,
            };

            dbContext.Flows.Add(flow);
            await dbContext.SaveChangesAsync(cancellationToken);
            return flow;
        }

        existing.Title = seed.Title;
        existing.Description = seed.Description;
        existing.FlowJson = flowJson;
        existing.IsPublished = seed.IsPublished;
        existing.UpdatedAt = now;

        await dbContext.SaveChangesAsync(cancellationToken);
        return existing;
    }
}
