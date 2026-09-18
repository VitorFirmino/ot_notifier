import { Compass, Radar, Send, type LucideIcon } from "lucide-react";
import { useHowItWorks } from "./hooks/use-how-it-works";

const STEP_ICON: Record<string, LucideIcon> = {
  cadastro: Compass,
  monitoramento: Radar,
  notificacao: Send,
};

export const HowItWorks: React.FC = () => {
  const { sectionRef, pathRef, steps } = useHowItWorks();

  return (
    <section ref={sectionRef} id="como-funciona" className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
      <h2 className="mb-8 text-4xl">Como funciona</h2>
      <svg className="mb-4 h-5 w-full" viewBox="0 0 600 20" preserveAspectRatio="none" aria-hidden="true">
        <path ref={pathRef} d="M20,10 H580" fill="none" stroke="var(--color-accent)" strokeWidth="2" />
      </svg>
      <ol className="grid grid-cols-1 gap-8 sm:grid-cols-3">
        {steps.map((step) => {
          const Icon = STEP_ICON[step.id];
          return (
            <li key={step.id} data-step-node className="opacity-30">
              <span
                data-step-icon
                className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-accent/25 to-accent/5 text-accent"
              >
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mb-2 text-accent">{step.title}</h3>
              <p className="leading-relaxed text-text-muted">{step.description}</p>
            </li>
          );
        })}
      </ol>
    </section>
  );
};
