namespace ThoughtFlow.Api.Data.Entities;

public sealed class Tag
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public string Color { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; }
    public List<Flow> Flows { get; set; } = [];
}
