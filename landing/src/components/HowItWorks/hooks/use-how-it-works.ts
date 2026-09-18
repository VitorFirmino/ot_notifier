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
