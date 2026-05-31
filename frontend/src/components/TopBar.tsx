import { useState } from "react";
import { Check, RotateCcw, Share2, Sparkles } from "lucide-react";
import { siteName } from "../config/site";
import type { ThoughtFlowFlow } from "../types/flow";
import { shareFlowUrl } from "../utils/shareFlow";
import { tagColorStyle } from "../utils/tagColors";

type TopBarProps = {
  flow: ThoughtFlowFlow;
  onReset: () => void;
};

export function TopBar({ flow, onReset }: TopBarProps) {
  const [shareState, setShareState] = useState<"idle" | "copied" | "error">("idle");

  async function shareFlow() {
    const url = window.location.href;
    setShareState("idle");

    try {
      const result = await shareFlowUrl(flow.title || siteName, url);
      if (result === "copied") {
        setShareState("copied");
        window.setTimeout(() => setShareState("idle"), 1800);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setShareState("error");
      window.setTimeout(() => setShareState("idle"), 1800);
    }
  }

  return (
    <header className="relative z-20 flex h-16 items-center justify-between border-b border-ink/10 bg-[#f9f6ed]/90 px-5 backdrop-blur">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-sm bg-ink text-canvas shadow-node">
          <Sparkles size={19} strokeWidth={2.2} />
        </div>
        <div className="min-w-0 flex items-center gap-4">
          <div>
            <p className="font-display text-xl leading-5">{siteName}</p>
            <p className="truncate text-xs font-semibold uppercase tracking-[0.18em] text-moss">
              {flow.title}
            </p>
          </div>
          {flow.tags && flow.tags.length > 0 ? (
            <div className="hidden sm:flex items-center gap-1.5 border-l border-ink/10 pl-4">
              {flow.tags.map((tag) => (
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
      </div>
      <div className="flex items-center gap-2">
        <button
          className="icon-button"
          type="button"
          title={shareState === "copied" ? "Copied link" : "Share flow"}
          aria-label={shareState === "copied" ? "Copied link" : "Share flow"}
          onClick={() => void shareFlow()}
        >
          {shareState === "copied" ? <Check size={18} /> : <Share2 size={18} />}
        </button>
        <button
          className="icon-button"
          type="button"
          title="Reset flow"
          aria-label="Reset flow"
          onClick={onReset}
        >
          <RotateCcw size={18} />
        </button>
      </div>
    </header>
  );
}
