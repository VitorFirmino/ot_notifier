import { Fragment } from "react";
import { ArrowRight } from "lucide-react";
import { useHero } from "./hooks/use-hero";
import { ActivityTicker } from "@components/ActivityTicker";
import { GridPingBackground } from "@components/GridPingBackground";

const HEADLINE_WORDS = ["Monitore", "suas", "guildas", "de", "Open", "Tibia", "em", "tempo", "real."];

export const Hero: React.FC = () => {
  const { containerRef, headlineRef, glowRef } = useHero();

  return (
    <section ref={containerRef} id="hero" className="relative overflow-hidden px-5 py-24 sm:px-8">
      <GridPingBackground />
      <div className="relative mx-auto flex max-w-6xl flex-wrap items-center gap-12">
        <div className="relative min-w-80 flex-1 basis-[55%]">
          <div
            ref={glowRef}
            aria-hidden="true"
            className="pointer-events-none absolute -top-10 -left-10 -z-10 h-64 w-64 rounded-full bg-accent/25 opacity-30 blur-3xl"
          />
          <h1 ref={headlineRef} className="text-6xl leading-[1.05] sm:text-7xl">
            {HEADLINE_WORDS.map((word, index) => (
              <Fragment key={index}>
                <span data-word className="inline-block">
                  {word}
                </span>{" "}
              </Fragment>
            ))}
          </h1>
          <p className="mt-6 max-w-xl leading-relaxed text-text-muted">
            O OT Notifier acompanha suas guildas e personagens favoritos e avisa no Discord quando alguém sobe de
            nível ou morre, sem precisar ficar checando o site do servidor.
          </p>
          <a
            href="#como-funciona"
            className="group mt-8 inline-flex items-center gap-2 border-b border-accent-dim pb-1 text-accent"
          >
            Ver como funciona
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
          </a>
        </div>
        <ActivityTicker />
      </div>
    </section>
  );
};
