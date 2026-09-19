import { useFeatures } from "./hooks/use-features";
import { ServersIcon } from "./icons/ServersIcon";
import { RadarShieldIcon } from "./icons/RadarShieldIcon";
import { WebhookIcon } from "./icons/WebhookIcon";
import { HistoryIcon } from "./icons/HistoryIcon";
import { GuildsIcon } from "./icons/GuildsIcon";
import { IntervalIcon } from "./icons/IntervalIcon";

const FEATURE_ICON: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = {
  "multi-servidor": ServersIcon,
  cloudflare: RadarShieldIcon,
  webhook: WebhookIcon,
  historico: HistoryIcon,
  "multi-guilda": GuildsIcon,
  intervalo: IntervalIcon,
};

export const Features: React.FC = () => {
  const { sectionRef, stageRef, captionTitleRef, captionDescriptionRef, features } = useFeatures();

  return (
    <section
      ref={sectionRef}
      id="recursos"
      className="mx-auto flex max-w-6xl flex-col items-center px-5 py-24 sm:px-8"
    >
      <h2 className="mb-16 text-5xl">Recursos</h2>

      <div
        ref={stageRef}
        className="relative flex w-full flex-wrap items-start justify-center gap-x-6 gap-y-10 overflow-x-hidden"
      >
        {features.map((feature) => {
          const Icon = FEATURE_ICON[feature.id];
          return (
            <article
              key={feature.id}
              data-feature-cover
              className="flex w-36 flex-col items-center gap-3 text-center"
            >
              <span className="glass-liquid flex h-28 w-28 items-center justify-center rounded-2xl border border-white/10">
                <Icon data-feature-icon-glyph data-feature-id={feature.id} className="h-10 w-10" />
              </span>
              <div data-feature-inline-text>
                <h3 className="text-sm">{feature.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-text-muted">{feature.description}</p>
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-10 max-w-md text-center opacity-0">
        <h3 ref={captionTitleRef} className="text-2xl text-accent" />
        <p ref={captionDescriptionRef} className="mt-2 leading-relaxed text-text-muted" />
      </div>
    </section>
  );
};
