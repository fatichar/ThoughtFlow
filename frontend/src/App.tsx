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
import { TopBar } from "./components/TopBar";
import { siteName } from "./config/site";
import { veganEthicsFlow } from "./data/veganEthicsFlow";
import { useFlowPlayer } from "./hooks/useFlowPlayer";
import { normalizeFlow } from "./utils/normalizeFlow";
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
        setPublishedFlow({
          ...flow,
          flow: normalizeFlow(flow.flow),
        });
        setLoadState("ready");
      })
      .catch(() => {
        if (slug === fallbackSlug) {
          const fallbackFlow = normalizeFlow({
            ...veganEthicsFlow,
            slug: fallbackSlug,
          });
          setPublishedFlow({
            id: fallbackFlow.id,
            slug: fallbackSlug,
            title: fallbackFlow.title,
            description: fallbackFlow.description,
            flow: fallbackFlow,
            tags: fallbackFlow.tags ?? [],
          });
          setLoadState("ready");
          return;
        }

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
  const [attemptedCompletionNodeId, setAttemptedCompletionNodeId] = useState<string | null>(
    null,
  );
  const submittedCompletionNodeRef = useRef<string | null>(null);
  const player = useFlowPlayer(publishedFlow.flow);
  const currentNode = publishedFlow.flow.nodes[player.currentNodeId];
  const isCtaNode = currentNode.type === "conclusion";
  const hasValidCtas =
    currentNode.ctas?.some((cta) => cta.label.trim() && cta.url.trim()) ?? false;
  const isTerminalNode =
    isCtaNode || (!isCtaNode && currentNode.choices.length === 0);

  async function handleSubmit() {
    if (submittedCompletionNodeRef.current === player.currentNodeId) {
      return;
    }

    submittedCompletionNodeRef.current = player.currentNodeId;
    setAttemptedCompletionNodeId(player.currentNodeId);
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
      isCtaNode &&
      hasValidCtas &&
      attemptedCompletionNodeId !== player.currentNodeId &&
      !isSubmitted &&
      !isSubmitting
    ) {
      void handleSubmit();
    }
  }, [
    attemptedCompletionNodeId,
    hasValidCtas,
    isCtaNode,
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
            setAttemptedCompletionNodeId(null);
            submittedCompletionNodeRef.current = null;
            onResetCompletion();
          }}
        />
        <main className="relative h-[calc(100vh-64px)]">
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
              setAttemptedCompletionNodeId(null);
              submittedCompletionNodeRef.current = null;
              onResetCompletion();
            }}
            player={player}
          />
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
