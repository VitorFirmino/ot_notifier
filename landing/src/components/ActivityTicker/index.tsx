import { useActivityTicker } from "./hooks/use-activity-ticker";
import { RadarSweep } from "@components/RadarSweep";

const KIND_LABEL: Record<string, string> = {
  "level-up": "Level up",
  death: "Morte",
  webhook: "Discord",
};

const KIND_COLOR: Record<string, string> = {
  "level-up": "text-accent",
  death: "text-danger",
  webhook: "text-success",
};

export const ActivityTicker: React.FC = () => {
  const { listRef, events } = useActivityTicker();

  return (
    <div className="glass-panel relative min-w-72 flex-1 basis-[35%] rounded-xl border border-white/10 p-6">
      <RadarSweep />
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
        </span>
        <span className="font-mono text-xs uppercase tracking-wide text-text-muted">Feed de atividade</span>
      </div>
      <ul ref={listRef} className="mt-4 flex flex-col gap-3">
        {events.map((event) => (
          <li key={event.id} data-ticker-item className="flex items-baseline gap-3 font-mono text-sm">
            <span className={`w-16 shrink-0 ${KIND_COLOR[event.kind]}`}>{KIND_LABEL[event.kind]}</span>
            <span>{event.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
