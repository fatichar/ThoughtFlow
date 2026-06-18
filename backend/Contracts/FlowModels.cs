namespace ThoughtFlow.Api.Contracts;

public sealed record FlowModel(
    string Id,
    string Title,
    string? Slug,
    string? Description,
    IReadOnlyList<TagResponse>? Tags,
    string StartNodeId,
    IReadOnlyDictionary<string, NodeModel> Nodes);

public sealed record NodeModel(
    string Id,
    string Title,
    string Text,
    string Type,
    IReadOnlyList<ChoiceModel> Choices,
    IReadOnlyList<CtaModel>? Ctas);

public sealed record ChoiceModel(
    string Id,
    string Label,
    string TargetNodeId);

public sealed record CtaModel(
    string Label,
    string Url,
    string Style);
