import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  SelectedChoice,
  ThoughtFlowChoice,
  ThoughtFlowFlow,
} from "../types/flow";

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

  const safeCurrentNodeId = flow.nodes[currentNodeId]
    ? currentNodeId
    : flow.startNodeId;
  const safeVisibleNodeIds = useMemo(() => {
    const existingNodeIds = visibleNodeIds.filter((nodeId) => flow.nodes[nodeId]);

    return existingNodeIds.length > 0 && existingNodeIds[0] === flow.startNodeId
      ? existingNodeIds
      : [flow.startNodeId];
  }, [flow.nodes, flow.startNodeId, visibleNodeIds]);
  const safeSelectedChoices = useMemo(
    () =>
      selectedChoices.filter(
        (choice) =>
          flow.nodes[choice.fromNodeId] && flow.nodes[choice.targetNodeId],
      ),
    [flow.nodes, selectedChoices],
  );

  const selectedChoiceByNodeId = useMemo(
    () =>
      safeSelectedChoices.reduce<Record<string, string>>((acc, choice) => {
        acc[choice.fromNodeId] = choice.choiceId;
        return acc;
      }, {}),
    [safeSelectedChoices],
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

  useEffect(() => {
    reset();
  }, [flow.id, reset]);

  return {
    currentNodeId: safeCurrentNodeId,
    visibleNodeIds: safeVisibleNodeIds,
    selectedChoices: safeSelectedChoices,
    activeEdgeId,
    pathVersion,
    selectedChoiceByNodeId,
    choose,
    focusNode,
    reset,
  };
}
