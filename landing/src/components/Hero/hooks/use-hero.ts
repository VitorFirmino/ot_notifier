import { useRef, type RefObject } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

interface UseHeroResult {
  containerRef: RefObject<HTMLDivElement | null>;
  headlineRef: RefObject<HTMLHeadingElement | null>;
  glowRef: RefObject<HTMLDivElement | null>;
}

export const useHero = (): UseHeroResult => {
  const containerRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

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

          gsap
            .timeline()
            .from(words, {
              autoAlpha: 0,
              y: 24,
              duration: 0.7,
              ease: "power3.out",
              stagger: 0.08,
            })
            .to(
              words,
              {
                color: "var(--color-accent)",
                duration: 0.7,
                stagger: { each: 0.09, from: "start" },
                ease: "sine.inOut",
                repeat: -1,
                repeatDelay: 1.4,
                yoyo: true,
              },
              "+=0.3"
            );

          if (glowRef.current) {
            gsap.to(glowRef.current, {
              x: 40,
              y: -20,
              scale: 1.15,
              opacity: 0.5,
              duration: 5,
              repeat: -1,
              yoyo: true,
              ease: "sine.inOut",
            });
          }
        }
      );
    },
    { scope: containerRef }
  );

  return { containerRef, headlineRef, glowRef };
};
