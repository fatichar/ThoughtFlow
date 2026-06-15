using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using ThoughtFlow.Api.Contracts;
using Scalar.AspNetCore;
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

builder.Services.AddOpenApi();

var app = builder.Build();

if (app.Configuration.GetValue("Database:Migrate", false))
{
    await using var scope = app.Services.CreateAsyncScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<ThoughtFlowDbContext>();
    await dbContext.Database.MigrateAsync();
}

app.UseCors("Frontend");

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

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
        .Include(flow => flow.Tags)
        .OrderByDescending(flow => flow.UpdatedAt)
        .Select(flow => new FlowSummaryResponse(
            flow.Id,
            flow.Slug,
            flow.Title,
            flow.Description,
            flow.IsPublished,
            flow.CreatedAt,
            flow.UpdatedAt,
            flow.Tags.Select(t => new TagResponse(t.Id, t.Name, t.Color)).ToList()))
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
        .Include(f => f.Tags)
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
        flow.FlowJson.Deserialize<FlowModel>(new JsonSerializerOptions(JsonSerializerDefaults.Web))!,
        flow.Tags.Select(t => new TagResponse(t.Id, t.Name, t.Color)).ToList()));
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
    var flowJson = JsonDocument.Parse(JsonSerializer.Serialize(request.Flow, new JsonSerializerOptions(JsonSerializerDefaults.Web)));
    var title = request.Title.Trim();
    var description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
    var flow = await dbContext.Flows
        .Include(f => f.Tags)
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

    var requestTagIds = request.TagIds ?? [];
    var tags = await dbContext.Tags.Where(t => requestTagIds.Contains(t.Id)).ToListAsync(cancellationToken);
    flow.Tags = tags;

    await dbContext.SaveChangesAsync(cancellationToken);

    return Results.Ok(new PublishedFlowResponse(
        flow.Id,
        flow.Slug,
        flow.Title,
        flow.Description,
        flow.FlowJson.Deserialize<FlowModel>(new JsonSerializerOptions(JsonSerializerDefaults.Web))!,
        flow.Tags.Select(t => new TagResponse(t.Id, t.Name, t.Color)).ToList()));
});

app.MapGet("/api/tags", async (
    ThoughtFlowDbContext dbContext,
    CancellationToken cancellationToken) =>
{
    var tags = await dbContext.Tags
        .AsNoTracking()
        .OrderBy(tag => tag.Name)
        .Select(tag => new TagResponse(tag.Id, tag.Name, tag.Color))
        .ToListAsync(cancellationToken);

    return Results.Ok(tags);
});

app.MapPost("/api/tags", async (
    CreateTagRequest request,
    ThoughtFlowDbContext dbContext,
    CancellationToken cancellationToken) =>
{
    var name = request.Name?.Trim();
    if (string.IsNullOrEmpty(name))
    {
        return Results.BadRequest(new ApiError("Tag name is required."));
    }

    var existingTag = await dbContext.Tags
        .FirstOrDefaultAsync(t => t.Name.ToLower() == name.ToLower(), cancellationToken);

    if (existingTag is not null)
    {
        return Results.Conflict(new ApiError("A tag with this name already exists."));
    }

    var colors = new[] { "bg-red-500", "bg-orange-500", "bg-amber-500", "bg-green-500", "bg-emerald-500", "bg-teal-500", "bg-cyan-500", "bg-blue-500", "bg-indigo-500", "bg-violet-500", "bg-purple-500", "bg-fuchsia-500", "bg-pink-500", "bg-rose-500" };
    var random = new Random();
    var color = colors[random.Next(colors.Length)];

    var tag = new Tag
    {
        Id = Guid.NewGuid(),
        Name = name,
        Color = color,
        CreatedAt = DateTimeOffset.UtcNow,
    };

    dbContext.Tags.Add(tag);
    await dbContext.SaveChangesAsync(cancellationToken);

    return Results.Created($"/api/tags/{tag.Id}", new TagResponse(tag.Id, tag.Name, tag.Color));
});

app.MapDelete("/api/tags/{id:guid}", async (
    Guid id,
    ThoughtFlowDbContext dbContext,
    CancellationToken cancellationToken) =>
{
    var tag = await dbContext.Tags.FindAsync(new object[] { id }, cancellationToken);
    if (tag is null)
    {
        return Results.NotFound(new ApiError("Tag not found."));
    }

    dbContext.Tags.Remove(tag);
    await dbContext.SaveChangesAsync(cancellationToken);

    return Results.NoContent();
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

    if (request.Flow is null)
    {
        return "flow is required.";
    }

    if (string.IsNullOrWhiteSpace(request.Title))
    {
        return "title is required.";
    }

    if (string.IsNullOrWhiteSpace(request.Flow.Title))
    {
        return "flow.title is required.";
    }

    foreach (var node in request.Flow.Nodes.Values)
    {
        if (string.IsNullOrWhiteSpace(node.Title))
        {
            return $"node '{node.Id}' title is required.";
        }
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

