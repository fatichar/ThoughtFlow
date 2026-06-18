export type Tag = {
  id: string;
  name: string;
  color: string;
};

export type ThoughtFlowFlow = {
  id: string;
  slug?: string;
  title: string;
  description?: string;
  tags?: Tag[];
  editor?: ThoughtFlowEditorState;
  startNodeId: string;
  nodes: Record<string, ThoughtFlowNode>;
};

export type ThoughtFlowEditorState = {
  positions?: Record<string, ThoughtFlowNodePosition>;
};

export type ThoughtFlowNodePosition = {
  x: number;
  y: number;
};

export type ThoughtFlowNodeType =
  | "question"
  | "information"
  | "conclusion";

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
