import type { ThoughtFlowFlow, ThoughtFlowNode } from "../types/flow";

type LegacyThoughtFlowNode = Omit<ThoughtFlowNode, "type"> & {
  type: ThoughtFlowNode["type"] | "action";
};

export function normalizeFlow(flow: ThoughtFlowFlow): ThoughtFlowFlow {
  return {
    ...flow,
    nodes: Object.fromEntries(
      Object.entries(flow.nodes).map(([nodeId, node]) => [
        nodeId,
        normalizeNode(node as LegacyThoughtFlowNode),
      ]),
    ),
  };
}

function normalizeNode(node: LegacyThoughtFlowNode): ThoughtFlowNode {
  if (node.type !== "action") {
    return node as ThoughtFlowNode;
  }

  return {
    ...node,
    type: "conclusion",
    choices: [],
    ctas: node.ctas ?? [{ label: "", url: "", style: "primary" }],
  };
}
