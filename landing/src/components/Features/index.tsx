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
              className={`group glass-liquid rounded-2xl border border-white/10 p-7 ${SIZE_CLASS[feature.size]}`}
            >
              <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-accent/25 to-accent/5 text-accent">
                <Icon className="h-5 w-5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:rotate-6" />
              </span>
              <h3 className="mb-2">{feature.title}</h3>
              <p className="leading-relaxed text-text-muted">{feature.description}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
};
