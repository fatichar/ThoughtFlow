import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  BookOpen,
  Check,
  CornerDownRight,
  FilePlus2,
  Plus,
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
  onDeleteNode: (nodeId: string) => void;
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
];

const typeLabels: Record<ThoughtFlowNode["type"], string> = {
  question: "Decision",
  information: "Information",
  conclusion: "Conclusion",
};

const typeIcons: Record<ThoughtFlowNode["type"], typeof BookOpen> = {
  question: CornerDownRight,
  information: BookOpen,
  conclusion: Check,
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
    onDeleteNode,
    onSelect,
    onUpdateChoice,
    onUpdateCta,
    onUpdateNode,
  } = nodeData;
  const Icon = typeIcons[node.type];
  const canAddChoices = supportsBranchChoices(node.type);
  const canHaveCtas = supportsCtas(node.type);
  const hasLegacyChoices = !canAddChoices && node.choices.length > 0;
  const shouldShowChoices = canAddChoices || hasLegacyChoices;
  const choiceSectionTitle =
    node.type === "information"
      ? "Continue paths"
      : hasLegacyChoices
        ? "Existing continuations"
        : "Choices";
  const addChoiceLabel = node.type === "information" ? "Path" : "Choice";

  return (
    <article
      className={[
        "reasoning-node",
        `editable-flow-node-${node.type}`,
        "editable-flow-node node-drag-handle",
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
        <div className="flex items-center gap-2">
          {isStartNode ? (
            <span className="rounded-sm border border-moss/25 bg-leaf/15 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-moss">
              Start
            </span>
          ) : (
            <button
              className="nodrag nopan editable-node-delete-button"
              type="button"
              title="Delete node"
              aria-label="Delete node"
              onMouseDown={(event) => event.stopPropagation()}
              onPointerDown={(event) => {
                event.stopPropagation();
                if (event.button === 0) {
                  onDeleteNode(node.id);
                }
              }}
              onClick={(event) => {
                event.stopPropagation();
                onDeleteNode(node.id);
              }}
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>
      <input
        aria-label="Node title"
        className="nodrag editable-node-title"
        placeholder="Card title"
        value={node.title}
        onChange={(event) => onUpdateNode(node.id, { title: event.target.value })}
      />

      <textarea
        aria-label="Node text"
        className="nodrag nowheel editable-node-text"
        placeholder={
          node.type === "question"
            ? "Optional description or context."
            : "Optional supporting description."
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
            onUpdateNode(
              node.id,
              nodeTypePatch(event.target.value as ThoughtFlowNodeType, node),
            )
          }
        >
          {nodeTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>

      {shouldShowChoices ? (
        <section className="mt-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-moss">
              {choiceSectionTitle}
            </p>
            {canAddChoices ? (
              <button
                className="nodrag editor-card-command"
                type="button"
                onClick={() => onAddChoice(node.id)}
              >
                <Plus size={14} />
                {addChoiceLabel}
              </button>
            ) : null}
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
                {node.type === "information"
                  ? "Add a continuation path, then connect it to the next card."
                  : "Add a choice, then drag from its handle to another node."}
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {canHaveCtas ? (
        <section className="mt-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-clay">
              CTA buttons
            </p>
            <button
              className="nodrag editor-card-command"
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
      ) : null}
    </article>
  );
}

function supportsBranchChoices(type: ThoughtFlowNodeType) {
  return type === "question" || type === "information";
}

function supportsCtas(type: ThoughtFlowNodeType) {
  return type === "conclusion";
}

function nodeTypePatch(
  type: ThoughtFlowNodeType,
  node: ThoughtFlowNode,
): Partial<ThoughtFlowNode> {
  return {
    type,
    choices: supportsBranchChoices(type) ? node.choices : [],
    ctas: supportsCtas(type)
      ? node.ctas ?? [{ label: "", url: "", style: "primary" }]
      : undefined,
  };
}

export const EditableFlowNode = memo(EditableFlowNodeComponent);
