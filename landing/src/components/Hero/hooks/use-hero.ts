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

          gsap.timeline().from(words, {
            autoAlpha: 0,
            y: 24,
            duration: 0.7,
            ease: "power3.out",
            stagger: 0.08,
          });

          const wordEls = Array.from(words) as HTMLElement[];
          const baseColor = getComputedStyle(document.documentElement).getPropertyValue("--color-text").trim() || "#e5e7eb";
          const accentColor = getComputedStyle(document.documentElement).getPropertyValue("--color-accent").trim() || "#22d3ee";
          const sweep = { pos: -2 };

          gsap.to(sweep, {
            pos: wordEls.length + 1,
            duration: 3.2,
            delay: 1.5,
            repeat: -1,
            repeatDelay: 1,
            ease: "none",
            onUpdate: () => {
              wordEls.forEach((word, i) => {
                const distance = Math.abs(sweep.pos - i);
                const intensity = Math.max(0, 1 - distance / 1.4);
                word.style.color = gsap.utils.interpolate(baseColor, accentColor, intensity);
              });
            },
          });

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
