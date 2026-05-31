import { Edit3, FilePlus2, Play, Tag as TagIcon, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { FlowSummary } from "../api/flows";
import { listTags } from "../api/tags";
import { siteName } from "../config/site";
import type { Tag } from "../types/flow";
import { tagColorStyle } from "../utils/tagColors";

type FlowLibraryProps = {
  flowSummaries: FlowSummary[];
  listState: "idle" | "loading" | "error";
  mode: "play" | "edit";
  onCreateFlow?: () => void;
};

export function FlowLibrary({
  flowSummaries,
  listState,
  mode,
  onCreateFlow,
}: FlowLibraryProps) {
  const isEditMode = mode === "edit";
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const controller = new AbortController();
    listTags(controller.signal)
      .then((tags) => setAvailableTags(tags))
      .catch((e) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        console.error("Failed to load tags", e);
      });
    return () => controller.abort();
  }, []);

  function toggleTag(tagId: string) {
    const next = new Set(selectedTagIds);
    if (next.has(tagId)) {
      next.delete(tagId);
    } else {
      next.add(tagId);
    }
    setSelectedTagIds(next);
  }

  const filteredSummaries = flowSummaries.filter((summary) => {
    if (selectedTagIds.size === 0) return true;
    const summaryTagIds = new Set((summary.tags || []).map((t) => t.id));
    return Array.from(selectedTagIds).every((id) => summaryTagIds.has(id));
  });

  return (
    <main className="min-h-screen bg-canvas px-6 py-8 text-ink">
      <section className="mx-auto max-w-6xl grid grid-cols-[240px_1fr] items-start gap-8 max-[800px]:grid-cols-1">
        <aside className="sticky top-8 space-y-6">
          <div>
            <p className="font-display text-2xl leading-8">
              {isEditMode ? "Flow editor" : siteName}
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-ink/60">
              {isEditMode
                ? "Choose a saved flow to edit, or start a new draft."
                : "Explore short interactive reasoning flows."}
            </p>
          </div>
          {isEditMode && onCreateFlow ? (
            <button className="editor-small-button w-full justify-center" type="button" onClick={onCreateFlow}>
              <FilePlus2 size={16} />
              New flow
            </button>
          ) : null}

          <div className="border-t border-ink/10 pt-6">
            <p className="mb-3 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-moss">
              <TagIcon size={15} />
              Filter by Tags
            </p>
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => {
                const isSelected = selectedTagIds.has(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                      className={`flex items-center gap-1 rounded-sm px-2.5 py-1 text-xs font-bold transition-all ${
                        isSelected
                        ? "text-white shadow-sm"
                        : "bg-ink/5 text-ink/60 hover:bg-ink/10"
                    }`}
                    style={isSelected ? tagColorStyle(tag.color) : undefined}
                  >
                    {tag.name}
                    {isSelected && <X size={12} strokeWidth={3} className="ml-0.5" />}
                  </button>
                );
              })}
              {availableTags.length === 0 && listState !== "loading" && (
                <p className="text-sm text-ink/50 italic">No tags available.</p>
              )}
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          {listState === "loading" ? (
            <p className="border border-ink/10 bg-[#fffdf7] px-4 py-4 text-sm font-bold text-ink/60">
              Loading flows...
            </p>
          ) : null}

          {listState === "error" ? (
            <p className="border border-clay/20 bg-[#fff7ea] px-4 py-4 text-sm font-bold text-clay">
              Could not load saved flows.
            </p>
          ) : null}

          {listState !== "loading" && flowSummaries.length === 0 ? (
            <p className="border border-dashed border-ink/20 bg-[#fffdf7] px-4 py-5 text-sm font-semibold text-ink/55">
              No saved flows yet.
            </p>
          ) : null}

          {listState !== "loading" && flowSummaries.length > 0 && filteredSummaries.length === 0 ? (
            <p className="border border-dashed border-ink/20 bg-[#fffdf7] px-4 py-5 text-sm font-semibold text-ink/55">
              No flows match the selected tags.
            </p>
          ) : null}

          <div className="grid gap-3">
            {filteredSummaries.map((summary) => {
              const href = isEditMode
                ? `/editor/${encodeURIComponent(summary.slug)}`
                : `/play/${encodeURIComponent(summary.slug)}`;
              const Icon = isEditMode ? Edit3 : Play;

              return (
                <a
                  className="block border border-ink/10 bg-[#fffdf7] px-4 py-4 transition hover:border-moss hover:bg-leaf/10"
                  href={href}
                  key={summary.id}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-lg font-extrabold">{summary.title}</p>
                      <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-moss">
                        /play/{summary.slug}
                      </p>
                      {summary.description ? (
                        <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-ink/60">
                          {summary.description}
                        </p>
                      ) : null}
                      {summary.tags && summary.tags.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {summary.tags.map(tag => (
                            <span
                              key={tag.id}
                              className="rounded-sm px-2 py-0.5 text-[10px] font-bold text-white shadow-sm"
                              style={tagColorStyle(tag.color)}
                            >
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <span className="flex items-center gap-2 border border-ink/10 px-2 py-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-ink/55">
                      <Icon size={13} />
                      {isEditMode ? "Edit" : "Play"}
                    </span>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
