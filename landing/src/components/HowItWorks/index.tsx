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
    <section ref={sectionRef} id="como-funciona" className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
      <h2 className="mb-12 text-4xl">Como funciona</h2>
      <ol className="relative">
        <svg
          className="absolute top-6 left-6 h-[calc(100%-3rem)] w-0.5 -translate-x-1/2"
          viewBox="0 0 4 400"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path ref={pathRef} d="M2,0 V400" fill="none" stroke="var(--color-accent)" strokeWidth="4" />
        </svg>
        {steps.map((step, index) => {
          const Icon = STEP_ICON[step.id];
          const isLast = index === steps.length - 1;
          return (
            <li
              key={step.id}
              data-step-node
              className={`relative flex gap-5 opacity-30 ${isLast ? "" : "pb-12"}`}
            >
              <span
                data-step-icon
                className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent/25 to-accent/5 text-accent"
              >
                <Icon className="h-5 w-5" />
              </span>
              <div className="pt-1.5">
                <h3 className="mb-2 text-accent">{step.title}</h3>
                <p className="leading-relaxed text-text-muted">{step.description}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
};
