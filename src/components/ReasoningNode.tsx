import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { motion } from "framer-motion";
import { BookOpen, Check, CornerDownRight, PenLine } from "lucide-react";
import type { ThoughtFlowChoice, ThoughtFlowNode } from "../types/flow";

export type ReasoningNodeData = {
  node: ThoughtFlowNode;
  state: "current" | "visited";
  selectedChoiceId?: string;
  onChoose: (fromNodeId: string, choice: ThoughtFlowChoice) => void;
};

const typeLabels: Record<ThoughtFlowNode["type"], string> = {
  question: "Decision",
  claim: "Claim",
  reflection: "Reflection",
  "input-placeholder": "Input later",
  conclusion: "Conclusion",
};

const typeIcons: Record<ThoughtFlowNode["type"], typeof BookOpen> = {
  question: CornerDownRight,
  claim: Check,
  reflection: BookOpen,
  "input-placeholder": PenLine,
  conclusion: Check,
};

function ReasoningNodeComponent({ data }: NodeProps) {
  const nodeData = data as unknown as ReasoningNodeData;
  const { node, onChoose, selectedChoiceId, state } = nodeData;
  const isCurrent = state === "current";
  const Icon = typeIcons[node.type];

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
        "reasoning-node",
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
        {node.type === "input-placeholder" ? (
          <span className="rounded-sm border border-dashed border-clay/60 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-clay">
            Future
          </span>
        ) : null}
      </div>

      <h2 className="font-display text-[28px] leading-none text-ink">
        {node.title}
      </h2>
      <p className="mt-3 text-[15px] leading-6 text-ink/75">{node.text}</p>

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
        ) : (
          <div className="rounded-sm border border-moss/25 bg-leaf/10 px-4 py-3 text-sm font-semibold text-moss">
            End of this path. Reset to replay the reasoning tree.
          </div>
        )}
      </div>
      <Handle className="flow-handle" position={Position.Right} type="source" />
    </motion.article>
  );
}

export const ReasoningNode = memo(ReasoningNodeComponent);
