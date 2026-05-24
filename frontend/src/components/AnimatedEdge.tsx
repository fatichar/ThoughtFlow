import {
  BaseEdge,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";

export function AnimatedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  const isActive = Boolean((data as { active?: boolean } | undefined)?.active);

  return (
    <g>
      <BaseEdge
        id={`${id}-halo`}
        path={edgePath}
        style={{
          stroke: isActive ? "rgba(126,160,90,0.22)" : "rgba(83,107,79,0.12)",
          strokeWidth: isActive ? 12 : 8,
        }}
      />
      <BaseEdge
        id={id}
        path={edgePath}
        className={isActive ? "edge-path edge-path-active" : "edge-path"}
      />
    </g>
  );
}
