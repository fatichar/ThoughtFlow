import type { ThoughtFlowFlow } from "../types/flow";

export type PositionedNode = {
  id: string;
  position: { x: number; y: number };
};

const NODE_GAP_X = 560;
const NODE_GAP_Y = 210;

export function layoutVisibleNodes(
  flow: ThoughtFlowFlow,
  visibleNodeIds: string[],
): PositionedNode[] {
  const laneCounts = new Map<number, number>();

  return visibleNodeIds.map((nodeId, index) => {
    if (index === 0) {
      return { id: nodeId, position: { x: 0, y: 0 } };
    }

    const previousId = visibleNodeIds[index - 1];
    const previousNode = flow.nodes[previousId];
    const choiceIndex = Math.max(
      0,
      previousNode?.choices.findIndex((choice) => choice.targetNodeId === nodeId) ??
        0,
    );
    const branchOffset = choiceIndex - ((previousNode?.choices.length ?? 1) - 1) / 2;
    const reuseOffset = laneCounts.get(index) ?? 0;
    laneCounts.set(index, reuseOffset + 1);

    return {
      id: nodeId,
      position: {
        x: index * NODE_GAP_X,
        y: branchOffset * NODE_GAP_Y + reuseOffset * 32,
      },
    };
  });
}
