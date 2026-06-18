import { Braces, CircleDot, GitBranch, Tag } from "lucide-react";
import type { ThoughtFlowFlow } from "../types/flow";
import type { FlowPlayerState } from "../hooks/useFlowPlayer";
import { tagColorStyle } from "../utils/tagColors";

type FlowSidebarProps = {
  flow: ThoughtFlowFlow;
  player: FlowPlayerState;
};

export function FlowSidebar({ flow, player }: FlowSidebarProps) {
  const currentNode = flow.nodes[player.currentNodeId];

  return (
    <aside className="min-h-0 overflow-y-auto bg-[#fbf8f0] px-5 py-5 max-[980px]:hidden">
      <section className="mb-6">
        <div className="mb-3 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-moss">
          <CircleDot size={15} />
          Current Node
        </div>
        <div className="border-l-4 border-moss bg-oat/55 p-4">
          <p className="text-sm font-semibold leading-6 text-ink/75">
            {currentNode.text}
          </p>
          <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-ink/45">
            {currentNode.id} / {currentNode.type}
          </p>
        </div>
      </section>

      <section className="mb-6">
        <div className="mb-3 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-moss">
          <GitBranch size={15} />
          Played Path
        </div>
        <ol className="space-y-2">
          {player.selectedChoices.length === 0 ? (
            <li className="border border-dashed border-ink/20 px-3 py-3 text-sm text-ink/55">
              No choice selected yet.
            </li>
          ) : (
            player.selectedChoices.map((choice, index) => (
              <li
                className="grid grid-cols-[28px_1fr] gap-3 border border-ink/10 bg-white/50 px-3 py-3"
                key={`${choice.fromNodeId}-${choice.choiceId}-${index}`}
              >
                <span className="grid h-7 w-7 place-items-center rounded-sm bg-ink text-xs font-black text-canvas">
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-bold leading-5">{choice.label}</p>
                  <p className="mt-1 text-xs text-ink/45">
                    {choice.fromNodeId} &rarr; {choice.targetNodeId}
                  </p>
                </div>
              </li>
            ))
          )}
        </ol>
      </section>

      <section className="mb-6">
        <div className="mb-3 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-moss">
          <Tag size={15} />
          Tags
        </div>
        <div className="flex flex-wrap gap-2">
          {flow.tags?.map((tag) => (
            <span
              className="rounded-sm px-2.5 py-1 text-xs font-bold text-white shadow-sm"
              key={tag.id}
              style={tagColorStyle(tag.color)}
            >
              {tag.name}
            </span>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-moss">
          <Braces size={15} />
          Data Shape
        </div>
        <pre className="max-h-[340px] overflow-auto rounded-sm bg-ink p-4 text-[11px] leading-5 text-canvas">
          {JSON.stringify(
            {
              id: flow.id,
              title: flow.title,
              startNodeId: flow.startNodeId,
              nodeExample: flow.nodes[flow.startNodeId],
            },
            null,
            2,
          )}
        </pre>
      </section>
    </aside>
  );
}
