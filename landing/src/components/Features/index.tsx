import { Layers, ShieldCheck, Webhook, Clock, Users, SlidersHorizontal, type LucideIcon } from "lucide-react";
import { useFeatures } from "./hooks/use-features";

const SIZE_CLASS: Record<string, string> = {
  large: "sm:col-span-2",
  small: "sm:col-span-1",
};

const ICONS: Record<string, LucideIcon> = {
  "multi-servidor": Layers,
  cloudflare: ShieldCheck,
  webhook: Webhook,
  historico: Clock,
  "multi-guilda": Users,
  intervalo: SlidersHorizontal,
};

export const Features: React.FC = () => {
  const { gridRef, features } = useFeatures();

  return (
    <section id="recursos" className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
      <h2 className="mb-8 text-4xl">Recursos</h2>
      <div ref={gridRef} className="grid grid-cols-1 gap-5 sm:grid-cols-4">
        {features.map((feature) => {
          const Icon = ICONS[feature.id];
          return (
            <article
              key={feature.id}
              data-feature-card
              className={`group glass-panel rounded-xl border border-white/10 p-6 ${SIZE_CLASS[feature.size]}`}
            >
              <Icon className="mb-3 h-6 w-6 text-accent transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:rotate-6" />
              <h3 className="mb-2">{feature.title}</h3>
              <p className="leading-relaxed text-text-muted">{feature.description}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
};
