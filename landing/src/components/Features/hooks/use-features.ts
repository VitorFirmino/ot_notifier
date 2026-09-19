import { useRef, type RefObject } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export interface Feature {
  id: string;
  title: string;
  description: string;
}

export const FEATURES: Feature[] = [
  {
    id: "multi-servidor",
    title: "Vários servidores ao mesmo tempo",
    description: "Monitore guildas em servidores OT diferentes a partir de um único painel.",
  },
  {
    id: "cloudflare",
    title: "Detecção de Cloudflare",
    description: "Identifica quando um servidor está atrás de proteção anti-bot e avisa em vez de falhar silenciosamente.",
  },
  {
    id: "webhook",
    title: "Webhook customizável",
    description: "Cada guilda pode ter seu próprio canal do Discord.",
  },
  {
    id: "historico",
    title: "Histórico de eventos",
    description: "Veja o feed completo de level ups e mortes já detectados.",
  },
  {
    id: "multi-guilda",
    title: "Múltiplas guildas por servidor",
    description: "Acompanhe guildas aliadas e rivais no mesmo servidor OT.",
  },
  {
    id: "intervalo",
    title: "Intervalo configurável",
    description: "Ajuste a frequência de verificação para cada guilda.",
  },
];

const ICON_ANIMATIONS: Record<string, (glyph: Element) => void> = {
  "multi-servidor": (glyph) => {
    const lights = glyph.querySelectorAll('[data-anim="light"]');
    gsap.to(lights, {
      opacity: 0.25,
      duration: 0.8,
      repeat: -1,
      yoyo: true,
      stagger: 0.4,
      ease: "sine.inOut",
    });
  },
  cloudflare: (glyph) => {
    const pulse = glyph.querySelector('[data-anim="pulse"]');
    if (!pulse) return;
    gsap.set(pulse, { transformOrigin: "50% 50%" });
    gsap.to(pulse, {
      scale: 1.8,
      opacity: 0,
      duration: 1.6,
      repeat: -1,
      repeatDelay: 0.4,
      ease: "power1.out",
    });
  },
  webhook: (glyph) => {
    const arrow = glyph.querySelector('[data-anim="arrow"]') as SVGPathElement | null;
    if (!arrow) return;
    const length = arrow.getTotalLength();
    gsap.set(arrow, { strokeDasharray: length, strokeDashoffset: length });
    gsap.timeline({ repeat: -1, repeatDelay: 1.2 }).to(arrow, {
      strokeDashoffset: 0,
      duration: 0.5,
      ease: "power2.out",
    });
  },
  historico: (glyph) => {
    const hand = glyph.querySelector('[data-anim="hand"]');
    if (!hand) return;
    gsap.set(hand, { transformOrigin: "12px 12px" });
    gsap
      .timeline({ repeat: -1, repeatDelay: 1 })
      .to(hand, { rotation: 90, duration: 0.6, ease: "power2.inOut" })
      .to(hand, { rotation: 0, duration: 0.6, ease: "power2.inOut" });
  },
  "multi-guilda": (glyph) => {
    const dots = glyph.querySelectorAll('[data-anim="dot"]');
    gsap.to(dots, {
      scale: 1.4,
      duration: 0.5,
      repeat: -1,
      yoyo: true,
      repeatDelay: 0.8,
      stagger: 0.25,
      transformOrigin: "50% 50%",
      ease: "sine.inOut",
    });
  },
  intervalo: (glyph) => {
    const knob = glyph.querySelector('[data-anim="knob"]');
    if (!knob) return;
    gsap.to(knob, {
      x: 6,
      duration: 1.1,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });
  },
};

interface UseFeaturesResult {
  sectionRef: RefObject<HTMLDivElement | null>;
  stageRef: RefObject<HTMLDivElement | null>;
  captionTitleRef: RefObject<HTMLHeadingElement | null>;
  captionDescriptionRef: RefObject<HTMLParagraphElement | null>;
  features: Feature[];
}

const SPACING = 168;
const ANGLE_STEP = 42;

export const useFeatures = (): UseFeaturesResult => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const captionTitleRef = useRef<HTMLHeadingElement>(null);
  const captionDescriptionRef = useRef<HTMLParagraphElement>(null);

  useGSAP(
    () => {
      const stage = stageRef.current;
      const covers = Array.from(stage?.querySelectorAll("[data-feature-cover]") ?? []) as HTMLElement[];
      const glyphs = stage?.querySelectorAll("[data-feature-icon-glyph]");
      const captionTitle = captionTitleRef.current;
      const captionDescription = captionDescriptionRef.current;
      if (!stage || covers.length === 0) return;

      glyphs?.forEach((glyph) => {
        const featureId = (glyph as HTMLElement).dataset.featureId;
        const animate = featureId ? ICON_ANIMATIONS[featureId] : undefined;
        animate?.(glyph);
      });

      gsap.matchMedia().add(
        { motionOk: "(prefers-reduced-motion: no-preference)" },
        (context) => {
          const { motionOk } = context.conditions as { motionOk: boolean };
          if (!motionOk) return;

          covers.forEach((cover) => cover.querySelector("[data-feature-inline-text]")?.remove());
          const tallest = Math.max(...covers.map((cover) => cover.offsetHeight));
          gsap.set(stage, { height: tallest });

          const footerHeight = document.querySelector("footer")?.offsetHeight ?? 0;
          const shortfall = window.innerHeight - sectionRef.current!.offsetHeight - footerHeight;
          if (shortfall > 0) {
            const currentPaddingBottom = parseFloat(getComputedStyle(sectionRef.current!).paddingBottom) || 0;
            gsap.set(sectionRef.current, { paddingBottom: currentPaddingBottom + shortfall + 40 });
          }
          gsap.set(covers, {
            position: "absolute",
            top: 0,
            left: "50%",
            xPercent: -50,
            transformPerspective: 1200,
          });
          if (captionTitle?.parentElement) gsap.set(captionTitle.parentElement, { autoAlpha: 1 });

          let lastIndex = -1;

          const render = (activeFloat: number): void => {
            covers.forEach((cover, i) => {
              const distance = i - activeFloat;
              const abs = Math.abs(distance);
              gsap.set(cover, {
                x: distance * SPACING,
                rotationY: gsap.utils.clamp(-64, 64, -distance * ANGLE_STEP),
                scale: gsap.utils.clamp(0.68, 1, 1 - abs * 0.16),
                autoAlpha: abs > 3.2 ? 0 : gsap.utils.clamp(0, 1, 1 - abs * 0.3),
                zIndex: Math.round(100 - abs * 10),
              });
            });

            const nearestIndex = Math.round(activeFloat);
            if (nearestIndex !== lastIndex) {
              lastIndex = nearestIndex;
              const feature = FEATURES[nearestIndex];
              if (captionTitle) captionTitle.textContent = feature.title;
              if (captionDescription) captionDescription.textContent = feature.description;
            }
          };

          render(0);

          ScrollTrigger.create({
            trigger: sectionRef.current,
            start: "top top",
            end: () => `+=${(covers.length - 1) * 480}`,
            scrub: true,
            pin: true,
            anticipatePin: 1,
            onUpdate: (self) => render(self.progress * (covers.length - 1)),
          });
        }
      );
    },
    { scope: sectionRef }
  );

  return { sectionRef, stageRef, captionTitleRef, captionDescriptionRef, features: FEATURES };
};
