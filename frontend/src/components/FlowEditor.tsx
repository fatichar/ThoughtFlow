import {
  Background,
  BackgroundVariant,
  ReactFlow,
  ReactFlowProvider,
  type Connection,
  type Edge,
  type EdgeTypes,
  type Node,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  AlertTriangle,
  Copy,
  Download,
  ExternalLink,
  FilePlus2,
  Network,
  Play,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  fetchPublishedFlow,
  listFlows,
  savePublishedFlow,
  type FlowSummary,
  type SavePublishedFlowInput,
} from "../api/flows";
import { listTags } from "../api/tags";
import { veganEthicsFlow } from "../data/veganEthicsFlow";
import type {
  Tag,
  ThoughtFlowChoice,
  ThoughtFlowCta,
  ThoughtFlowFlow,
  ThoughtFlowNode,
  ThoughtFlowNodeType,
} from "../types/flow";
import { layoutEditableFlow } from "../utils/layoutEditorFlow";
import { AnimatedEdge } from "./AnimatedEdge";
import {
  EditableFlowNode,
  type EditableFlowNodeData,
} from "./EditableFlowNode";
import { FlowLibrary } from "./FlowLibrary";
import { TagComboBox } from "./TagComboBox";

type ValidationIssue = {
  id: string;
  label: string;
  nodeId?: string;
  severity: "warning" | "error";
};

const editorNodeTypes: NodeTypes = {
  editable: EditableFlowNode,
};

const editorEdgeTypes: EdgeTypes = {
  animated: AnimatedEdge,
};

const nodeTypes: ThoughtFlowNodeType[] = [
  "question",
  "information",
  "conclusion",
  "action",
];

const flowTitlePrompt = "Untitled Flow";
const startNodeTitlePrompt = "Start here";
const nodeTitlePrompt = "Untitled node";
const draftStoragePrefix = "thoughtflow-editor-draft";

export function FlowEditor() {
  const [editorSlug, setEditorSlug] = useState(() => editorSlugFromUrl());
  const [flow, setFlow] = useState<ThoughtFlowFlow>(() =>
    flowForEditorUrl(editorSlugFromUrl()),
  );
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState(flow.startNodeId);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [draftState, setDraftState] = useState<"idle" | "saved">("idle");
  const [flowSummaries, setFlowSummaries] = useState<FlowSummary[]>([]);
  const [listState, setListState] = useState<"idle" | "loading" | "error">("idle");
  const hasHydratedDraftRef = useRef(false);

  const selectedNode = flow.nodes[selectedNodeId] ?? flow.nodes[flow.startNodeId];
  const validation = useMemo(() => validateFlow(flow), [flow]);
  const positionedNodes = useMemo(() => layoutEditableFlow(flow), [flow]);
  const playSlug = flow.slug ?? slugify(flow.title || flow.id);

  const nodes = useMemo<Node<EditableFlowNodeData>[]>(
    () =>
      positionedNodes.map(({ id, position }) => {
        const node = flow.nodes[id];
        return {
          id,
          type: "editable",
          position,
          draggable: false,
          data: {
            node,
            isSelected: id === selectedNode?.id,
            isStartNode: id === flow.startNodeId,
            onAddChoice: addChoice,
            onAddCta: addCta,
            onCreateConnectedNode: createConnectedNode,
            onDeleteChoice: deleteChoice,
            onDeleteCta: deleteCta,
            onSelect: selectNode,
            onUpdateChoice: updateChoice,
            onUpdateCta: updateCta,
            onUpdateNode: updateNode,
          },
        };
      }),
    [flow, positionedNodes, selectedNode?.id],
  );

  const edges = useMemo<Edge[]>(
    () =>
      Object.values(flow.nodes).flatMap((node) =>
        node.choices
          .filter((choice) => choice.targetNodeId && flow.nodes[choice.targetNodeId])
          .map((choice) => ({
            id: `${node.id}-${choice.id}-${choice.targetNodeId}`,
            source: node.id,
            sourceHandle: choice.id,
            target: choice.targetNodeId,
            type: "animated",
            data: { active: false },
          })),
      ),
    [flow.nodes],
  );

  useEffect(() => {
    const slug = flow.slug ?? editorSlug;
    if (!slug) {
      return;
    }

    persistDraft(slug, makeSaveInput(flow, slug));
    setDraftState("saved");
  }, [editorSlug, flow]);

  useEffect(() => {
    const syncEditorSlug = () => setEditorSlug(editorSlugFromUrl());

    window.addEventListener("popstate", syncEditorSlug);
    return () => window.removeEventListener("popstate", syncEditorSlug);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    listTags(controller.signal)
      .then((tags) => setAvailableTags(tags))
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        console.error("Failed to fetch tags", error);
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

        if (hasHydratedDraftRef.current) {
          return;
        }

        const draft = readDraft(editorSlug);
        if (draft?.flow) {
          hasHydratedDraftRef.current = true;
          loadFlowIntoEditor(draft.flow);
        }
      });

    return () => controller.abort();
  }, [editorSlug]);

  function loadFlowIntoEditor(nextFlow: ThoughtFlowFlow) {
    setFlow(nextFlow);
    setSelectedNodeId(nextFlow.startNodeId);
    setSaveError(null);
  }

  function selectNode(nodeId: string) {
    if (flow.nodes[nodeId]) {
      setSelectedNodeId(nodeId);
    }
  }

  function updateNode(nodeId: string, patch: Partial<ThoughtFlowNode>) {
    setSaveState("idle");
    setSaveError(null);
    setFlow((current) => {
      const existingNode = current.nodes[nodeId];
      if (!existingNode) {
        return current;
      }

      return {
        ...current,
        nodes: {
          ...current.nodes,
          [nodeId]: {
            ...existingNode,
            ...patch,
          },
        },
      };
    });
  }

  function addNode() {
    const id = uniqueNodeId(flow, "question");
    setSaveState("idle");
    setSaveError(null);
    setFlow((current) => ({
      ...current,
      nodes: {
        ...current.nodes,
        [id]: makeNode(id, "question"),
      },
    }));
    setSelectedNodeId(id);
  }

  function duplicateNode() {
    if (!selectedNode) {
      return;
    }

    const id = uniqueNodeId(flow, selectedNode.type);
    setSaveState("idle");
    setSaveError(null);
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
    if (!selectedNode || selectedNode.id === flow.startNodeId) {
      return;
    }

    const deletedNodeId = selectedNode.id;
    setSaveState("idle");
    setSaveError(null);
    setFlow((current) => {
      const nextNodes = { ...current.nodes };
      delete nextNodes[deletedNodeId];

      for (const nodeId of Object.keys(nextNodes)) {
        nextNodes[nodeId] = {
          ...nextNodes[nodeId],
          choices: nextNodes[nodeId].choices.filter(
            (choice) => choice.targetNodeId !== deletedNodeId,
          ),
        };
      }

      return { ...current, nodes: nextNodes };
    });
    setSelectedNodeId(flow.startNodeId);
  }

  function addChoice(nodeId: string) {
    const node = flow.nodes[nodeId];
    if (!node) {
      return;
    }

    const choice: ThoughtFlowChoice = {
      id: uniqueChoiceId(node),
      label: "",
      targetNodeId: "",
    };
    updateNode(nodeId, { choices: [...node.choices, choice] });
  }

  function updateChoice(
    nodeId: string,
    choiceId: string,
    patch: Partial<ThoughtFlowChoice>,
  ) {
    const node = flow.nodes[nodeId];
    if (!node) {
      return;
    }

    updateNode(nodeId, {
      choices: node.choices.map((choice) =>
        choice.id === choiceId ? { ...choice, ...patch } : choice,
      ),
    });
  }

  function deleteChoice(nodeId: string, choiceId: string) {
    const node = flow.nodes[nodeId];
    if (!node) {
      return;
    }

    updateNode(nodeId, {
      choices: node.choices.filter((choice) => choice.id !== choiceId),
    });
  }

  function createConnectedNode(nodeId: string, choiceId: string) {
    const sourceNode = flow.nodes[nodeId];
    if (!sourceNode) {
      return;
    }

    const id = uniqueNodeId(flow, "question");
    const node = makeNode(id, "question");
    setSaveState("idle");
    setSaveError(null);
    setFlow((current) => ({
      ...current,
      nodes: {
        ...current.nodes,
        [id]: node,
        [nodeId]: {
          ...current.nodes[nodeId],
          choices: current.nodes[nodeId].choices.map((choice) =>
            choice.id === choiceId ? { ...choice, targetNodeId: id } : choice,
          ),
        },
      },
    }));
    setSelectedNodeId(id);
  }

  function updateCta(nodeId: string, index: number, patch: Partial<ThoughtFlowCta>) {
    const node = flow.nodes[nodeId];
    if (!node) {
      return;
    }

    const ctas = [...(node.ctas ?? [])];
    ctas[index] = { ...ctas[index], ...patch };
    updateNode(nodeId, { ctas });
  }

  function addCta(nodeId: string) {
    const node = flow.nodes[nodeId];
    if (!node) {
      return;
    }

    updateNode(nodeId, {
      ctas: [...(node.ctas ?? []), { label: "", url: "", style: "secondary" }],
    });
  }

  function deleteCta(nodeId: string, index: number) {
    const node = flow.nodes[nodeId];
    if (!node) {
      return;
    }

    updateNode(nodeId, {
      ctas: node.ctas?.filter((_, ctaIndex) => ctaIndex !== index) ?? [],
    });
  }

  function connectChoice(connection: Connection) {
    if (!connection.source || !connection.sourceHandle || !connection.target) {
      return;
    }

    const sourceNode = flow.nodes[connection.source];
    if (!sourceNode || !flow.nodes[connection.target]) {
      return;
    }

    updateChoice(connection.source, connection.sourceHandle, {
      targetNodeId: connection.target,
    });
    setSelectedNodeId(connection.source);
  }

  function setSelectedAsStart() {
    if (!selectedNode) {
      return;
    }

    setSaveState("idle");
    setSaveError(null);
    setFlow((current) => ({
      ...current,
      startNodeId: selectedNode.id,
    }));
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
    setSaveError(null);
    setFlow(nextFlow);
    persistDraft(slug, makeSaveInput(nextFlow, slug));
    window.history.replaceState(null, "", `/editor/${slug}`);
    setEditorSlug(slug);

    try {
      await savePublishedFlow(makeSaveInput(nextFlow, slug));
      setSaveState("saved");
      clearDraft(slug);
    } catch (error) {
      setSaveState("error");
      setSaveError(error instanceof Error ? error.message : "Could not save flow");
    }
  }

  function exportDraft() {
    const slug = flow.slug ?? editorSlug ?? slugify(flow.title);
    downloadJson(`thoughtflow-${slug}.json`, makeSaveInput(flow, slug));
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
    <div className="grid h-screen grid-rows-[64px_minmax(0,1fr)] overflow-hidden bg-canvas text-ink">
      <header className="flex items-center justify-between gap-4 border-b border-ink/10 bg-[#fbf8f0] px-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Network size={18} className="text-moss" />
            <p className="truncate font-display text-2xl leading-7">
              {flow.title || flowTitlePrompt}
            </p>
          </div>
          <p className="truncate text-[11px] font-bold uppercase tracking-[0.16em] text-moss">
            WYSIWYG editor - {Object.keys(flow.nodes).length} nodes
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            className="editor-toolbar-button"
            href={`/play/${encodeURIComponent(playSlug)}`}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink size={16} />
            Play
          </a>
          <button className="editor-toolbar-button" type="button" onClick={exportDraft}>
            <Download size={16} />
            Export
          </button>
          <button className="editor-toolbar-button" type="button" onClick={addNode}>
            <Plus size={16} />
            Node
          </button>
          <button
            className="editor-toolbar-button editor-toolbar-button-primary"
            type="button"
            disabled={saveState === "saving"}
            onClick={saveFlowUrl}
          >
            <Save size={16} />
            {saveState === "saving" ? "Saving" : "Publish"}
          </button>
        </div>
      </header>

      <main className="grid min-h-0 grid-cols-[minmax(0,1fr)_380px] max-[980px]:grid-cols-1">
        <ReactFlowProvider>
          <section className="relative min-h-0 overflow-hidden border-r border-ink/10 max-[980px]:h-[62vh] max-[980px]:border-r-0">
            <div className="pointer-events-none absolute left-5 top-5 z-10 max-w-md rounded-sm border border-ink/10 bg-[#f9f6ed]/85 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-moss shadow-sm backdrop-blur">
              Edit cards directly. Drag from a choice handle to connect it.
            </div>
            <ReactFlow
              colorMode="light"
              edgeTypes={editorEdgeTypes}
              edges={edges}
              fitView
              maxZoom={1.3}
              minZoom={0.32}
              nodes={nodes}
              nodesConnectable
              nodesDraggable={false}
              nodeTypes={editorNodeTypes}
              onConnect={connectChoice}
              onNodeClick={(_, node) => selectNode(node.id)}
              panOnScroll
              proOptions={{ hideAttribution: true }}
            >
              <Background
                color="rgba(35,37,34,0.16)"
                gap={26}
                size={1.5}
                variant={BackgroundVariant.Dots}
              />
            </ReactFlow>
          </section>
        </ReactFlowProvider>

        <EditorInspector
          availableTags={availableTags}
          draftState={draftState}
          flow={flow}
          issues={validation}
          saveError={saveError}
          saveState={saveState}
          selectedNode={selectedNode}
          onAddChoice={addChoice}
          onAddCta={addCta}
          onCreateConnectedNode={createConnectedNode}
          onDeleteNode={deleteNode}
          onDuplicateNode={duplicateNode}
          onSelectIssue={(issue) => issue.nodeId && selectNode(issue.nodeId)}
          onSetStart={setSelectedAsStart}
          onTagsChange={(tags) => {
            setSaveState("idle");
            setSaveError(null);
            setFlow((current) => ({ ...current, tags }));
          }}
          onTagCreated={(tag) =>
            setAvailableTags((current) =>
              current.some((existingTag) => existingTag.id === tag.id)
                ? current
                : [...current, tag],
            )
          }
          onUpdateChoice={updateChoice}
          onUpdateFlow={(patch) => {
            setSaveState("idle");
            setSaveError(null);
            setFlow((current) => ({ ...current, ...patch }));
          }}
          onUpdateNode={updateNode}
        />
      </main>
    </div>
  );
}

type EditorInspectorProps = {
  availableTags: Tag[];
  draftState: "idle" | "saved";
  flow: ThoughtFlowFlow;
  issues: ValidationIssue[];
  saveError: string | null;
  saveState: "idle" | "saving" | "saved" | "error";
  selectedNode?: ThoughtFlowNode;
  onAddChoice: (nodeId: string) => void;
  onAddCta: (nodeId: string) => void;
  onCreateConnectedNode: (nodeId: string, choiceId: string) => void;
  onDeleteNode: () => void;
  onDuplicateNode: () => void;
  onSelectIssue: (issue: ValidationIssue) => void;
  onSetStart: () => void;
  onTagsChange: (tags: Tag[]) => void;
  onTagCreated: (tag: Tag) => void;
  onUpdateChoice: (
    nodeId: string,
    choiceId: string,
    patch: Partial<ThoughtFlowChoice>,
  ) => void;
  onUpdateFlow: (patch: Partial<ThoughtFlowFlow>) => void;
  onUpdateNode: (nodeId: string, patch: Partial<ThoughtFlowNode>) => void;
};

function EditorInspector({
  availableTags,
  draftState,
  flow,
  issues,
  saveError,
  saveState,
  selectedNode,
  onAddChoice,
  onAddCta,
  onCreateConnectedNode,
  onDeleteNode,
  onDuplicateNode,
  onSelectIssue,
  onSetStart,
  onTagsChange,
  onTagCreated,
  onUpdateChoice,
  onUpdateFlow,
  onUpdateNode,
}: EditorInspectorProps) {
  const canHaveChoices = selectedNode?.type !== "action";

  return (
    <aside className="min-h-0 overflow-y-auto bg-[#fffdf7] px-4 py-4">
      <section className="border border-ink/10 bg-white/45 px-3 py-3">
        <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.18em] text-moss">
          Flow details
        </p>
        <label className="editor-label">
          Flow title
          <input
            className="editor-input"
            placeholder={flowTitlePrompt}
            value={flow.title}
            onChange={(event) => onUpdateFlow({ title: event.target.value })}
          />
        </label>
        <label className="editor-label">
          Description
          <textarea
            className="editor-input min-h-24 resize-y leading-6"
            placeholder="Short description for the flow library."
            value={flow.description ?? ""}
            onChange={(event) => onUpdateFlow({ description: event.target.value })}
          />
        </label>
        <div className="block text-[11px] font-extrabold uppercase tracking-[0.14em] text-moss">
          <p>Tags</p>
          <div className="mt-2 normal-case tracking-normal">
            <TagComboBox
              availableTags={availableTags}
              selectedTags={flow.tags ?? []}
              onTagsChange={onTagsChange}
              onTagCreated={onTagCreated}
            />
          </div>
        </div>
        <p className="mt-3 truncate text-[11px] font-bold uppercase tracking-[0.12em] text-ink/45">
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
        {saveError ? (
          <p className="mt-2 border border-clay/25 bg-clay/10 px-2 py-2 text-xs font-bold leading-5 text-clay">
            {saveError}
          </p>
        ) : null}
        {draftState === "saved" ? (
          <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.14em] text-ink/45">
            Draft saved locally in this browser.
          </p>
        ) : null}
      </section>

      {selectedNode ? (
        <section className="mt-4 border border-ink/10 bg-white/45 px-3 py-3">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-display text-2xl leading-7">
                {selectedNode.title || nodeTitleFallback(selectedNode, flow)}
              </p>
              <p className="mt-1 truncate text-[11px] font-bold uppercase tracking-[0.16em] text-moss">
                {selectedNode.id}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                className="icon-button"
                type="button"
                title="Duplicate node"
                aria-label="Duplicate node"
                onClick={onDuplicateNode}
              >
                <Copy size={17} />
              </button>
              <button
                className="icon-button"
                type="button"
                title="Delete node"
                aria-label="Delete node"
                disabled={selectedNode.id === flow.startNodeId}
                onClick={onDeleteNode}
              >
                <Trash2 size={17} />
              </button>
            </div>
          </div>

          <label className="editor-label">
            Node type
            <select
              className="editor-input"
              value={selectedNode.type}
              onChange={(event) =>
                onUpdateNode(selectedNode.id, {
                  type: event.target.value as ThoughtFlowNodeType,
                  choices:
                    event.target.value === "action" ? [] : selectedNode.choices,
                  ctas:
                    event.target.value === "action"
                      ? selectedNode.ctas ?? [
                          { label: "", url: "", style: "primary" },
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

          <div className="grid grid-cols-2 gap-2">
            <button className="editor-small-button" type="button" onClick={onSetStart}>
              <Play size={15} />
              Make start
            </button>
            <button
              className="editor-small-button"
              type="button"
              onClick={() =>
                canHaveChoices ? onAddChoice(selectedNode.id) : onAddCta(selectedNode.id)
              }
            >
              <Plus size={15} />
              {canHaveChoices ? "Add choice" : "Add CTA"}
            </button>
          </div>

          {canHaveChoices ? (
            <section className="mt-5">
              <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.18em] text-moss">
                Choice targets
              </p>
              <div className="space-y-3">
                {selectedNode.choices.map((choice) => (
                  <div className="border border-ink/10 bg-canvas/55 p-3" key={choice.id}>
                    <p className="mb-2 truncate text-sm font-extrabold">
                      {choice.label || "New choice"}
                    </p>
                    <div className="grid grid-cols-[1fr_auto] gap-2">
                      <select
                        className="editor-input mt-0"
                        value={choice.targetNodeId}
                        onChange={(event) =>
                          onUpdateChoice(selectedNode.id, choice.id, {
                            targetNodeId: event.target.value,
                          })
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
                        className="icon-button"
                        type="button"
                        title="Create connected node"
                        aria-label="Create connected node"
                        onClick={() => onCreateConnectedNode(selectedNode.id, choice.id)}
                      >
                        <FilePlus2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </section>
      ) : null}

      <ValidationPanel issues={issues} onSelectIssue={onSelectIssue} />
    </aside>
  );
}

function ValidationPanel({
  issues,
  onSelectIssue,
}: {
  issues: ValidationIssue[];
  onSelectIssue: (issue: ValidationIssue) => void;
}) {
  return (
    <section className="mt-4 border-t border-ink/10 pt-4">
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
            <li key={issue.id}>
              <button
                className={[
                  "w-full border px-3 py-2 text-left text-sm font-semibold transition hover:bg-white",
                  issue.severity === "error"
                    ? "border-clay/30 bg-clay/10 text-clay"
                    : "border-ink/10 bg-white/55 text-ink/70",
                ].join(" ")}
                type="button"
                onClick={() => onSelectIssue(issue)}
              >
                {issue.label}
              </button>
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

  const draft = readDraft(slug);
  if (draft?.flow) {
    return draft.flow;
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

function validateFlow(flow: ThoughtFlowFlow) {
  const issueMap = new Map<string, ValidationIssue>();
  const reachableNodeIds = collectReachableNodeIds(flow);

  if (!flow.nodes[flow.startNodeId]) {
    issueMap.set("missing-start", {
      id: "missing-start",
      label: "The start node is missing.",
      severity: "error",
    });
  }

  for (const node of Object.values(flow.nodes)) {
    if (!reachableNodeIds.has(node.id)) {
      issueMap.set(`unreachable-${node.id}`, {
        id: `unreachable-${node.id}`,
        label: `${node.title || nodeTitleFallback(node, flow)} is unreachable from the start node.`,
        nodeId: node.id,
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
        nodeId: node.id,
        severity: "warning",
      });
    }

    for (const choice of node.choices) {
      if (!choice.targetNodeId || !flow.nodes[choice.targetNodeId]) {
        issueMap.set(`missing-${node.id}-${choice.id}`, {
          id: `missing-${node.id}-${choice.id}`,
          label: `${node.title || nodeTitleFallback(node, flow)} has a choice with a missing target.`,
          nodeId: node.id,
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

function makeSaveInput(flow: ThoughtFlowFlow, slug: string): SavePublishedFlowInput {
  const title = flow.title.trim() || titleFromSlug(slug);
  const nextFlow = {
    ...flow,
    id: slugToId(slug),
    slug,
    title,
  };

  return {
    slug,
    title,
    description: nextFlow.description,
    flow: nextFlow,
    tagIds: nextFlow.tags?.map((tag) => tag.id) ?? [],
  };
}

function draftKey(slug: string) {
  return `${draftStoragePrefix}:${slug}`;
}

function persistDraft(slug: string, payload: SavePublishedFlowInput) {
  try {
    window.localStorage.setItem(
      draftKey(slug),
      JSON.stringify({
        ...payload,
        savedAt: new Date().toISOString(),
      }),
    );
  } catch {
    // Draft persistence is best-effort; the export button remains available.
  }
}

function readDraft(slug: string) {
  try {
    const value =
      window.localStorage.getItem(draftKey(slug)) ??
      window.localStorage.getItem(`thoughtflow-recovery:${slug}`);
    return value ? (JSON.parse(value) as SavePublishedFlowInput & { savedAt?: string }) : null;
  } catch {
    return null;
  }
}

function clearDraft(slug: string) {
  try {
    window.localStorage.removeItem(draftKey(slug));
  } catch {
    // Nothing to recover if local storage cannot be written.
  }
}

function downloadJson(filename: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
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
  return (
    slug
      .split("-")
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase() + part.slice(1))
      .join(" ") || "Untitled Flow"
  );
}
