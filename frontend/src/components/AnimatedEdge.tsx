import { BaseEdge, getBezierPath, type EdgeProps } from "@xyflow/react";
import type { ThoughtFlowNodeType } from "../types/flow";

type PlayerEdgeData = {
  active?: boolean;
  sourceType?: ThoughtFlowNodeType;
};

export function AnimatedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
}: EdgeProps) {
  const edgeData = data as PlayerEdgeData | undefined;

  if (!edgeData?.sourceType) {
    const [legacyPath] = getBezierPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
    });
    const isLegacyActive = Boolean(edgeData?.active);

    return (
      <g>
        <BaseEdge
          id={`${id}-halo`}
          path={legacyPath}
          style={{
            stroke: isLegacyActive
              ? "rgba(126,160,90,0.22)"
              : "rgba(83,107,79,0.12)",
            strokeWidth: isLegacyActive ? 12 : 8,
          }}
        />
        <BaseEdge
          id={id}
          path={legacyPath}
          className={isLegacyActive ? "edge-path edge-path-active" : "edge-path"}
        />
      </g>
    );
  }

  const isActive = Boolean(edgeData?.active);
  const color = connectorColor(edgeData?.sourceType);
  const path = connectorPath(sourceX, sourceY, targetX, targetY);
  const markerId = `player-arrow-${id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;

  return (
    <g className={isActive ? "player-edge player-edge-active" : "player-edge"}>
      <defs>
        <marker
          id={markerId}
          markerHeight="12"
          markerWidth="12"
          orient="auto"
          refX="10"
          refY="6"
          viewBox="0 0 12 12"
        >
          <path d="M1 1 L11 6 L1 11 Z" fill={color} />
        </marker>
      </defs>
      <path
        className="player-edge-halo"
        d={path}
        fill="none"
        stroke={color}
        strokeLinecap="round"
      />
      <path
        className="player-edge-path"
        d={path}
        fill="none"
        markerEnd={`url(#${markerId})`}
        stroke={color}
        strokeLinecap="round"
      />
    </g>
  );
}

function connectorPath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
) {
  if (Math.abs(sourceY - targetY) <= 22) {
    return `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
  }

  const distance = Math.max(120, Math.abs(targetX - sourceX));
  const controlOffset = Math.min(190, distance * 0.42);

  return [
    `M ${sourceX} ${sourceY}`,
    `C ${sourceX + controlOffset} ${sourceY}`,
    `${targetX - controlOffset} ${targetY}`,
    `${targetX} ${targetY}`,
  ].join(" ");
}

function connectorColor(sourceType?: ThoughtFlowNodeType) {
  if (sourceType === "information" || sourceType === "conclusion") {
    return "#f06443";
  }

  return "#f59e5b";
}
