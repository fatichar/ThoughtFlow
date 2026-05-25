import { Edit3, FilePlus2, Play } from "lucide-react";
import type { FlowSummary } from "../api/flows";
import { siteName } from "../config/site";

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

  return (
    <main className="min-h-screen bg-canvas px-6 py-8 text-ink">
      <section className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-display text-4xl leading-10">
              {isEditMode ? "Flow editor" : siteName}
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-ink/60">
              {isEditMode
                ? "Choose a saved flow to edit, or start a new draft."
                : "Explore short interactive reasoning flows."}
            </p>
          </div>
          {isEditMode && onCreateFlow ? (
            <button className="editor-small-button" type="button" onClick={onCreateFlow}>
              <FilePlus2 size={16} />
              New flow
            </button>
          ) : null}
        </div>

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

        <div className="grid gap-3">
          {flowSummaries.map((summary) => {
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
      </section>
    </main>
  );
}
