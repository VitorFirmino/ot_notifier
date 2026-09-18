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
    gsap.to(glyph, { rotation: 360, duration: 6, repeat: -1, ease: "none", transformOrigin: "50% 50%" });
  },
  monitoramento: (glyph) => {
    gsap.to(glyph, { rotation: 360, duration: 4, repeat: -1, ease: "none", transformOrigin: "50% 50%" });
    gsap.to(glyph, {
      scale: 1.15,
      duration: 1,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
      transformOrigin: "50% 50%",
    });
  },
  notificacao: (glyph) => {
    gsap.to(glyph, { x: 3, y: -3, duration: 0.8, repeat: -1, yoyo: true, ease: "sine.inOut" });
  },
};

interface UseHowItWorksResult {
  sectionRef: RefObject<HTMLDivElement | null>;
  steps: HowItWorksStep[];
}

export const useHowItWorks = (): UseHowItWorksResult => {
  const sectionRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const cards = sectionRef.current?.querySelectorAll("[data-step-card]");
      const glyphs = sectionRef.current?.querySelectorAll("[data-step-icon-glyph]");
      if (!cards || cards.length === 0) return;

      gsap.matchMedia().add(
        { motionOk: "(prefers-reduced-motion: no-preference)" },
        (context) => {
          const { motionOk } = context.conditions as { motionOk: boolean };
          if (!motionOk) {
            gsap.set(cards, { autoAlpha: 1, y: 0, rotationX: 0, scale: 1 });
            return;
          }

          gsap.set(cards, { transformPerspective: 900 });
          gsap.set(cards, { autoAlpha: 0, y: 40, rotationX: 25, scale: 0.92 });

          ScrollTrigger.batch(cards, {
            start: "top 88%",
            onEnter: (batch) =>
              gsap.to(batch, {
                autoAlpha: 1,
                y: 0,
                rotationX: 0,
                scale: 1,
                duration: 0.6,
                stagger: 0.15,
                ease: "power3.out",
              }),
          });

          glyphs?.forEach((glyph) => {
            const stepId = (glyph as HTMLElement).dataset.stepId;
            const animate = stepId ? ICON_ANIMATIONS[stepId] : undefined;
            animate?.(glyph);
          });
        }
      );
    },
    { scope: sectionRef }
  );

  return { sectionRef, steps: HOW_IT_WORKS_STEPS };
};
