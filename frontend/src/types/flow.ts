export type ThoughtFlowFlow = {
  id: string;
  slug?: string;
  title: string;
  description?: string;
  tags?: string[];
  startNodeId: string;
  nodes: Record<string, ThoughtFlowNode>;
};

export type ThoughtFlowNodeType =
  | "question"
  | "information"
  | "conclusion"
  | "action";

export type ThoughtFlowNode = {
  id: string;
  title: string;
  text: string;
  type: ThoughtFlowNodeType;
  choices: ThoughtFlowChoice[];
  ctas?: ThoughtFlowCta[];
};

export type ThoughtFlowChoice = {
  id: string;
  label: string;
  targetNodeId: string;
};

export type ThoughtFlowCta = {
  label: string;
  url: string;
  style: "primary" | "secondary";
};

export type SelectedChoice = {
  fromNodeId: string;
  choiceId: string;
  label: string;
  targetNodeId: string;
};
