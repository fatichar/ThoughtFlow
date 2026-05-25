using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using ThoughtFlow.Api.Contracts;
using ThoughtFlow.Api.Data;
using ThoughtFlow.Api.Data.Entities;
using ThoughtFlow.Api.Seed;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Missing ConnectionStrings:DefaultConnection.");

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        var origins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
            ?? ["http://localhost:5173", "http://127.0.0.1:5173"];

        policy
            .WithOrigins(origins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

builder.Services.AddDbContext<ThoughtFlowDbContext>(options =>
    options.UseNpgsql(connectionString));
builder.Services.AddScoped<FlowSeeder>();

var app = builder.Build();

if (app.Configuration.GetValue("Database:EnsureCreated", false))
{
    await using var scope = app.Services.CreateAsyncScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<ThoughtFlowDbContext>();
    await dbContext.Database.EnsureCreatedAsync();
}

app.UseCors("Frontend");

app.MapGet("/api/health", () => Results.Ok(new
{
    ok = true,
    service = "thoughtflow-api",
    timestamp = DateTimeOffset.UtcNow,
}));

app.MapGet("/api/flows", async (
    ThoughtFlowDbContext dbContext,
    CancellationToken cancellationToken) =>
{
    var flows = await dbContext.Flows
        .AsNoTracking()
        .OrderByDescending(flow => flow.UpdatedAt)
        .Select(flow => new FlowSummaryResponse(
            flow.Id,
            flow.Slug,
            flow.Title,
            flow.Description,
            flow.IsPublished,
            flow.CreatedAt,
            flow.UpdatedAt))
        .ToListAsync(cancellationToken);

    return Results.Ok(flows);
});

app.MapGet("/api/flows/{slug}", async (
    string slug,
    ThoughtFlowDbContext dbContext,
    CancellationToken cancellationToken) =>
{
    var flow = await dbContext.Flows
        .AsNoTracking()
        .Where(flow => flow.Slug == slug && flow.IsPublished)
        .SingleOrDefaultAsync(cancellationToken);

    if (flow is null)
    {
        return Results.NotFound(new ApiError("Published flow not found."));
    }

    return Results.Ok(new PublishedFlowResponse(
        flow.Id,
        flow.Slug,
        flow.Title,
        flow.Description,
        flow.FlowJson.RootElement.Clone()));
});

app.MapPut("/api/flows/{slug}", async (
    string slug,
    SaveFlowRequest request,
    ThoughtFlowDbContext dbContext,
    CancellationToken cancellationToken) =>
{
    var validationError = ValidateSaveFlowRequest(slug, request);
    if (validationError is not null)
    {
        return Results.BadRequest(new ApiError(validationError));
    }

    var now = DateTimeOffset.UtcNow;
    var flowJson = JsonDocument.Parse(request.Flow.GetRawText());
    var title = string.IsNullOrWhiteSpace(request.Title) ? TitleFromSlug(slug) : request.Title.Trim();
    var description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
    var flow = await dbContext.Flows
        .Where(flow => flow.Slug == slug)
        .SingleOrDefaultAsync(cancellationToken);

    if (flow is null)
    {
        flow = new Flow
        {
            Id = Guid.NewGuid(),
            Slug = slug,
            CreatedAt = now,
        };
        dbContext.Flows.Add(flow);
    }

    flow.Title = title;
    flow.Description = description;
    flow.FlowJson = flowJson;
    flow.IsPublished = request.IsPublished;
    flow.UpdatedAt = now;

    await dbContext.SaveChangesAsync(cancellationToken);

    return Results.Ok(new PublishedFlowResponse(
        flow.Id,
        flow.Slug,
        flow.Title,
        flow.Description,
        flow.FlowJson.RootElement.Clone()));
});

app.MapPost("/api/flows/{slug}/results", async (
    string slug,
    SubmitFlowResultRequest request,
    HttpContext httpContext,
    ThoughtFlowDbContext dbContext,
    CancellationToken cancellationToken) =>
{
    var validationError = ValidateResultRequest(request);
    if (validationError is not null)
    {
        return Results.BadRequest(new ApiError(validationError));
    }

    var flow = await dbContext.Flows
        .Where(flow => flow.Slug == slug && flow.IsPublished)
        .SingleOrDefaultAsync(cancellationToken);

    if (flow is null)
    {
        return Results.NotFound(new ApiError("Published flow not found."));
    }

    var now = DateTimeOffset.UtcNow;
    var result = new FlowResult
    {
        Id = Guid.NewGuid(),
        FlowId = flow.Id,
        PathJson = JsonDocument.Parse(JsonSerializer.Serialize(
            request.Path,
            new JsonSerializerOptions(JsonSerializerDefaults.Web))),
        FinalNodeId = request.FinalNodeId,
        CreatedAt = now,
        UserAgent = httpContext.Request.Headers["User-Agent"].ToString(),
        Referrer = httpContext.Request.Headers["Referer"].ToString(),
    };

    dbContext.FlowResults.Add(result);
    await dbContext.SaveChangesAsync(cancellationToken);

    return Results.Created(
        $"/api/flows/{slug}/results/{result.Id}",
        new FlowResultResponse(result.Id, result.CreatedAt));
});

if (app.Environment.IsDevelopment())
{
    app.MapPost("/api/dev/seed", async (
        FlowSeeder seeder,
        CancellationToken cancellationToken) =>
    {
        var flow = await seeder.SeedVeganEthicsFlowAsync(cancellationToken);

        return Results.Ok(new
        {
            flow.Id,
            flow.Slug,
            flow.Title,
            flow.IsPublished,
        });
    });
}

app.Run();

static string? ValidateSaveFlowRequest(string slug, SaveFlowRequest request)
{
    if (string.IsNullOrWhiteSpace(slug))
    {
        return "slug is required.";
    }

    if (request.Flow.ValueKind is not JsonValueKind.Object)
    {
        return "flow must be a JSON object.";
    }

    return null;
}

static string? ValidateResultRequest(SubmitFlowResultRequest request)
{
    if (string.IsNullOrWhiteSpace(request.FinalNodeId))
    {
        return "finalNodeId is required.";
    }

    foreach (var step in request.Path)
    {
        if (string.IsNullOrWhiteSpace(step.NodeId) ||
            string.IsNullOrWhiteSpace(step.ChoiceId) ||
            string.IsNullOrWhiteSpace(step.ChoiceLabel) ||
            string.IsNullOrWhiteSpace(step.TargetNodeId))
        {
            return "Each path step must include nodeId, choiceId, choiceLabel, and targetNodeId.";
        }
    }

    return null;
}

static string TitleFromSlug(string slug)
{
    var words = slug
        .Split('-', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
        .Select(word => char.ToUpperInvariant(word[0]) + word[1..]);

    return string.Join(' ', words);
}
