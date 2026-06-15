import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  BookOpen,
  Check,
  CornerDownRight,
  FilePlus2,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import type {
  ThoughtFlowChoice,
  ThoughtFlowCta,
  ThoughtFlowNode,
  ThoughtFlowNodeType,
} from "../types/flow";

export type EditableFlowNodeData = {
  node: ThoughtFlowNode;
  isSelected: boolean;
  isStartNode: boolean;
  onAddChoice: (nodeId: string) => void;
  onAddCta: (nodeId: string) => void;
  onCreateConnectedNode: (nodeId: string, choiceId: string) => void;
  onDeleteChoice: (nodeId: string, choiceId: string) => void;
  onDeleteCta: (nodeId: string, index: number) => void;
  onSelect: (nodeId: string) => void;
  onUpdateChoice: (
    nodeId: string,
    choiceId: string,
    patch: Partial<ThoughtFlowChoice>,
  ) => void;
  onUpdateCta: (
    nodeId: string,
    index: number,
    patch: Partial<ThoughtFlowCta>,
  ) => void;
  onUpdateNode: (nodeId: string, patch: Partial<ThoughtFlowNode>) => void;
};

const nodeTypes: ThoughtFlowNodeType[] = [
  "question",
  "information",
  "conclusion",
  "action",
];

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

function EditableFlowNodeComponent({ data }: NodeProps) {
  const nodeData = data as unknown as EditableFlowNodeData;
  const {
    isSelected,
    isStartNode,
    node,
    onAddChoice,
    onAddCta,
    onCreateConnectedNode,
    onDeleteChoice,
    onDeleteCta,
    onSelect,
    onUpdateChoice,
    onUpdateCta,
    onUpdateNode,
  } = nodeData;
  const Icon = typeIcons[node.type];
  const isAction = node.type === "action";
  const canHaveChoices = node.type !== "action";

  return (
    <article
      className={[
        isAction ? "action-node editable-flow-node-action" : "reasoning-node",
        "editable-flow-node",
        isSelected ? "editable-flow-node-selected" : "",
      ].join(" ")}
      onFocus={() => onSelect(node.id)}
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
        {isStartNode ? (
          <span className="rounded-sm border border-moss/25 bg-leaf/15 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-moss">
            Start
          </span>
        ) : null}
      </div>
      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-ink/35">
        Drag card to arrange
      </p>

      <input
        aria-label="Node title"
        className="nodrag editable-node-title"
        placeholder="Optional short label"
        value={node.title}
        onChange={(event) => onUpdateNode(node.id, { title: event.target.value })}
      />

      <textarea
        aria-label="Node text"
        className="nodrag nowheel editable-node-text"
        placeholder={
          node.type === "question"
            ? "Write the opening question or idea for this flow."
            : "Write the thought, question, or next step here."
        }
        value={node.text}
        onChange={(event) => onUpdateNode(node.id, { text: event.target.value })}
      />

      <label className="mt-4 block text-[10px] font-extrabold uppercase tracking-[0.16em] text-moss">
        Node type
        <select
          className="nodrag editable-node-select"
          value={node.type}
          onChange={(event) =>
            onUpdateNode(node.id, {
              type: event.target.value as ThoughtFlowNodeType,
              choices: event.target.value === "action" ? [] : node.choices,
              ctas:
                event.target.value === "action"
                  ? node.ctas ?? [{ label: "", url: "", style: "primary" }]
                  : undefined,
            })
          }
        >
          {nodeTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>

      {canHaveChoices ? (
        <section className="mt-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-moss">
              Choices
            </p>
            <button
              className="nodrag editor-card-action"
              type="button"
              onClick={() => onAddChoice(node.id)}
            >
              <Plus size={14} />
              Choice
            </button>
          </div>
          <div className="grid gap-2">
            {node.choices.map((choice) => (
              <div className="editable-choice-row" key={choice.id}>
                <input
                  aria-label="Choice label"
                  className="nodrag editable-choice-input"
                  placeholder="New choice"
                  value={choice.label}
                  onChange={(event) =>
                    onUpdateChoice(node.id, choice.id, {
                      label: event.target.value,
                    })
                  }
                />
                <button
                  className="nodrag editable-choice-icon"
                  type="button"
                  title="Create connected node"
                  aria-label="Create connected node"
                  onClick={() => onCreateConnectedNode(node.id, choice.id)}
                >
                  <FilePlus2 size={15} />
                </button>
                <button
                  className="nodrag editable-choice-icon"
                  type="button"
                  title="Delete choice"
                  aria-label="Delete choice"
                  onClick={() => onDeleteChoice(node.id, choice.id)}
                >
                  <Trash2 size={15} />
                </button>
                <Handle
                  className="editor-choice-handle"
                  id={choice.id}
                  position={Position.Right}
                  type="source"
                />
              </div>
            ))}
            {node.choices.length === 0 ? (
              <p className="rounded-sm border border-dashed border-ink/20 px-3 py-3 text-sm font-semibold text-ink/50">
                Add a choice, then drag from its handle to another node.
              </p>
            ) : null}
          </div>
        </section>
      ) : (
        <section className="mt-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-clay">
              CTA buttons
            </p>
            <button
              className="nodrag editor-card-action"
              type="button"
              onClick={() => onAddCta(node.id)}
            >
              <Plus size={14} />
              CTA
            </button>
          </div>
          <div className="grid gap-2">
            {(node.ctas ?? []).map((cta, index) => (
              <div className="editable-cta-row" key={index}>
                <input
                  aria-label="CTA label"
                  className="nodrag editable-choice-input"
                  placeholder="Try Vegan for 7 Days"
                  value={cta.label}
                  onChange={(event) =>
                    onUpdateCta(node.id, index, { label: event.target.value })
                  }
                />
                <input
                  aria-label="CTA URL"
                  className="nodrag editable-choice-input"
                  placeholder="https://example.com"
                  value={cta.url}
                  onChange={(event) =>
                    onUpdateCta(node.id, index, { url: event.target.value })
                  }
                />
                <select
                  aria-label="CTA style"
                  className="nodrag editable-node-select mt-0"
                  value={cta.style}
                  onChange={(event) =>
                    onUpdateCta(node.id, index, {
                      style: event.target.value as ThoughtFlowCta["style"],
                    })
                  }
                >
                  <option value="primary">primary</option>
                  <option value="secondary">secondary</option>
                </select>
                <button
                  className="nodrag editable-choice-icon"
                  type="button"
                  title="Delete CTA"
                  aria-label="Delete CTA"
                  onClick={() => onDeleteCta(node.id, index)}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}

export const EditableFlowNode = memo(EditableFlowNodeComponent);
