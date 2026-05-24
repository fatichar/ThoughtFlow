import { ReactFlowProvider } from "@xyflow/react";
import { FlowPlayer } from "./components/FlowPlayer";
import { FlowSidebar } from "./components/FlowSidebar";
import { TopBar } from "./components/TopBar";
import { veganEthicsFlow } from "./data/veganEthicsFlow";
import { useFlowPlayer } from "./hooks/useFlowPlayer";

export default function App() {
  const player = useFlowPlayer(veganEthicsFlow);

  return (
    <div className="h-screen overflow-hidden bg-canvas text-ink">
      <ReactFlowProvider>
        <TopBar flow={veganEthicsFlow} onReset={player.reset} />
        <main className="grid h-[calc(100vh-64px)] grid-cols-[minmax(0,1fr)_360px] max-[980px]:grid-cols-1">
          <FlowPlayer flow={veganEthicsFlow} player={player} />
          <FlowSidebar flow={veganEthicsFlow} player={player} />
        </main>
      </ReactFlowProvider>
    </div>
  );
}
