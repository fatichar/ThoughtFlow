import type { ThoughtFlowFlow } from "../types/flow";

export type EditorPositionedNode = {
  id: string;
  position: { x: number; y: number };
};

const NODE_GAP_X = 520;
const NODE_GAP_Y = 260;
const ORPHAN_LANE_Y = 520;

export function layoutEditableFlow(flow: ThoughtFlowFlow): EditorPositionedNode[] {
  const positions = new Map<string, { x: number; y: number }>();
  const depths = new Map<string, number>();
  const queue: Array<{ id: string; depth: number }> = [
    { id: flow.startNodeId, depth: 0 },
  ];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || depths.has(current.id) || !flow.nodes[current.id]) {
      continue;
    }

    depths.set(current.id, current.depth);

    for (const choice of flow.nodes[current.id].choices) {
      if (choice.targetNodeId && flow.nodes[choice.targetNodeId]) {
        queue.push({ id: choice.targetNodeId, depth: current.depth + 1 });
      }
    }
  }

  const nodeIdsByDepth = new Map<number, string[]>();
  for (const nodeId of Object.keys(flow.nodes)) {
    const depth = depths.get(nodeId);
    if (depth === undefined) {
      continue;
    }

    nodeIdsByDepth.set(depth, [...(nodeIdsByDepth.get(depth) ?? []), nodeId]);
  }

  for (const [depth, nodeIds] of nodeIdsByDepth) {
    nodeIds.forEach((nodeId, lane) => {
      const centerOffset = (nodeIds.length - 1) / 2;
      positions.set(nodeId, {
        x: depth * NODE_GAP_X,
        y: (lane - centerOffset) * NODE_GAP_Y,
      });
    });
  }

  const orphanNodeIds = Object.keys(flow.nodes).filter((nodeId) => !positions.has(nodeId));
  orphanNodeIds.forEach((nodeId, index) => {
    positions.set(nodeId, {
      x: (index % 4) * NODE_GAP_X,
      y: ORPHAN_LANE_Y + Math.floor(index / 4) * NODE_GAP_Y,
    });
  });

  return Object.keys(flow.nodes).map((id) => ({
    id,
    position: positions.get(id) ?? { x: 0, y: 0 },
  }));
}
