import { Compass, Radar, Send, type LucideIcon } from "lucide-react";
import { useHowItWorks } from "./hooks/use-how-it-works";

const STEP_ICON: Record<string, LucideIcon> = {
  cadastro: Compass,
  monitoramento: Radar,
  notificacao: Send,
};

export const HowItWorks: React.FC = () => {
  const { sectionRef, steps } = useHowItWorks();

  return (
    <section ref={sectionRef} id="como-funciona" className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
      <h2 className="mb-8 text-4xl">Como funciona</h2>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {steps.map((step, index) => {
          const Icon = STEP_ICON[step.id];
          return (
            <article
              key={step.id}
              data-step-card
              className="glass-liquid relative overflow-hidden rounded-2xl border border-white/10 p-7"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -top-6 -right-2 font-heading text-8xl font-bold text-white/5"
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="relative mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-accent/25 to-accent/5 text-accent">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="relative mb-2 text-accent">{step.title}</h3>
              <p className="relative leading-relaxed text-text-muted">{step.description}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
};
