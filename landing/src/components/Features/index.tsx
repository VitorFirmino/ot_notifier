import { useFeatures } from "./hooks/use-features";

const SIZE_CLASS: Record<string, string> = {
  large: "sm:col-span-2",
  small: "sm:col-span-1",
};

export const Features: React.FC = () => {
  const { gridRef, features } = useFeatures();

  return (
    <section id="recursos" className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
      <h2 className="mb-8 text-3xl">Recursos</h2>
      <div ref={gridRef} className="grid grid-cols-1 gap-5 sm:grid-cols-4">
        {features.map((feature) => (
          <article
            key={feature.id}
            data-feature-card
            className={`rounded-xl border border-white/10 bg-surface p-6 ${SIZE_CLASS[feature.size]}`}
          >
            <h3 className="mb-2">{feature.title}</h3>
            <p className="leading-relaxed text-text-muted">{feature.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
};
