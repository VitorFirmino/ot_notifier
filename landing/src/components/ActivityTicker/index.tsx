import { useActivityTicker } from "./hooks/use-activity-ticker";

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
    <div className="min-w-72 flex-1 basis-[35%] rounded-xl border border-white/10 bg-surface p-6">
      <span className="font-mono text-xs uppercase tracking-wide text-text-muted">Feed de atividade</span>
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
