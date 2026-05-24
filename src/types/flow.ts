export type ThoughtFlowFlow = {
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  startNodeId: string;
  nodes: Record<string, ThoughtFlowNode>;
};

export type ThoughtFlowNodeType =
  | "question"
  | "claim"
  | "reflection"
  | "input-placeholder"
  | "conclusion";

export type ThoughtFlowNode = {
  id: string;
  title: string;
  text: string;
  type: ThoughtFlowNodeType;
  choices: ThoughtFlowChoice[];
};

export type ThoughtFlowChoice = {
  id: string;
  label: string;
  targetNodeId: string;
};

export type SelectedChoice = {
  fromNodeId: string;
  choiceId: string;
  label: string;
  targetNodeId: string;
};
