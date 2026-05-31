using System.Text.Json;

namespace ThoughtFlow.Api.Contracts;

public sealed record TagResponse(
    Guid Id,
    string Name,
    string Color);

public sealed record CreateTagRequest(string Name);

public sealed record PublishedFlowResponse(
    Guid Id,
    string Slug,
    string Title,
    string? Description,
    JsonElement Flow,
    IReadOnlyList<TagResponse> Tags);

public sealed record FlowSummaryResponse(
    Guid Id,
    string Slug,
    string Title,
    string? Description,
    bool IsPublished,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    IReadOnlyList<TagResponse> Tags);

public sealed record SaveFlowRequest(
    string Title,
    string? Description,
    JsonElement Flow,
    IReadOnlyList<Guid> TagIds,
    bool IsPublished = true);

public sealed record SubmitFlowResultRequest(
    IReadOnlyList<SubmittedPathStep> Path,
    string FinalNodeId);

public sealed record SubmittedPathStep(
    string NodeId,
    string ChoiceId,
    string ChoiceLabel,
    string TargetNodeId);

public sealed record FlowResultResponse(Guid Id, DateTimeOffset CreatedAt);

public sealed record ApiError(string Error);
