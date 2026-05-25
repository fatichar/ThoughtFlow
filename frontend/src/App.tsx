import { ReactFlowProvider } from "@xyflow/react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  fetchPublishedFlow,
  listFlows,
  submitFlowResult,
  type FlowSummary,
  type PublishedFlow,
} from "./api/flows";
import { FlowEditor } from "./components/FlowEditor";
import { FlowLibrary } from "./components/FlowLibrary";
import { FlowPlayer } from "./components/FlowPlayer";
import { FlowSidebar } from "./components/FlowSidebar";
import { TopBar } from "./components/TopBar";
import { siteName } from "./config/site";
import { useFlowPlayer } from "./hooks/useFlowPlayer";
import { shareFlowUrl } from "./utils/shareFlow";

const fallbackSlug = "is-taste-enough";

export default function App() {
  useEffect(() => {
    document.title = siteName;
  }, []);

  if (window.location.pathname.startsWith("/editor")) {
    return <FlowEditor />;
  }

  if (window.location.pathname === "/" || window.location.pathname === "/flows") {
    return <FlowDirectory />;
  }

  return <PlayerApp />;
}

function FlowDirectory() {
  const [flowSummaries, setFlowSummaries] = useState<FlowSummary[]>([]);
  const [listState, setListState] = useState<"idle" | "loading" | "error">("loading");

  useEffect(() => {
    const controller = new AbortController();
    setListState("loading");

    listFlows(controller.signal)
      .then((summaries) => {
        setFlowSummaries(summaries.filter((summary) => summary.isPublished));
        setListState("idle");
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setListState("error");
      });

    return () => controller.abort();
  }, []);

  return (
    <FlowLibrary
      flowSummaries={flowSummaries}
      listState={listState}
      mode="play"
    />
  );
}

function PlayerApp() {
  const slug = useMemo(() => getPlaySlug(), []);
  const [publishedFlow, setPublishedFlow] = useState<PublishedFlow | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoadState("loading");

    fetchPublishedFlow(slug, controller.signal)
      .then((flow) => {
        setPublishedFlow(flow);
        setLoadState("ready");
      })
      .catch(() => {
        setLoadState("error");
      });

    return () => controller.abort();
  }, [slug]);

  if (loadState === "loading") {
    return <StatusScreen title="Loading flow" text="Preparing the playable path." />;
  }

  if (loadState === "error" || !publishedFlow) {
    return (
      <StatusScreen
        title="Flow not available"
        text="This published flow could not be loaded. Check the slug or seed the sample flow."
      />
    );
  }

  return (
    <PlayableFlow
      publishedFlow={publishedFlow}
      isSubmitted={isSubmitted}
      isSubmitting={isSubmitting}
      submitError={submitError}
      onSubmitStart={() => {
        setIsSubmitting(true);
        setSubmitError(null);
      }}
      onSubmitSuccess={() => {
        setIsSubmitting(false);
        setIsSubmitted(true);
      }}
      onSubmitError={() => {
        setIsSubmitting(false);
        setSubmitError("The result could not be saved. Please try again.");
      }}
      onResetCompletion={() => {
        setIsSubmitted(false);
        setSubmitError(null);
      }}
    />
  );
}

type PlayableFlowProps = {
  publishedFlow: PublishedFlow;
  isSubmitted: boolean;
  isSubmitting: boolean;
  submitError: string | null;
  onSubmitStart: () => void;
  onSubmitSuccess: () => void;
  onSubmitError: () => void;
  onResetCompletion: () => void;
};

function PlayableFlow({
  publishedFlow,
  isSubmitted,
  isSubmitting,
  submitError,
  onSubmitStart,
  onSubmitSuccess,
  onSubmitError,
  onResetCompletion,
}: PlayableFlowProps) {
  const [attemptedActionNodeId, setAttemptedActionNodeId] = useState<string | null>(
    null,
  );
  const submittedActionNodeRef = useRef<string | null>(null);
  const player = useFlowPlayer(publishedFlow.flow);
  const currentNode = publishedFlow.flow.nodes[player.currentNodeId];
  const isActionNode = currentNode.type === "action";
  const isTerminalNode =
    isActionNode ||
    (currentNode.type !== "action" && currentNode.choices.length === 0);

  async function handleSubmit() {
    if (submittedActionNodeRef.current === player.currentNodeId) {
      return;
    }

    submittedActionNodeRef.current = player.currentNodeId;
    setAttemptedActionNodeId(player.currentNodeId);
    onSubmitStart();

    try {
      await submitFlowResult(publishedFlow.slug, {
        finalNodeId: player.currentNodeId,
        path: player.selectedChoices,
      });
      onSubmitSuccess();
    } catch {
      onSubmitError();
    }
  }

  useEffect(() => {
    if (
      isActionNode &&
      (currentNode.ctas?.some((cta) => cta.label.trim() && cta.url.trim()) ?? false) &&
      attemptedActionNodeId !== player.currentNodeId &&
      !isSubmitted &&
      !isSubmitting
    ) {
      void handleSubmit();
    }
  }, [
    attemptedActionNodeId,
    currentNode.ctas,
    isActionNode,
    isSubmitted,
    isSubmitting,
    player.currentNodeId,
  ]);

  return (
    <div className="h-screen overflow-hidden bg-canvas text-ink">
      <ReactFlowProvider>
        <TopBar
          flow={publishedFlow.flow}
          onReset={() => {
            player.reset();
            setAttemptedActionNodeId(null);
            submittedActionNodeRef.current = null;
            onResetCompletion();
          }}
        />
        <main className="relative grid h-[calc(100vh-64px)] grid-cols-[minmax(0,1fr)_360px] max-[980px]:grid-cols-1">
          <FlowPlayer
            flow={publishedFlow.flow}
            isCompletionSaved={isSubmitted}
            isSavingCompletion={isSubmitting}
            onShareFlow={() =>
              shareFlowUrl(
                publishedFlow.flow.title || publishedFlow.title,
                `${window.location.origin}/play/${publishedFlow.slug}`,
              )
            }
            onSubmitCompletion={() => {
              if (isTerminalNode) {
                void handleSubmit();
              }
            }}
            onRestart={() => {
              player.reset();
              setAttemptedActionNodeId(null);
              submittedActionNodeRef.current = null;
              onResetCompletion();
            }}
            player={player}
          />
          <FlowSidebar flow={publishedFlow.flow} player={player} />
          {submitError ? (
            <div className="absolute bottom-5 left-5 z-20 max-w-md border border-clay/25 bg-[#fffdf7]/95 px-4 py-3 text-sm font-bold text-clay shadow-node">
              {submitError}
            </div>
          ) : null}
        </main>
      </ReactFlowProvider>
    </div>
  );
}

function StatusScreen({ title, text }: { title: string; text: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-6 text-ink">
      <section className="max-w-md border border-ink/10 bg-[#fffdf7] p-7 shadow-node">
        <p className="font-display text-4xl leading-10">{title}</p>
        <p className="mt-3 text-sm font-semibold leading-6 text-ink/60">{text}</p>
      </section>
    </main>
  );
}

function getPlaySlug() {
  const match = window.location.pathname.match(/^\/play\/([^/]+)\/?$/);
  if (match?.[1]) {
    return decodeURIComponent(match[1]);
  }

  window.history.replaceState(null, "", `/play/${fallbackSlug}`);
  return fallbackSlug;
}
