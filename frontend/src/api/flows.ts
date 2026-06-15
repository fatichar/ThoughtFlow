import type { SelectedChoice, Tag, ThoughtFlowFlow } from "../types/flow";

export type PublishedFlow = {
  id: string;
  slug: string;
  title: string;
  description?: string;
  flow: ThoughtFlowFlow;
  tags: Tag[];
};

export type FlowSummary = {
  id: string;
  slug: string;
  title: string;
  description?: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  tags: Tag[];
};

export type SubmitFlowResultInput = {
  path: SelectedChoice[];
  finalNodeId: string;
};

export type SavePublishedFlowInput = {
  slug: string;
  title: string;
  description?: string;
  flow: ThoughtFlowFlow;
  tagIds: string[];
};

export async function fetchPublishedFlow(slug: string, signal?: AbortSignal) {
  const response = await fetch(`/api/flows/${encodeURIComponent(slug)}`, {
    signal,
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(response.status === 404 ? "Flow not found" : "Could not load flow");
  }

  return (await response.json()) as PublishedFlow;
}

export async function listFlows(signal?: AbortSignal) {
  const response = await fetch("/api/flows", {
    signal,
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error("Could not load flows");
  }

  return (await response.json()) as FlowSummary[];
}

export async function savePublishedFlow(input: SavePublishedFlowInput) {
  const response = await fetch(`/api/flows/${encodeURIComponent(input.slug)}`, {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: input.title,
      description: input.description,
      flow: input.flow,
      tagIds: input.tagIds,
      isPublished: true,
    }),
  });

  if (!response.ok) {
    throw new Error(await responseErrorMessage(response, "Could not save flow"));
  }

  return (await response.json()) as PublishedFlow;
}

export async function submitFlowResult(
  slug: string,
  input: SubmitFlowResultInput,
) {
  const response = await fetch(`/api/flows/${encodeURIComponent(slug)}/results`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      finalNodeId: input.finalNodeId,
      path: input.path.map((choice) => ({
        nodeId: choice.fromNodeId,
        choiceId: choice.choiceId,
        choiceLabel: choice.label,
        targetNodeId: choice.targetNodeId,
      })),
    }),
  });

  if (!response.ok) {
    throw new Error("Could not submit result");
  }
}

async function responseErrorMessage(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error
      ? `${fallback}: ${body.error}`
      : `${fallback}: HTTP ${response.status}`;
  } catch {
    return `${fallback}: HTTP ${response.status}`;
  }
}
