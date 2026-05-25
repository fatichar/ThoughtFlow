import { memo, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  BookOpen,
  Check,
  CornerDownRight,
  RotateCcw,
  Send,
  Share2,
  Sparkles,
} from "lucide-react";
import type { ThoughtFlowChoice, ThoughtFlowNode } from "../types/flow";

export type ReasoningNodeData = {
  node: ThoughtFlowNode;
  state: "current" | "visited";
  selectedChoiceId?: string;
  onChoose: (fromNodeId: string, choice: ThoughtFlowChoice) => void;
  onRestart: () => void;
  onExploreAnotherPath: () => void;
  onShareFlow: () => Promise<"shared" | "copied" | "cancelled">;
  onSubmitCompletion: () => void;
  canExploreAnotherPath: boolean;
  isCompletionSaved: boolean;
  isSavingCompletion: boolean;
};

const typeLabels: Record<ThoughtFlowNode["type"], string> = {
  question: "Decision",
  information: "Information",
  conclusion: "Conclusion",
  action: "Next steps",
};

const typeIcons: Record<ThoughtFlowNode["type"], typeof BookOpen> = {
  question: CornerDownRight,
  information: BookOpen,
  conclusion: Check,
  action: Sparkles,
};

function ReasoningNodeComponent({ data }: NodeProps) {
  const nodeData = data as unknown as ReasoningNodeData;
  const {
    canExploreAnotherPath,
    isCompletionSaved,
    isSavingCompletion,
    node,
    onChoose,
    onExploreAnotherPath,
    onRestart,
    onShareFlow,
    onSubmitCompletion,
    selectedChoiceId,
    state,
  } = nodeData;
  const isCurrent = state === "current";
  const Icon = typeIcons[node.type];
  const isAction = node.type === "action";
  const validCtas = node.ctas?.filter((cta) => cta.label.trim() && cta.url.trim()) ?? [];
  const isTerminalNode = isAction ? validCtas.length === 0 : node.choices.length === 0;
  const [shareState, setShareState] = useState<"idle" | "copied" | "error">("idle");

  async function handleShareCta() {
    setShareState("idle");

    try {
      const result = await onShareFlow();
      if (result === "copied") {
        setShareState("copied");
        window.setTimeout(() => setShareState("idle"), 1800);
      }
    } catch {
      setShareState("error");
      window.setTimeout(() => setShareState("idle"), 1800);
    }
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 18, scale: 0.94 }}
      animate={{
        opacity: isCurrent ? 1 : 0.78,
        y: 0,
        scale: isCurrent ? 1 : 0.88,
      }}
      transition={{ type: "spring", stiffness: 260, damping: 25 }}
      className={[
        isAction ? "action-node" : "reasoning-node",
        isCurrent ? "reasoning-node-current" : "reasoning-node-visited",
      ].join(" ")}
    >
      <Handle className="flow-handle" position={Position.Left} type="target" />
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-sm bg-moss text-canvas">
            <Icon size={16} />
          </span>
          <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-moss">
            {typeLabels[node.type]}
          </span>
        </div>
        {isAction || isTerminalNode ? (
          <span className="rounded-sm border border-clay/25 bg-clay/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-clay">
            {isCompletionSaved
              ? "Saved"
              : isSavingCompletion
                ? "Saving"
                : "Completion"}
          </span>
        ) : null}
      </div>

      <h2 className="font-display text-[28px] leading-none text-ink">
        {node.title}
      </h2>
      <p className="mt-3 text-[15px] leading-6 text-ink/75">{node.text}</p>

      {isAction ? (
        <div className="mt-6">
          <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.18em] text-clay">
            What would you like to do next?
          </p>
          <div className="grid gap-2">
            {validCtas.map((cta) => {
              const isShareCta = cta.label.toLowerCase().includes("share");
              const className = [
                "flex min-h-12 items-center justify-between gap-3 rounded-sm border px-4 py-3 text-sm font-extrabold transition hover:-translate-y-0.5",
                cta.style === "primary"
                  ? "border-ink bg-ink text-canvas hover:bg-moss"
                  : "border-ink/10 bg-white/55 text-ink hover:border-moss/45 hover:text-moss",
              ].join(" ");

              if (isShareCta) {
                return (
                  <button
                    className={className}
                    key={`${cta.label}-${cta.url}`}
                    onClick={() => void handleShareCta()}
                    type="button"
                  >
                    <span>
                      {shareState === "copied"
                        ? "Copied link"
                        : shareState === "error"
                          ? "Could not share"
                          : cta.label}
                    </span>
                    <Share2 size={17} />
                  </button>
                );
              }

              return (
                <a
                  className={className}
                  href={cta.url}
                  key={`${cta.label}-${cta.url}`}
                  rel="noreferrer"
                  target="_blank"
                >
                  <span>{cta.label}</span>
                  <ArrowUpRight size={17} />
                </a>
              );
            })}
          </div>
          {validCtas.length === 0 ? (
            <button
              className="choice-button choice-button-selected mt-4"
              type="button"
              onClick={onSubmitCompletion}
              disabled={isSavingCompletion || isCompletionSaved}
            >
              <span>
                {isCompletionSaved
                  ? "Response saved"
                  : isSavingCompletion
                    ? "Saving response"
                    : "Submit response"}
              </span>
              <Send size={16} />
            </button>
          ) : null}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button className="choice-button" type="button" onClick={onRestart}>
              <span>Restart flow</span>
              <RotateCcw size={16} />
            </button>
            <button
              className="choice-button"
              type="button"
              onClick={onExploreAnotherPath}
              disabled={!canExploreAnotherPath}
            >
              <span>Explore another path</span>
              <CornerDownRight size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-5 space-y-2">
          {node.choices.length > 0 ? (
            node.choices.map((choice) => {
              const isSelected = selectedChoiceId === choice.id;
              const isSoftened = Boolean(selectedChoiceId && !isSelected);

              return (
                <button
                  className={[
                    "choice-button",
                    isSelected ? "choice-button-selected" : "",
                    isSoftened ? "choice-button-soft" : "",
                  ].join(" ")}
                  key={choice.id}
                  onClick={(event) => {
                    event.stopPropagation();
                    onChoose(node.id, choice);
                  }}
                  type="button"
                >
                  <span>{choice.label}</span>
                  <CornerDownRight size={16} />
                </button>
              );
            })
          ) : isCurrent ? (
            <button
              className="choice-button choice-button-selected"
              type="button"
              onClick={onSubmitCompletion}
              disabled={isSavingCompletion || isCompletionSaved}
            >
              <span>
                {isCompletionSaved
                  ? "Response saved"
                  : isSavingCompletion
                    ? "Saving response"
                    : "Submit response"}
              </span>
              <Send size={16} />
            </button>
          ) : null}
        </div>
      )}
      <Handle className="flow-handle" position={Position.Right} type="source" />
    </motion.article>
  );
}

export const ReasoningNode = memo(ReasoningNodeComponent);
