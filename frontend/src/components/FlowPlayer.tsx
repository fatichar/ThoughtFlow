import { useEffect, useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  ReactFlow,
  useReactFlow,
  type Edge,
  type Node,
  type NodeTypes,
  type EdgeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { ThoughtFlowFlow } from "../types/flow";
import type { FlowPlayerState } from "../hooks/useFlowPlayer";
import { layoutVisibleNodes } from "../utils/layoutFlow";
import { AnimatedEdge } from "./AnimatedEdge";
import { ReasoningNode, type ReasoningNodeData } from "./ReasoningNode";

type FlowPlayerProps = {
  flow: ThoughtFlowFlow;
  player: FlowPlayerState;
  isCompletionSaved?: boolean;
  isSavingCompletion?: boolean;
  onExploreAnotherPath?: () => void;
  onRestart?: () => void;
  onSubmitCompletion?: () => void;
};

const nodeTypes: NodeTypes = {
  reasoning: ReasoningNode,
};

const edgeTypes: EdgeTypes = {
  animated: AnimatedEdge,
};

export function FlowPlayer({
  flow,
  isCompletionSaved = false,
  isSavingCompletion = false,
  onExploreAnotherPath = () => undefined,
  onRestart,
  onSubmitCompletion = () => undefined,
  player,
}: FlowPlayerProps) {
  const { setCenter, fitView } = useReactFlow();
  const restart = onRestart ?? player.reset;

  const positionedNodes = useMemo(
    () => layoutVisibleNodes(flow, player.visibleNodeIds),
    [flow, player.visibleNodeIds],
  );

  const nodes = useMemo<Node<ReasoningNodeData>[]>(
    () =>
      positionedNodes.map(({ id, position }) => {
        const flowNode = flow.nodes[id];
        return {
          id,
          type: "reasoning",
          position,
          draggable: false,
          data: {
            node: flowNode,
            state: id === player.currentNodeId ? "current" : "visited",
            selectedChoiceId: player.selectedChoiceByNodeId[id],
            onChoose: player.choose,
            onRestart: restart,
            onExploreAnotherPath,
            onSubmitCompletion,
            canExploreAnotherPath: player.selectedChoices.length > 0,
            isCompletionSaved,
            isSavingCompletion,
          },
        };
      }),
    [
      flow.nodes,
      isCompletionSaved,
      isSavingCompletion,
      onExploreAnotherPath,
      onSubmitCompletion,
      restart,
      player.choose,
      player.currentNodeId,
      player.selectedChoiceByNodeId,
      player.selectedChoices.length,
      positionedNodes,
    ],
  );

  const edges = useMemo<Edge[]>(
    () =>
      player.selectedChoices.map((choice) => {
        const id = `${choice.fromNodeId}-${choice.choiceId}-${choice.targetNodeId}`;
        return {
          id,
          source: choice.fromNodeId,
          target: choice.targetNodeId,
          type: "animated",
          data: { active: id === player.activeEdgeId },
        };
      }),
    [player.activeEdgeId, player.selectedChoices],
  );

  useEffect(() => {
    const target = positionedNodes.find((node) => node.id === player.currentNodeId);
    if (!target) {
      return;
    }

    window.setTimeout(() => {
      setCenter(target.position.x + 180, target.position.y + 145, {
        duration: 720,
        zoom: 1.02,
      });
    }, 80);
  }, [player.currentNodeId, positionedNodes, setCenter]);

  useEffect(() => {
    window.setTimeout(() => fitView({ duration: 400, maxZoom: 1.05 }), 100);
  }, [fitView]);

  return (
    <section className="relative h-full min-h-0 overflow-hidden border-r border-ink/10 max-[980px]:h-[68vh] max-[980px]:border-r-0">
      <div className="pointer-events-none absolute left-6 top-6 z-10 max-w-sm">
        <p className="rounded-sm border border-ink/10 bg-[#f9f6ed]/80 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-moss shadow-sm backdrop-blur">
          Play the path, one decision at a time
        </p>
      </div>
      <ReactFlow
        key={`path-${player.pathVersion}`}
        colorMode="light"
        edgeTypes={edgeTypes}
        edges={edges}
        fitView
        maxZoom={1.45}
        minZoom={0.42}
        nodes={nodes}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        onNodeClick={(_, node) => player.focusNode(node.id)}
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
  );
}
