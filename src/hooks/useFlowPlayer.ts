import { useCallback, useMemo, useState } from "react";
import type { ThoughtFlowChoice, ThoughtFlowFlow, SelectedChoice } from "../types/flow";

export type FlowPlayerState = {
  currentNodeId: string;
  visibleNodeIds: string[];
  selectedChoices: SelectedChoice[];
  activeEdgeId: string | null;
  pathVersion: number;
  selectedChoiceByNodeId: Record<string, string>;
  choose: (fromNodeId: string, choice: ThoughtFlowChoice) => void;
  focusNode: (nodeId: string) => void;
  reset: () => void;
};

export function useFlowPlayer(flow: ThoughtFlowFlow): FlowPlayerState {
  const [currentNodeId, setCurrentNodeId] = useState(flow.startNodeId);
  const [visibleNodeIds, setVisibleNodeIds] = useState<string[]>([
    flow.startNodeId,
  ]);
  const [selectedChoices, setSelectedChoices] = useState<SelectedChoice[]>([]);
  const [activeEdgeId, setActiveEdgeId] = useState<string | null>(null);
  const [pathVersion, setPathVersion] = useState(0);

  const selectedChoiceByNodeId = useMemo(
    () =>
      selectedChoices.reduce<Record<string, string>>((acc, choice) => {
        acc[choice.fromNodeId] = choice.choiceId;
        return acc;
      }, {}),
    [selectedChoices],
  );

  const choose = useCallback(
    (fromNodeId: string, choice: ThoughtFlowChoice) => {
      if (!flow.nodes[choice.targetNodeId]) {
        return;
      }

      const fromIndex = visibleNodeIds.indexOf(fromNodeId);
      const keptNodeIds =
        fromIndex >= 0 ? visibleNodeIds.slice(0, fromIndex + 1) : visibleNodeIds;
      const keptChoiceNodeIds = new Set(keptNodeIds.slice(0, -1));
      const keptChoices = selectedChoices.filter((selected) =>
        keptChoiceNodeIds.has(selected.fromNodeId),
      );

      const nextChoice: SelectedChoice = {
        fromNodeId,
        choiceId: choice.id,
        label: choice.label,
        targetNodeId: choice.targetNodeId,
      };

      setVisibleNodeIds([...keptNodeIds, choice.targetNodeId]);
      setSelectedChoices([...keptChoices, nextChoice]);
      setCurrentNodeId(choice.targetNodeId);
      setActiveEdgeId(`${fromNodeId}-${choice.id}-${choice.targetNodeId}`);
      setPathVersion((version) => version + 1);
    },
    [flow.nodes, selectedChoices, visibleNodeIds],
  );

  const focusNode = useCallback((nodeId: string) => {
    setCurrentNodeId(nodeId);
  }, []);

  const reset = useCallback(() => {
    setCurrentNodeId(flow.startNodeId);
    setVisibleNodeIds([flow.startNodeId]);
    setSelectedChoices([]);
    setActiveEdgeId(null);
    setPathVersion((version) => version + 1);
  }, [flow.startNodeId]);

  return {
    currentNodeId,
    visibleNodeIds,
    selectedChoices,
    activeEdgeId,
    pathVersion,
    selectedChoiceByNodeId,
    choose,
    focusNode,
    reset,
  };
}
