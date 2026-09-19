import { useHowItWorks } from "./hooks/use-how-it-works";
import { ShieldIcon } from "./icons/ShieldIcon";
import { EyeIcon } from "./icons/EyeIcon";
import { BellIcon } from "./icons/BellIcon";

const STEP_ICON: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = {
  cadastro: ShieldIcon,
  monitoramento: EyeIcon,
  notificacao: BellIcon,
};

const ALIGN_CLASS: Record<number, string> = {
  0: "sm:self-start",
  1: "sm:self-end",
  2: "sm:self-start",
};

export const HowItWorks: React.FC = () => {
  const { sectionRef, trackRef, steps } = useHowItWorks();

  return (
    <section ref={sectionRef} id="como-funciona" className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
      <h2 className="mb-16 text-4xl">Como funciona</h2>
      <div ref={trackRef} className="relative flex flex-col gap-14 overflow-x-hidden sm:gap-20">
        <svg
          aria-hidden="true"
          data-step-connector-svg
          className="pointer-events-none absolute inset-0 z-0 hidden h-full w-full sm:block"
        >
          {steps.slice(0, -1).map((step) => (
            <path
              key={step.id}
              data-step-connector-segment
              fill="none"
              stroke="var(--color-accent)"
              strokeOpacity="0.5"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          ))}
        </svg>
        {steps.map((step, index) => {
          const Icon = STEP_ICON[step.id];
          return (
            <article
              key={step.id}
              data-step-card
              className={`glass-liquid relative z-10 w-full overflow-hidden rounded-2xl border border-white/10 p-7 sm:w-[62%] ${ALIGN_CLASS[index]}`}
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-4 right-5 font-heading text-7xl font-bold text-white/5"
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="relative mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-white/10 to-white/0">
                <Icon data-step-icon-glyph data-step-id={step.id} className="h-11 w-11" />
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
