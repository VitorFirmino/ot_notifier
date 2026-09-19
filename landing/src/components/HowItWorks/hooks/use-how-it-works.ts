import { useRef, type RefObject } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export interface HowItWorksStep {
  id: string;
  title: string;
  description: string;
}

export const HOW_IT_WORKS_STEPS: HowItWorksStep[] = [
  {
    id: "cadastro",
    title: "Cadastre a guilda",
    description: "Informe a URL da guilda ou deixe o OT Notifier descobrir sozinho a partir do endereço do servidor.",
  },
  {
    id: "monitoramento",
    title: "O sistema monitora",
    description: "Verificamos os personagens da guilda no intervalo que você definir, sem sobrecarregar o servidor.",
  },
  {
    id: "notificacao",
    title: "Você recebe no Discord",
    description: "Level up, level down e mortes chegam direto no canal do Discord que você escolher.",
  },
];

const ICON_ANIMATIONS: Record<string, (glyph: Element) => void> = {
  cadastro: (glyph) => {
    const check = glyph.querySelector('[data-anim="check"]') as SVGPathElement | null;
    if (!check) return;
    const length = check.getTotalLength();
    gsap.set(check, { strokeDasharray: length, strokeDashoffset: length });
    gsap.timeline({ repeat: -1, repeatDelay: 1.4 }).to(check, {
      strokeDashoffset: 0,
      duration: 0.6,
      ease: "power2.out",
    });
  },
  monitoramento: (glyph) => {
    const pupil = glyph.querySelector('[data-anim="pupil"]');
    const lid = glyph.querySelector('[data-anim="lid"]');
    if (pupil) {
      gsap.to(pupil, {
        scale: 1.3,
        duration: 1,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        transformOrigin: "50% 50%",
      });
    }
    if (lid) {
      gsap
        .timeline({ repeat: -1, repeatDelay: 2.2 })
        .to(lid, { scaleY: 0.1, duration: 0.12, ease: "power1.inOut", transformOrigin: "50% 50%" })
        .to(lid, { scaleY: 1, duration: 0.12, ease: "power1.inOut", transformOrigin: "50% 50%" });
    }
  },
  notificacao: (glyph) => {
    const body = glyph.querySelector('[data-anim="body"]');
    if (!body) return;
    gsap
      .timeline({ repeat: -1, repeatDelay: 1.6 })
      .to(body, { rotation: 14, duration: 0.12, ease: "power1.inOut", transformOrigin: "50% 0%" })
      .to(body, { rotation: -14, duration: 0.24, ease: "power1.inOut", transformOrigin: "50% 0%" })
      .to(body, { rotation: 8, duration: 0.2, ease: "power1.inOut", transformOrigin: "50% 0%" })
      .to(body, { rotation: 0, duration: 0.2, ease: "power1.inOut", transformOrigin: "50% 0%" });
  },
};

interface UseHowItWorksResult {
  sectionRef: RefObject<HTMLDivElement | null>;
  trackRef: RefObject<HTMLDivElement | null>;
  steps: HowItWorksStep[];
}

export const useHowItWorks = (): UseHowItWorksResult => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const track = trackRef.current;
      const cards = Array.from(track?.querySelectorAll("[data-step-card]") ?? []) as HTMLElement[];
      const glyphs = track?.querySelectorAll("[data-step-icon-glyph]");
      const svg = track?.querySelector("[data-step-connector-svg]") as SVGSVGElement | null;
      const segments = Array.from(track?.querySelectorAll("[data-step-connector-segment]") ?? []) as SVGPathElement[];
      if (!track || cards.length === 0) return;

      const layoutConnectors = () => {
        if (!svg) return;
        const trackRect = track.getBoundingClientRect();
        svg.setAttribute("viewBox", `0 0 ${trackRect.width} ${trackRect.height}`);

        cards.forEach((card, index) => {
          const segment = segments[index];
          const nextCard = cards[index + 1];
          if (!segment || !nextCard) return;

          const isLeftCard = index % 2 === 0;
          const cardRect = card.getBoundingClientRect();
          const nextRect = nextCard.getBoundingClientRect();
          const inset = 14;
          const fromX = (isLeftCard ? cardRect.right - inset : cardRect.left + inset) - trackRect.left;
          const fromY = cardRect.bottom - inset - trackRect.top;
          const toX = (isLeftCard ? nextRect.left + inset : nextRect.right - inset) - trackRect.left;
          const toY = nextRect.top + inset - trackRect.top;

          segment.setAttribute("d", `M ${fromX} ${fromY} L ${toX} ${toY}`);
        });
      };

      layoutConnectors();
      window.addEventListener("resize", layoutConnectors);

      gsap.matchMedia().add(
        {
          motionOk: "(prefers-reduced-motion: no-preference)",
          isTablet: "(min-width: 640px)",
          isDesktop: "(min-width: 1024px)",
        },
        (context) => {
          const { motionOk, isTablet, isDesktop } = context.conditions as {
            motionOk: boolean;
            isTablet: boolean;
            isDesktop: boolean;
          };
          if (!motionOk) {
            gsap.set(cards, { autoAlpha: 1, x: 0, y: 0, rotationX: 0, scale: 1 });
            gsap.set(segments, { strokeDashoffset: 0 });
            return;
          }

          gsap.set(cards, { transformPerspective: 900 });
          const offsetMagnitude = isDesktop ? 80 : isTablet ? 48 : 24;

          cards.forEach((card, index) => {
            const fromX = index % 2 === 0 ? -offsetMagnitude : offsetMagnitude;
            const scrollTrigger = { trigger: card, start: "top 92%", end: "top 45%", scrub: true };

            gsap.fromTo(
              card,
              { autoAlpha: 0, x: fromX, rotationX: 20, scale: 0.94 },
              { autoAlpha: 1, x: 0, rotationX: 0, scale: 1, ease: "none", scrollTrigger }
            );

            const segment = segments[index - 1];
            if (segment) {
              const length = segment.getTotalLength();
              gsap.set(segment, { strokeDasharray: length, strokeDashoffset: length });
              gsap.to(segment, { strokeDashoffset: 0, ease: "none", scrollTrigger });
            }
          });

          glyphs?.forEach((glyph) => {
            const stepId = (glyph as HTMLElement).dataset.stepId;
            const animate = stepId ? ICON_ANIMATIONS[stepId] : undefined;
            animate?.(glyph);
          });
        }
      );

      return () => window.removeEventListener("resize", layoutConnectors);
    },
    { scope: sectionRef }
  );

  return { sectionRef, trackRef, steps: HOW_IT_WORKS_STEPS };
};
