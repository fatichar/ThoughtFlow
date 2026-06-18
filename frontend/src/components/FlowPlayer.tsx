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
  onRestart?: () => void;
  onShareFlow?: () => Promise<"shared" | "copied" | "cancelled">;
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
  onRestart,
  onShareFlow = async () => "cancelled",
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
            onShareFlow,
            onSubmitCompletion,
            isCompletionSaved,
            isSavingCompletion,
          },
        };
      }),
    [
      flow.nodes,
      isCompletionSaved,
      isSavingCompletion,
      onSubmitCompletion,
      restart,
      onShareFlow,
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
          data: {
            active: id === player.activeEdgeId,
            sourceType: flow.nodes[choice.fromNodeId]?.type,
          },
        };
      }),
    [flow.nodes, player.activeEdgeId, player.selectedChoices],
  );

  useEffect(() => {
    const target = positionedNodes.find((node) => node.id === player.currentNodeId);
    if (!target) {
      return;
    }

    window.setTimeout(() => {
      const targetNode = flow.nodes[target.id];
      const offsetX = targetNode?.type === "conclusion" ? 270 : 210;
      const offsetY = targetNode?.type === "question" ? 160 : 145;
      setCenter(target.position.x + offsetX, target.position.y + offsetY, {
        duration: 720,
        zoom: 0.86,
      });
    }, 180);
  }, [flow.nodes, player.currentNodeId, positionedNodes, setCenter]);

  useEffect(() => {
    window.setTimeout(() => fitView({ duration: 400, maxZoom: 1.05 }), 100);
  }, [fitView]);

  return (
    <section className="player-flow-canvas relative h-full min-h-0 overflow-hidden">
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
          color="rgba(93,108,122,0.18)"
          gap={30}
          size={1.2}
          variant={BackgroundVariant.Dots}
        />
      </ReactFlow>
    </section>
  );
}
