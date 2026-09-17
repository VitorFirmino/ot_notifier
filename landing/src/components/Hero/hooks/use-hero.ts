import { useRef, type RefObject } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

interface UseHeroResult {
  containerRef: RefObject<HTMLDivElement | null>;
  headlineRef: RefObject<HTMLHeadingElement | null>;
}

export const useHero = (): UseHeroResult => {
  const containerRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);

  useGSAP(
    () => {
      const words = headlineRef.current?.querySelectorAll("[data-word]");
      if (!words || words.length === 0) return;

      gsap.matchMedia().add(
        { motionOk: "(prefers-reduced-motion: no-preference)" },
        (context) => {
          const { motionOk } = context.conditions as { motionOk: boolean };
          if (!motionOk) {
            gsap.set(words, { autoAlpha: 1, y: 0 });
            return;
          }
          gsap.timeline().from(words, {
            autoAlpha: 0,
            y: 24,
            duration: 0.7,
            ease: "power3.out",
            stagger: 0.08,
          });
        }
      );
    },
    { scope: containerRef }
  );

  return { containerRef, headlineRef };
};
