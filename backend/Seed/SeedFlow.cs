using System.Text.Json;

namespace ThoughtFlow.Api.Seed;

public sealed record SeedFlow(
    string Slug,
    string Title,
    string? Description,
    bool IsPublished,
    JsonElement Flow);
