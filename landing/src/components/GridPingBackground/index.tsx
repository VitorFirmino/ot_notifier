import { useGridPingBackground } from "./hooks/use-grid-ping-background";

export const GridPingBackground: React.FC = () => {
  const { canvasRef } = useGridPingBackground();

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 opacity-70" />;
};
