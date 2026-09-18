import { useRef, type RefObject } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export interface Feature {
  id: string;
  title: string;
  description: string;
  size: "large" | "small";
}

export const FEATURES: Feature[] = [
  {
    id: "multi-servidor",
    title: "Vários servidores ao mesmo tempo",
    description: "Monitore guildas em servidores OT diferentes a partir de um único painel.",
    size: "large",
  },
  {
    id: "cloudflare",
    title: "Detecção de Cloudflare",
    description: "Identifica quando um servidor está atrás de proteção anti-bot e avisa em vez de falhar silenciosamente.",
    size: "small",
  },
  {
    id: "webhook",
    title: "Webhook customizável",
    description: "Cada guilda pode ter seu próprio canal do Discord.",
    size: "small",
  },
  {
    id: "historico",
    title: "Histórico de eventos",
    description: "Veja o feed completo de level ups e mortes já detectados.",
    size: "small",
  },
  {
    id: "multi-guilda",
    title: "Múltiplas guildas por servidor",
    description: "Acompanhe guildas aliadas e rivais no mesmo servidor OT.",
    size: "large",
  },
  {
    id: "intervalo",
    title: "Intervalo configurável",
    description: "Ajuste a frequência de verificação para cada guilda.",
    size: "small",
  },
];

interface UseFeaturesResult {
  gridRef: RefObject<HTMLDivElement | null>;
  features: Feature[];
}

export const useFeatures = (): UseFeaturesResult => {
  const gridRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const cards = gridRef.current?.querySelectorAll("[data-feature-card]");
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
                stagger: 0.1,
                ease: "power3.out",
              }),
          });
        }
      );
    },
    { scope: gridRef }
  );

  return { gridRef, features: FEATURES };
};
