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

interface UseHowItWorksResult {
  sectionRef: RefObject<HTMLDivElement | null>;
  pathRef: RefObject<SVGPathElement | null>;
  steps: HowItWorksStep[];
}

export const useHowItWorks = (): UseHowItWorksResult => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement | null>(null);

  useGSAP(
    () => {
      const path = pathRef.current;
      const nodes = sectionRef.current?.querySelectorAll("[data-step-node]");
      if (!path || !nodes || nodes.length === 0) return;

      const pathLength = path.getTotalLength();
      gsap.set(path, { strokeDasharray: pathLength, strokeDashoffset: pathLength });

      gsap
        .timeline({
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 70%",
            end: "bottom 60%",
            scrub: true,
          },
        })
        .to(path, { strokeDashoffset: 0, ease: "none" })
        .to(nodes, { opacity: 1, stagger: { each: 0.3, from: "start" }, ease: "none" }, 0);
    },
    { scope: sectionRef }
  );

  return { sectionRef, pathRef, steps: HOW_IT_WORKS_STEPS };
};
