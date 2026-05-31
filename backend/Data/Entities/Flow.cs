using System.Text.Json;

namespace ThoughtFlow.Api.Data.Entities;

public sealed class Flow
{
    public Guid Id { get; set; }
    public string Slug { get; set; } = "";
    public string Title { get; set; } = "";
    public string? Description { get; set; }
    public JsonDocument FlowJson { get; set; } = JsonDocument.Parse("{}");
    public bool IsPublished { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public List<FlowResult> Results { get; set; } = [];
    public List<Tag> Tags { get; set; } = [];
}
