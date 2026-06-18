import { memo, useState, type ReactNode } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  BookOpen,
  Check,
  Heart,
  RotateCcw,
  Send,
  Share2,
} from "lucide-react";
import type { ThoughtFlowChoice, ThoughtFlowNode } from "../types/flow";

export type ReasoningNodeData = {
  node: ThoughtFlowNode;
  state: "current" | "visited";
  selectedChoiceId?: string;
  onChoose: (fromNodeId: string, choice: ThoughtFlowChoice) => void;
  onRestart: () => void;
  onShareFlow: () => Promise<"shared" | "copied" | "cancelled">;
  onSubmitCompletion: () => void;
  isCompletionSaved: boolean;
  isSavingCompletion: boolean;
};

const typeLabels: Record<ThoughtFlowNode["type"], string> = {
  question: "Decision",
  information: "Information",
  conclusion: "Conclusion",
};

const typeIcons: Record<ThoughtFlowNode["type"], typeof BookOpen> = {
  question: Share2,
  information: BookOpen,
  conclusion: Check,
};

function ReasoningNodeComponent({ data }: NodeProps) {
  const nodeData = data as unknown as ReasoningNodeData;
  const {
    isCompletionSaved,
    isSavingCompletion,
    node,
    onChoose,
    onRestart,
    onShareFlow,
    onSubmitCompletion,
    selectedChoiceId,
    state,
  } = nodeData;
  const isCurrent = state === "current";
  const validCtas = node.ctas?.filter((cta) => cta.label.trim() && cta.url.trim()) ?? [];
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

  if (node.type === "question") {
    return (
      <PlayerMotionShell state={state} className="player-node-decision-shell">
        <QuestionNodeCard
          node={node}
          selectedChoiceId={selectedChoiceId}
          onChoose={onChoose}
        />
      </PlayerMotionShell>
    );
  }

  if (node.type === "information") {
    return (
      <PlayerMotionShell state={state} className="player-node-info-shell">
        <InfoNode
          node={node}
          selectedChoiceId={selectedChoiceId}
          onChoose={onChoose}
        />
      </PlayerMotionShell>
    );
  }

  return (
    <PlayerMotionShell state={state} className="player-node-conclusion-shell">
      <ConclusionNode
        isCompletionSaved={isCompletionSaved}
        isCurrent={isCurrent}
        isSavingCompletion={isSavingCompletion}
        node={node}
        onRestart={onRestart}
        onShare={() => void handleShareCta()}
        onSubmitCompletion={onSubmitCompletion}
        shareState={shareState}
        validCtas={validCtas}
      />
    </PlayerMotionShell>
  );
}

function PlayerMotionShell({
  children,
  className,
  state,
}: {
  children: ReactNode;
  className: string;
  state: "current" | "visited";
}) {
  const isCurrent = state === "current";

  return (
    <motion.article
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{
        opacity: isCurrent ? 1 : 0.88,
        y: 0,
        scale: isCurrent ? 1 : 0.94,
      }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
      className={["player-node-shell", className].join(" ")}
    >
      {children}
    </motion.article>
  );
}

function QuestionNodeCard({
  node,
  onChoose,
  selectedChoiceId,
}: {
  node: ThoughtFlowNode;
  onChoose: (fromNodeId: string, choice: ThoughtFlowChoice) => void;
  selectedChoiceId?: string;
}) {
  return (
    <div className="player-question-card">
      <Handle className="player-target-handle" position={Position.Left} type="target" />
      <Handle className="player-node-source-handle" position={Position.Right} type="source" />
      <NodeKicker node={node} />
      <h2>{node.title}</h2>
      {node.text.trim() ? <p>{node.text}</p> : null}
      <PlayerChoiceButtons
        choices={node.choices}
        nodeId={node.id}
        onChoose={onChoose}
        selectedChoiceId={selectedChoiceId}
        variant="decision"
      />
    </div>
  );
}

function InfoNode({
  node,
  onChoose,
  selectedChoiceId,
}: {
  node: ThoughtFlowNode;
  onChoose: (fromNodeId: string, choice: ThoughtFlowChoice) => void;
  selectedChoiceId?: string;
}) {
  return (
    <div className="player-info-card">
      <Handle className="player-target-handle" position={Position.Left} type="target" />
      <Handle className="player-node-source-handle" position={Position.Right} type="source" />
      <NodeKicker node={node} />
      <h2>{node.title}</h2>
      {node.text.trim() ? <p>{node.text}</p> : null}
      <PlayerChoiceButtons
        choices={node.choices}
        nodeId={node.id}
        onChoose={onChoose}
        selectedChoiceId={selectedChoiceId}
        variant="info"
      />
    </div>
  );
}

function ConclusionNode({
  isCompletionSaved,
  isCurrent,
  isSavingCompletion,
  node,
  onRestart,
  onShare,
  onSubmitCompletion,
  shareState,
  validCtas,
}: {
  isCompletionSaved: boolean;
  isCurrent: boolean;
  isSavingCompletion: boolean;
  node: ThoughtFlowNode;
  onRestart: () => void;
  onShare: () => void;
  onSubmitCompletion: () => void;
  shareState: "idle" | "copied" | "error";
  validCtas: NonNullable<ThoughtFlowNode["ctas"]>;
}) {
  return (
    <div className="player-conclusion-card">
      <Handle className="player-target-handle" position={Position.Left} type="target" />
      <div className="player-conclusion-header">
        <NodeKicker node={node} />
        <span className="player-status-badge">
          {isCompletionSaved ? "Saved" : isSavingCompletion ? "Saving" : "Completion"}
        </span>
      </div>
      <h2>{node.title}</h2>
      {node.text.trim() ? <p>{node.text}</p> : null}

      {validCtas.length > 0 ? (
        <CtaLinks ctas={validCtas} />
      ) : isCurrent ? (
        <button
          className="player-submit-button"
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

      <EndingControls onRestart={onRestart} onShare={onShare} shareState={shareState} />
    </div>
  );
}

function NodeKicker({ node }: { node: ThoughtFlowNode }) {
  const Icon = typeIcons[node.type];

  return (
    <div className={["player-node-kicker", `player-node-kicker-${node.type}`].join(" ")}>
      <span>
        <Icon size={18} />
      </span>
      <strong>{typeLabels[node.type]}</strong>
    </div>
  );
}

function PlayerChoiceButtons({
  choices,
  nodeId,
  onChoose,
  selectedChoiceId,
  variant,
}: {
  choices: ThoughtFlowChoice[];
  nodeId: string;
  onChoose: (fromNodeId: string, choice: ThoughtFlowChoice) => void;
  selectedChoiceId?: string;
  variant: "decision" | "info";
}) {
  if (choices.length === 0) {
    return null;
  }

  return (
    <div className={`player-choice-buttons player-choice-buttons-${variant}`}>
      {choices.map((choice) => {
        const isSelected = selectedChoiceId === choice.id;
        const label = variant === "info" && choices.length === 1 ? "Go" : choice.label;

        return (
          <button
            aria-pressed={isSelected}
            className={[
              "player-choice-button",
              `player-choice-button-${variant}`,
              isSelected ? "player-choice-button-selected" : "",
            ].join(" ")}
            key={choice.id}
            onClick={(event) => {
              event.stopPropagation();
              onChoose(nodeId, choice);
            }}
            type="button"
          >
            <span>{label}</span>
            <ArrowUpRight size={16} />
          </button>
        );
      })}
    </div>
  );
}

function CtaLinks({ ctas }: { ctas: NonNullable<ThoughtFlowNode["ctas"]> }) {
  return (
    <section className="player-cta-section">
      <p>Related links</p>
      <div>
        {ctas.map((cta, index) => {
          const href = normalizeCtaHref(cta.url);
          const isExternal = /^https?:\/\//i.test(href);
          const Icon = index % 2 === 0 ? BookOpen : Heart;

          return (
            <a
              className="player-cta-link"
              href={href}
              key={`${cta.label}-${cta.url}`}
              rel={isExternal ? "noreferrer" : undefined}
              target={isExternal ? "_blank" : undefined}
            >
              <span className="player-cta-icon">
                <Icon size={18} />
              </span>
              <strong>{cta.label}</strong>
              <ArrowUpRight size={19} />
            </a>
          );
        })}
      </div>
    </section>
  );
}

function EndingControls({
  onRestart,
  onShare,
  shareState,
}: {
  onRestart: () => void;
  onShare: () => void;
  shareState: "idle" | "copied" | "error";
}) {
  return (
    <div className="player-ending-controls">
      <button type="button" onClick={onShare}>
        <Share2 size={18} />
        <span>
          {shareState === "copied"
            ? "Copied link"
            : shareState === "error"
              ? "Could not share"
              : "Share flow"}
        </span>
      </button>
      <button type="button" onClick={onRestart}>
        <RotateCcw size={18} />
        <span>Restart flow</span>
      </button>
    </div>
  );
}

function normalizeCtaHref(url: string) {
  const value = url.trim();

  if (/^(https?:|mailto:|tel:|#|\/)/i.test(value)) {
    return value;
  }

  return `https://${value}`;
}

export const ReasoningNode = memo(ReasoningNodeComponent);
