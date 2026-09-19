import { useRef, type RefObject } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

interface UseHeaderResult {
  headerRef: RefObject<HTMLDivElement | null>;
}

export const useHeader = (): UseHeaderResult => {
  const headerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const surface = headerRef.current?.querySelector("[data-header-surface]");

      gsap.matchMedia().add(
        { motionOk: "(prefers-reduced-motion: no-preference)" },
        (context) => {
          const { motionOk } = context.conditions as { motionOk: boolean };
          if (!motionOk) {
            gsap.set(headerRef.current, { autoAlpha: 1, y: 0 });
            if (surface) gsap.set(surface, { autoAlpha: 1 });
            return;
          }

          gsap.from(headerRef.current, {
            autoAlpha: 0,
            y: -24,
            duration: 0.7,
            delay: 0.2,
            ease: "power3.out",
          });

          if (surface) {
            gsap.set(surface, { autoAlpha: 0 });
            gsap.to(surface, {
              autoAlpha: 1,
              ease: "none",
              scrollTrigger: {
                trigger: document.body,
                start: "top top",
                end: "+=120",
                scrub: true,
              },
            });
          }
        }
      );
    },
    { scope: headerRef }
  );

  return { headerRef };
};
