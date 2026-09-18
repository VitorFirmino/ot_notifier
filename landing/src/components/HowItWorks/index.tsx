import { useHowItWorks } from "./hooks/use-how-it-works";
import { ShieldIcon } from "./icons/ShieldIcon";
import { EyeIcon } from "./icons/EyeIcon";
import { BellIcon } from "./icons/BellIcon";

const STEP_ICON: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = {
  cadastro: ShieldIcon,
  monitoramento: EyeIcon,
  notificacao: BellIcon,
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
              <span className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-white/10 to-white/0 text-text">
                <Icon data-step-icon-glyph data-step-id={step.id} className="h-8 w-8" />
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
