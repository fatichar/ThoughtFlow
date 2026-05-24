using System.Text.Json;

namespace ThoughtFlow.Api.Data.Entities;

public sealed class FlowResult
{
    public Guid Id { get; set; }
    public Guid FlowId { get; set; }
    public Flow? Flow { get; set; }
    public JsonDocument PathJson { get; set; } = JsonDocument.Parse("[]");
    public string FinalNodeId { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; }
    public string? UserAgent { get; set; }
    public string? Referrer { get; set; }
}
