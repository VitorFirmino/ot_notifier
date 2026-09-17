import { useHero } from "./hooks/use-hero";
import { ActivityTicker } from "@components/ActivityTicker";

const HEADLINE_WORDS = ["Monitore", "suas", "guildas", "de", "Open", "Tibia", "em", "tempo", "real."];

export const Hero: React.FC = () => {
  const { containerRef, headlineRef } = useHero();

  return (
    <section
      ref={containerRef}
      id="hero"
      className="mx-auto flex max-w-6xl flex-wrap items-center gap-12 px-5 py-24 sm:px-8"
    >
      <div className="min-w-80 flex-1 basis-[55%]">
        <h1 ref={headlineRef} className="text-4xl leading-tight sm:text-5xl">
          {HEADLINE_WORDS.map((word, index) => (
            <span key={index} data-word className="inline-block">
              {word}{" "}
            </span>
          ))}
        </h1>
        <p className="mt-6 max-w-xl leading-relaxed text-text-muted">
          O OT Notifier acompanha suas guildas e personagens favoritos e avisa no Discord quando alguém sobe de
          nível ou morre, sem precisar ficar checando o site do servidor.
        </p>
        <a href="#como-funciona" className="mt-8 inline-block border-b border-accent-dim pb-1 text-accent">
          Ver como funciona
        </a>
      </div>
      <ActivityTicker />
    </section>
  );
};
