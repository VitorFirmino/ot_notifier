import { TrendingUp, Skull, type LucideIcon } from "lucide-react";
import { useActivityTicker } from "./hooks/use-activity-ticker";

const KIND_ICON: Record<string, LucideIcon> = {
  "level-up": TrendingUp,
  death: Skull,
};

const KIND_BADGE: Record<string, string> = {
  "level-up": "bg-accent/15 text-accent",
  death: "bg-danger/15 text-danger",
};

const KIND_TINT: Record<string, string> = {
  "level-up": "var(--color-accent)",
  death: "var(--color-danger)",
};

export const ActivityTicker: React.FC = () => {
  const { listRef, events } = useActivityTicker();

  return (
    <div className="min-w-72 flex-1 basis-[35%]">
      <p className="mb-4 text-sm text-text-muted">Notificações recentes no Discord</p>
      <ul ref={listRef} className="flex flex-col gap-3">
        {events.map((event) => {
          const Icon = KIND_ICON[event.kind];
          return (
            <li
              key={event.id}
              data-ticker-item
              style={{ "--tint": KIND_TINT[event.kind] } as React.CSSProperties}
              className="glass-liquid flex items-start gap-3 rounded-2xl border border-white/10 p-5"
            >
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${KIND_BADGE[event.kind]}`}>
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-text">
                  <span className="font-medium">{event.character}</span> {event.detail}
                </p>
                <span className="text-xs text-text-muted">{event.timeLabel}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
