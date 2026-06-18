import type { ThoughtFlowFlow } from "../types/flow";

export type EditorPositionedNode = {
  id: string;
  position: { x: number; y: number };
};

const NODE_GAP_X = 520;
const NODE_GAP_Y = 340;
const ORPHAN_LANE_Y = 720;
const CHOICE_BRANCH_OFFSET_Y = 190;

export function layoutEditableFlow(flow: ThoughtFlowFlow): EditorPositionedNode[] {
  const positions = new Map<string, { x: number; y: number }>();
  const depths = new Map<string, number>();
  const lanes = new Map<string, number>();
  const queue: Array<{ id: string; depth: number; lane: number }> = [
    { id: flow.startNodeId, depth: 0, lane: 0 },
  ];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || depths.has(current.id) || !flow.nodes[current.id]) {
      continue;
    }

    depths.set(current.id, current.depth);
    lanes.set(current.id, current.lane);

    const choices = flow.nodes[current.id].choices.filter(
      (choice) => choice.targetNodeId && flow.nodes[choice.targetNodeId],
    );
    choices.forEach((choice, choiceIndex) => {
      if (choice.targetNodeId && flow.nodes[choice.targetNodeId]) {
        const branchOffset = choiceIndex - (choices.length - 1) / 2;
        queue.push({
          id: choice.targetNodeId,
          depth: current.depth + 1,
          lane:
            current.lane +
            branchOffset * CHOICE_BRANCH_OFFSET_Y,
        });
      }
    });
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
    const occupiedLanes = new Set<number>();
    nodeIds
      .sort((a, b) => (lanes.get(a) ?? 0) - (lanes.get(b) ?? 0))
      .forEach((nodeId, laneIndex) => {
      const preferredLane = lanes.get(nodeId) ?? 0;
      let y = preferredLane;

      while (occupiedLanes.has(Math.round(y / 40))) {
        y += NODE_GAP_Y / 2;
      }

      occupiedLanes.add(Math.round(y / 40));

      positions.set(nodeId, {
        x: depth * NODE_GAP_X,
        y: y + laneIndex * 12,
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
    position: flow.editor?.positions?.[id] ?? positions.get(id) ?? { x: 0, y: 0 },
  }));
}
