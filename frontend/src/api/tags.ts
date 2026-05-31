import type { Tag } from "../types/flow";

export async function listTags(signal?: AbortSignal) {
  const response = await fetch("/api/tags", {
    signal,
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error("Could not load tags");
  }

  return (await response.json()) as Tag[];
}

export async function createTag(name: string) {
  const response = await fetch("/api/tags", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    if (response.status === 409) {
        throw new Error("Tag already exists");
    }
    throw new Error("Could not create tag");
  }

  return (await response.json()) as Tag;
}

export async function deleteTag(id: string) {
  const response = await fetch(`/api/tags/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Could not delete tag");
  }
}
