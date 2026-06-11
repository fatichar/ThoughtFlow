import { ReactFlowProvider } from "@xyflow/react";
import {
  AlertTriangle,
  Copy,
  FilePlus2,
  GitBranch,
  ListTree,
  Play,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  fetchPublishedFlow,
  listFlows,
  savePublishedFlow,
  type FlowSummary,
} from "../api/flows";
import { listTags } from "../api/tags";
import { veganEthicsFlow } from "../data/veganEthicsFlow";
import { useFlowPlayer } from "../hooks/useFlowPlayer";
import type {
  Tag,
  ThoughtFlowChoice,
  ThoughtFlowCta,
  ThoughtFlowFlow,
  ThoughtFlowNode,
  ThoughtFlowNodeType,
} from "../types/flow";
import { FlowPlayer } from "./FlowPlayer";
import { FlowLibrary } from "./FlowLibrary";
import { TagComboBox } from "./TagComboBox";

type ValidationIssue = {
  id: string;
  label: string;
  severity: "warning" | "error";
};

const nodeTypes: ThoughtFlowNodeType[] = [
  "question",
  "information",
  "conclusion",
  "action",
];

const flowTitlePrompt = "Untitled Flow";
const nodeTitlePrompt = "Untitled node";
const startNodeTitlePrompt = "Start here";
const nodeTextPrompt = "Write the thought, question, or next step here.";
const startNodeTextPrompt = "Write the opening question or idea for this flow.";
const choiceLabelPrompt = "New choice";
const ctaLabelPrompt = "Try Vegan for 7 Days";
const ctaUrlPrompt = "https://example.com";

export function FlowEditor() {
  const [editorSlug, setEditorSlug] = useState(() => editorSlugFromUrl());
  const [flow, setFlow] = useState<ThoughtFlowFlow>(() =>
    flowForEditorUrl(editorSlugFromUrl()),
  );
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState(flow.startNodeId);
  const [previewStartNodeId, setPreviewStartNodeId] = useState(
    flow.startNodeId,
  );
  const [previewRunVersion, setPreviewRunVersion] = useState(0);
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(
    () => new Set(Object.keys(flow.nodes)),
  );
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [flowSummaries, setFlowSummaries] = useState<FlowSummary[]>([]);
  const [listState, setListState] = useState<"idle" | "loading" | "error">("idle");
  const [isCompactPreview, setIsCompactPreview] = useState(
    () => window.innerWidth <= 1180,
  );

  const selectedNode = flow.nodes[selectedNodeId] ?? flow.nodes[flow.startNodeId];
  const validation = useMemo(() => validateFlow(flow), [flow]);
  const previewFlow = useMemo(
    () => ({
      ...flow,
      id: `${flow.id}-preview-${previewStartNodeId}-${previewRunVersion}`,
      startNodeId: previewStartNodeId,
    }),
    [flow, previewRunVersion, previewStartNodeId],
  );
  const previewPlayer = useFlowPlayer(previewFlow);

  useEffect(() => {
    const syncEditorSlug = () => setEditorSlug(editorSlugFromUrl());

    window.addEventListener("popstate", syncEditorSlug);
    return () => window.removeEventListener("popstate", syncEditorSlug);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1180px)");
    const syncPreviewLayout = () => setIsCompactPreview(mediaQuery.matches);

    syncPreviewLayout();
    mediaQuery.addEventListener("change", syncPreviewLayout);

    return () => mediaQuery.removeEventListener("change", syncPreviewLayout);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    listTags(controller.signal)
      .then((tags) => setAvailableTags(tags))
      .catch((e) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        console.error("Failed to fetch tags", e);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (editorSlug) {
      return;
    }

    const controller = new AbortController();
    setListState("loading");

    listFlows(controller.signal)
      .then((summaries) => {
        setFlowSummaries(summaries);
        setListState("idle");
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setListState("error");
      });

    return () => controller.abort();
  }, [editorSlug]);

  useEffect(() => {
    if (!editorSlug || editorSlug === "is-taste-enough") {
      if (editorSlug === "is-taste-enough") {
        loadFlowIntoEditor({ ...veganEthicsFlow, slug: "is-taste-enough" });
      }

      return;
    }

    const controller = new AbortController();

    fetchPublishedFlow(editorSlug, controller.signal)
      .then((publishedFlow) => {
        const loadedFlow = {
          ...publishedFlow.flow,
          id: publishedFlow.flow.id || slugToId(publishedFlow.slug),
          slug: publishedFlow.slug,
          title: publishedFlow.flow.title || publishedFlow.title,
          description: publishedFlow.flow.description ?? publishedFlow.description,
          tags: publishedFlow.tags,
        };

        loadFlowIntoEditor(loadedFlow);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      });

    return () => controller.abort();
  }, [editorSlug]);

  function loadFlowIntoEditor(nextFlow: ThoughtFlowFlow) {
    setFlow(nextFlow);
    setSelectedNodeId(nextFlow.startNodeId);
    setPreviewStartNodeId(nextFlow.startNodeId);
    setPreviewRunVersion((version) => version + 1);
    setExpandedNodeIds(new Set(Object.keys(nextFlow.nodes)));
  }

  function updateNode(nodeId: string, patch: Partial<ThoughtFlowNode>) {
    setFlow((current) => ({
      ...current,
      nodes: {
        ...current.nodes,
        [nodeId]: {
          ...current.nodes[nodeId],
          ...patch,
        },
      },
    }));
  }

  function duplicateNode() {
    const id = uniqueNodeId(flow, selectedNode.type);
    setFlow((current) => ({
      ...current,
      nodes: {
        ...current.nodes,
        [id]: {
          ...selectedNode,
          id,
          title: selectedNode.title ? `${selectedNode.title} Copy` : "",
          choices: selectedNode.choices.map((choice, index) => ({
            ...choice,
            id: `${id}_choice_${index + 1}`,
          })),
          ctas: selectedNode.ctas?.map((cta) => ({ ...cta })),
        },
      },
    }));
    setSelectedNodeId(id);
  }

  function deleteNode() {
    if (selectedNode.id === flow.startNodeId) {
      return;
    }

    const nextSelectedId = flow.startNodeId;
    setFlow((current) => {
      const nextNodes = { ...current.nodes };
      delete nextNodes[selectedNode.id];

      for (const nodeId of Object.keys(nextNodes)) {
        nextNodes[nodeId] = {
          ...nextNodes[nodeId],
          choices: nextNodes[nodeId].choices.filter(
            (choice) => choice.targetNodeId !== selectedNode.id,
          ),
        };
      }

      return { ...current, nodes: nextNodes };
    });
    setSelectedNodeId(nextSelectedId);
  }

  function addChoice() {
    const choice: ThoughtFlowChoice = {
      id: uniqueChoiceId(selectedNode),
      label: "",
      targetNodeId: "",
    };
    updateNode(selectedNode.id, { choices: [...selectedNode.choices, choice] });
  }

  function updateChoice(choiceId: string, patch: Partial<ThoughtFlowChoice>) {
    updateNode(selectedNode.id, {
      choices: selectedNode.choices.map((choice) =>
        choice.id === choiceId ? { ...choice, ...patch } : choice,
      ),
    });
  }

  function deleteChoice(choiceId: string) {
    updateNode(selectedNode.id, {
      choices: selectedNode.choices.filter((choice) => choice.id !== choiceId),
    });
  }

  function createConnectedNode(choiceId: string) {
    const id = uniqueNodeId(flow, "question");
    const node = makeNode(id, "question");

    setFlow((current) => ({
      ...current,
      nodes: { ...current.nodes, [id]: node },
    }));
    updateChoice(choiceId, { targetNodeId: id });
    setSelectedNodeId(id);
    setExpandedNodeIds((current) => new Set([...current, selectedNode.id]));
  }

  function updateCta(index: number, patch: Partial<ThoughtFlowCta>) {
    const ctas = [...(selectedNode.ctas ?? [])];
    ctas[index] = { ...ctas[index], ...patch };
    updateNode(selectedNode.id, { ctas });
  }

  function addCta() {
    updateNode(selectedNode.id, {
      ctas: [
        ...(selectedNode.ctas ?? []),
        { label: "", url: "", style: "secondary" },
      ],
    });
  }

  function deleteCta(index: number) {
    updateNode(selectedNode.id, {
      ctas: selectedNode.ctas?.filter((_, ctaIndex) => ctaIndex !== index) ?? [],
    });
  }

  function playFromHere(nodeId: string) {
    setSelectedNodeId(nodeId);
    setPreviewStartNodeId(nodeId);
    setPreviewRunVersion((version) => version + 1);
  }

  function createFlow() {
    const nextFlow = makeFlowDraft();
    loadFlowIntoEditor(nextFlow);
    window.history.pushState(null, "", `/editor/${nextFlow.slug}`);
    setEditorSlug(nextFlow.slug ?? null);
  }

  async function saveFlowUrl() {
    const slug = slugify(flow.title);
    const title = flow.title.trim() || titleFromSlug(slug);
    const nextFlow = {
      ...flow,
      id: slugToId(slug),
      slug,
      title,
    };

    setSaveState("saving");
    setFlow(nextFlow);
    window.history.replaceState(null, "", `/editor/${slug}`);
    setEditorSlug(slug);

    try {
      await savePublishedFlow({
        slug,
        title,
        description: nextFlow.description,
        flow: nextFlow,
        tagIds: nextFlow.tags?.map((t) => t.id) ?? [],
      });
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  if (!editorSlug) {
    return (
      <FlowLibrary
        flowSummaries={flowSummaries}
        listState={listState}
        mode="edit"
        onCreateFlow={createFlow}
      />
    );
  }

  return (
    <div className="grid h-screen grid-cols-[320px_minmax(420px,540px)_minmax(0,1fr)] overflow-hidden bg-canvas text-ink max-[1180px]:grid-cols-[300px_1fr]">
      <aside className="min-h-0 overflow-y-auto border-r border-ink/10 bg-[#fbf8f0] px-4 py-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="font-display text-2xl leading-7">Flow editor</p>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-moss">
              Writing outline
            </p>
          </div>
          <button
            className="icon-button"
            type="button"
            title="Publish flow"
            aria-label="Publish flow"
            disabled={saveState === "saving"}
            onClick={saveFlowUrl}
          >
            <Save size={18} />
          </button>
        </div>

        <div className="mb-4 space-y-3 border border-ink/10 bg-white/45 px-3 py-3">
          <label className="block text-[11px] font-extrabold uppercase tracking-[0.14em] text-moss">
            Flow title
            <input
              className="mt-2 block w-full border border-ink/10 bg-[#fffdf7] px-2 py-2 text-sm font-extrabold normal-case tracking-normal text-ink outline-none focus:border-moss"
              placeholder={flowTitlePrompt}
              value={flow.title}
              onChange={(event) =>
                setFlow((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
            />
          </label>
          <div className="block text-[11px] font-extrabold uppercase tracking-[0.14em] text-moss">
            <p>Tags</p>
            <div className="mt-2 normal-case tracking-normal">
              <TagComboBox
                availableTags={availableTags}
                selectedTags={flow.tags ?? []}
                onTagsChange={(tags) =>
                  setFlow((current) => ({
                    ...current,
                    tags,
                  }))
                }
                onTagCreated={(tag) =>
                  setAvailableTags((current) =>
                    current.some((existingTag) => existingTag.id === tag.id)
                      ? current
                      : [...current, tag],
                  )
                }
              />
            </div>
          </div>
          <p className="mt-1 truncate text-[11px] font-bold uppercase tracking-[0.12em] text-ink/45">
            /play/{flow.slug ?? flow.id}
          </p>
          {saveState !== "idle" ? (
            <p className="mt-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-moss">
              {saveState === "saving"
                ? "Saving..."
                : saveState === "saved"
                  ? "Published"
                  : "Save failed"}
            </p>
          ) : null}
        </div>

        <OutlineNode
          depth={0}
          expandedNodeIds={expandedNodeIds}
          flow={flow}
          nodeId={flow.startNodeId}
          onPlayFromHere={playFromHere}
          onSelect={setSelectedNodeId}
          onToggle={(nodeId) =>
            setExpandedNodeIds((current) => toggleSetValue(current, nodeId))
          }
          selectedNodeId={selectedNode.id}
          seenNodeIds={new Set()}
        />

        <ValidationPanel issues={validation} />
      </aside>

      <section className="min-h-0 overflow-y-auto border-r border-ink/10 bg-[#fffdf7] px-5 py-5">
        <NodeEditorForm
          flow={flow}
          node={selectedNode}
          onAddChoice={addChoice}
          onAddCta={addCta}
          onCreateConnectedNode={createConnectedNode}
          onDeleteChoice={deleteChoice}
          onDeleteCta={deleteCta}
          onDeleteNode={deleteNode}
          onDuplicateNode={duplicateNode}
          onPlayFromHere={playFromHere}
          onUpdateChoice={updateChoice}
          onUpdateCta={updateCta}
          onUpdateNode={(patch) => updateNode(selectedNode.id, patch)}
        />
        {isCompactPreview ? (
          <section className="mt-6 h-[560px] overflow-hidden border border-ink/10 bg-canvas">
            <ReactFlowProvider>
              <PreviewHeader previewStartNodeId={previewStartNodeId} />
              <div className="h-[calc(560px-56px)]">
                <FlowPlayer
                  key={`inline-${previewFlow.id}`}
                  flow={previewFlow}
                  player={previewPlayer}
                />
              </div>
            </ReactFlowProvider>
          </section>
        ) : null}
      </section>

      {!isCompactPreview ? (
        <section className="min-h-0 bg-canvas">
          <ReactFlowProvider>
            <PreviewHeader previewStartNodeId={previewStartNodeId} />
            <div className="h-[calc(100vh-56px)]">
              <FlowPlayer
                key={`wide-${previewFlow.id}`}
                flow={previewFlow}
                player={previewPlayer}
              />
            </div>
          </ReactFlowProvider>
        </section>
      ) : null}
    </div>
  );
}


function PreviewHeader({ previewStartNodeId }: { previewStartNodeId: string }) {
  return (
    <div className="flex h-14 items-center justify-between border-b border-ink/10 bg-[#f9f6ed] px-5">
      <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-moss">
        <Play size={15} />
        Preview from {previewStartNodeId}
      </div>
    </div>
  );
}

type OutlineNodeProps = {
  depth: number;
  expandedNodeIds: Set<string>;
  flow: ThoughtFlowFlow;
  nodeId: string;
  onPlayFromHere: (nodeId: string) => void;
  onSelect: (nodeId: string) => void;
  onToggle: (nodeId: string) => void;
  selectedNodeId: string;
  seenNodeIds: Set<string>;
};

function OutlineNode({
  depth,
  expandedNodeIds,
  flow,
  nodeId,
  onPlayFromHere,
  onSelect,
  onToggle,
  selectedNodeId,
  seenNodeIds,
}: OutlineNodeProps) {
  const node = flow.nodes[nodeId];
  if (!node) {
    return null;
  }

  const isExpanded = expandedNodeIds.has(nodeId);
  const isSelected = selectedNodeId === nodeId;
  const nextSeenNodeIds = new Set([...seenNodeIds, nodeId]);

  return (
    <div className="mb-1" style={{ marginLeft: depth * 12 }}>
      <div
        className={[
          "flex items-center gap-2 border px-2 py-2 text-left transition",
          isSelected
            ? "border-moss bg-leaf/15"
            : "border-transparent hover:border-ink/10 hover:bg-white/45",
        ].join(" ")}
      >
        <button
          className="grid h-6 w-6 place-items-center text-ink/60"
          type="button"
          title={expandedNodeIds.has(nodeId) ? "Collapse node" : "Expand node"}
          aria-label={expandedNodeIds.has(nodeId) ? "Collapse node" : "Expand node"}
          onClick={() => onToggle(nodeId)}
        >
          <ListTree size={14} />
        </button>
        <button
          className="min-w-0 flex-1 text-left"
          type="button"
          onClick={() => onSelect(nodeId)}
        >
          <span className="block truncate text-sm font-extrabold">
            {node.title || nodeTitleFallback(node, flow)}
          </span>
          <span className="block text-[11px] font-bold uppercase tracking-[0.12em] text-ink/45">
            {node.type}
          </span>
        </button>
        <button
          className="grid h-7 w-7 place-items-center text-moss"
          type="button"
          title="Play from here"
          aria-label="Play from here"
          onClick={() => onPlayFromHere(nodeId)}
        >
          <Play size={15} />
        </button>
      </div>

      {isExpanded
        ? node.choices.map((choice) => (
            <div className="mt-1" key={choice.id} style={{ marginLeft: 22 }}>
              <div className="flex items-center gap-2 py-1 text-xs font-bold text-ink/55">
                <GitBranch size={13} />
                <span className="truncate">{choice.label}</span>
              </div>
              {choice.targetNodeId && !nextSeenNodeIds.has(choice.targetNodeId) ? (
                <OutlineNode
                  depth={depth + 1}
                  expandedNodeIds={expandedNodeIds}
                  flow={flow}
                  nodeId={choice.targetNodeId}
                  onPlayFromHere={onPlayFromHere}
                  onSelect={onSelect}
                  onToggle={onToggle}
                  selectedNodeId={selectedNodeId}
                  seenNodeIds={nextSeenNodeIds}
                />
              ) : (
                <button
                  className="ml-5 truncate text-xs font-semibold text-ink/45"
                  type="button"
                  onClick={() => choice.targetNodeId && onSelect(choice.targetNodeId)}
                >
                  {choice.targetNodeId || "Missing target"}
                </button>
              )}
            </div>
          ))
        : null}
    </div>
  );
}

type NodeEditorFormProps = {
  flow: ThoughtFlowFlow;
  node: ThoughtFlowNode;
  onAddChoice: () => void;
  onAddCta: () => void;
  onCreateConnectedNode: (choiceId: string) => void;
  onDeleteChoice: (choiceId: string) => void;
  onDeleteCta: (index: number) => void;
  onDeleteNode: () => void;
  onDuplicateNode: () => void;
  onPlayFromHere: (nodeId: string) => void;
  onUpdateChoice: (choiceId: string, patch: Partial<ThoughtFlowChoice>) => void;
  onUpdateCta: (index: number, patch: Partial<ThoughtFlowCta>) => void;
  onUpdateNode: (patch: Partial<ThoughtFlowNode>) => void;
};

function NodeEditorForm({
  flow,
  node,
  onAddChoice,
  onAddCta,
  onCreateConnectedNode,
  onDeleteChoice,
  onDeleteCta,
  onDeleteNode,
  onDuplicateNode,
  onPlayFromHere,
  onUpdateChoice,
  onUpdateCta,
  onUpdateNode,
}: NodeEditorFormProps) {
  const isActionNode = node.type === "action";
  const canHaveChoices = node.type !== "action";

  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-3xl leading-9">
            {node.title || nodeTitleFallback(node, flow)}
          </p>
          <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-moss">
            Node form
          </p>
        </div>
        <div className="flex gap-2">
          <button className="icon-button" type="button" title="Play from here" aria-label="Play from here" onClick={() => onPlayFromHere(node.id)}>
            <Play size={18} />
          </button>
          <button className="icon-button" type="button" title="Duplicate node" aria-label="Duplicate node" onClick={onDuplicateNode}>
            <Copy size={18} />
          </button>
          <button className="icon-button" type="button" title="Delete node" aria-label="Delete node" onClick={onDeleteNode}>
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <label className="editor-label">
        Node type
        <select
          className="editor-input"
          value={node.type}
          onChange={(event) =>
            onUpdateNode({
              type: event.target.value as ThoughtFlowNodeType,
              choices:
                event.target.value === "action"
                  ? []
                  : node.choices.length > 0
                    ? node.choices
                    : [],
              ctas:
                event.target.value === "action"
                  ? node.ctas ?? [
                      {
                        label: "",
                        url: "",
                        style: "primary",
                      },
                    ]
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

      <label className="editor-label">
        Title
        <input
          className="editor-input"
          placeholder={
            node.id === flow.startNodeId ? startNodeTitlePrompt : nodeTitlePrompt
          }
          value={node.title}
          onChange={(event) => onUpdateNode({ title: event.target.value })}
        />
      </label>

      <label className="editor-label">
        Text/content
        <textarea
          className="editor-input min-h-36 resize-y leading-6"
          placeholder={node.type === "question" ? startNodeTextPrompt : nodeTextPrompt}
          value={node.text}
          onChange={(event) => onUpdateNode({ text: event.target.value })}
        />
      </label>

      {canHaveChoices ? (
        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-moss">
              Choices
            </p>
            <button className="editor-small-button" type="button" onClick={onAddChoice}>
              <Plus size={15} />
              Add choice
            </button>
          </div>
          <div className="space-y-3">
            {node.choices.map((choice) => (
              <div className="border border-ink/10 bg-canvas/55 p-3" key={choice.id}>
                <input
                  className="editor-input mb-2"
                  placeholder={choiceLabelPrompt}
                  value={choice.label}
                  onChange={(event) =>
                    onUpdateChoice(choice.id, { label: event.target.value })
                  }
                />
                <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                  <select
                    className="editor-input"
                    value={choice.targetNodeId}
                    onChange={(event) =>
                      onUpdateChoice(choice.id, { targetNodeId: event.target.value })
                    }
                  >
                    <option value="">Choose target</option>
                    {Object.values(flow.nodes).map((target) => (
                      <option key={target.id} value={target.id}>
                        {targetOptionLabel(target, flow)}
                      </option>
                    ))}
                  </select>
                  <button
                    className="editor-small-button"
                    type="button"
                    onClick={() => onCreateConnectedNode(choice.id)}
                  >
                    <FilePlus2 size={15} />
                    New target
                  </button>
                  <button
                    className="icon-button"
                    type="button"
                    title="Delete choice"
                    aria-label="Delete choice"
                    onClick={() => onDeleteChoice(choice.id)}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
            ))}
            {node.choices.length === 0 ? (
              <p className="border border-dashed border-ink/20 px-3 py-3 text-sm font-semibold text-ink/50">
                No choices yet.
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {isActionNode ? (
        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-clay">
              CTA buttons
            </p>
            <button className="editor-small-button" type="button" onClick={onAddCta}>
              <Plus size={15} />
              Add CTA
            </button>
          </div>
          <div className="space-y-3">
            {(node.ctas ?? []).map((cta, index) => (
              <div className="border border-clay/15 bg-[#fff7ea] p-3" key={index}>
                <div className="grid gap-2">
                  <input
                    className="editor-input"
                    placeholder={ctaLabelPrompt}
                    value={cta.label}
                    onChange={(event) => onUpdateCta(index, { label: event.target.value })}
                  />
                  <input
                    className="editor-input"
                    placeholder={ctaUrlPrompt}
                    value={cta.url}
                    onChange={(event) => onUpdateCta(index, { url: event.target.value })}
                  />
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <select
                      className="editor-input"
                      value={cta.style}
                      onChange={(event) =>
                        onUpdateCta(index, {
                          style: event.target.value as ThoughtFlowCta["style"],
                        })
                      }
                    >
                      <option value="primary">primary</option>
                      <option value="secondary">secondary</option>
                    </select>
                    <button
                      className="icon-button"
                      type="button"
                      title="Delete CTA button"
                      aria-label="Delete CTA button"
                      onClick={() => onDeleteCta(index)}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function ValidationPanel({ issues }: { issues: ValidationIssue[] }) {
  return (
    <section className="mt-6 border-t border-ink/10 pt-4">
      <div className="mb-3 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-moss">
        <AlertTriangle size={15} />
        Validation
      </div>
      {issues.length === 0 ? (
        <p className="border border-moss/20 bg-leaf/10 px-3 py-3 text-sm font-bold text-moss">
          No structural issues.
        </p>
      ) : (
        <ul className="space-y-2">
          {issues.map((issue) => (
            <li
              className="border border-clay/20 bg-white/55 px-3 py-2 text-sm font-semibold text-ink/70"
              key={issue.id}
            >
              {issue.label}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function makeNode(id: string, type: ThoughtFlowNodeType): ThoughtFlowNode {
  return {
    id,
    title: "",
    text: "",
    type,
    choices: [],
    ctas:
      type === "action"
        ? [{ label: "", url: "", style: "primary" }]
        : undefined,
  };
}

function makeFlowDraft(): ThoughtFlowFlow {
  const timestamp = Date.now().toString(36);
  const slug = `untitled-flow-${timestamp}`;
  const startNodeId = "start";

  return {
    id: `flow_${timestamp}`,
    slug,
    title: "",
    description: "",
    tags: [],
    startNodeId,
    nodes: {
      [startNodeId]: {
        id: startNodeId,
        title: "",
        text: "",
        type: "question",
        choices: [],
      },
    },
  };
}

function editorSlugFromUrl() {
  const match = window.location.pathname.match(/^\/editor\/([^/]+)\/?$/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function flowForEditorUrl(slug: string | null): ThoughtFlowFlow {
  if (slug === "is-taste-enough") {
    return { ...veganEthicsFlow, slug: "is-taste-enough" };
  }

  if (!slug) {
    return makeFlowDraft();
  }

  return {
    ...makeFlowDraft(),
    id: slugToId(slug),
    slug,
    title: titleFromSlug(slug),
  };
}

function uniqueNodeId(flow: ThoughtFlowFlow, type: ThoughtFlowNodeType) {
  const prefix =
    type === "information" ? "info" : type === "conclusion" ? "end" : type;
  let index = Object.keys(flow.nodes).length + 1;
  let id = `${prefix}_${index}`;

  while (flow.nodes[id]) {
    index += 1;
    id = `${prefix}_${index}`;
  }

  return id;
}

function uniqueChoiceId(node: ThoughtFlowNode) {
  let index = node.choices.length + 1;
  let id = `${node.id}_choice_${index}`;

  while (node.choices.some((choice) => choice.id === id)) {
    index += 1;
    id = `${node.id}_choice_${index}`;
  }

  return id;
}

function toggleSetValue(values: Set<string>, value: string) {
  const next = new Set(values);
  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }

  return next;
}

function validateFlow(flow: ThoughtFlowFlow) {
  const issueMap = new Map<string, ValidationIssue>();
  const reachableNodeIds = collectReachableNodeIds(flow);

  for (const node of Object.values(flow.nodes)) {
    if (!reachableNodeIds.has(node.id)) {
      issueMap.set(`unreachable-${node.id}`, {
        id: `unreachable-${node.id}`,
        label: `${node.title || nodeTitleFallback(node, flow)} is unreachable from the start node.`,
        severity: "warning",
      });
    }

    if (
      node.choices.length === 0 &&
      node.type !== "conclusion" &&
      node.type !== "action"
    ) {
      issueMap.set(`dead-${node.id}`, {
        id: `dead-${node.id}`,
        label: `${node.title || nodeTitleFallback(node, flow)} is a dead-end ${node.type} node.`,
        severity: "warning",
      });
    }

    for (const choice of node.choices) {
      if (!choice.targetNodeId || !flow.nodes[choice.targetNodeId]) {
        issueMap.set(`missing-${node.id}-${choice.id}`, {
          id: `missing-${node.id}-${choice.id}`,
          label: `${node.title || nodeTitleFallback(node, flow)} has a choice with a missing target.`,
          severity: "error",
        });
      }
    }
  }

  return [...issueMap.values()];
}

function nodeTitleFallback(node: ThoughtFlowNode, flow: ThoughtFlowFlow) {
  return node.id === flow.startNodeId ? startNodeTitlePrompt : nodeTitlePrompt;
}

function targetOptionLabel(target: ThoughtFlowNode, flow: ThoughtFlowFlow) {
  const title = target.title || nodeTitleFallback(target, flow);
  const duplicateTitleCount = Object.values(flow.nodes).filter(
    (node) => (node.title || nodeTitleFallback(node, flow)) === title,
  ).length;

  return duplicateTitleCount > 1 ? `${title} (${target.id})` : title;
}

function collectReachableNodeIds(flow: ThoughtFlowFlow) {
  const reachableNodeIds = new Set<string>();
  const stack = [flow.startNodeId];

  while (stack.length > 0) {
    const nodeId = stack.pop();
    if (!nodeId || reachableNodeIds.has(nodeId)) {
      continue;
    }

    const node = flow.nodes[nodeId];
    if (!node) {
      continue;
    }

    reachableNodeIds.add(nodeId);
    for (const choice of node.choices) {
      stack.push(choice.targetNodeId);
    }
  }

  return reachableNodeIds;
}

function slugToId(slug: string) {
  return slug.replace(/[^a-zA-Z0-9_]+/g, "_").replace(/^_+|_+$/g, "") || "flow";
}

function slugify(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/['"]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "untitled-flow"
  );
}

function titleFromSlug(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ") || "Untitled Flow";
}
