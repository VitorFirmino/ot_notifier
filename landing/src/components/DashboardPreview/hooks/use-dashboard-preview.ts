import { useRef, type RefObject } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

interface UseDashboardPreviewResult {
  frameRef: RefObject<HTMLDivElement | null>;
}

export const useDashboardPreview = (): UseDashboardPreviewResult => {
  const frameRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const frame = frameRef.current;
      if (!frame) return;

      gsap.matchMedia().add(
        { motionOk: "(prefers-reduced-motion: no-preference)" },
        (context) => {
          const { motionOk } = context.conditions as { motionOk: boolean };
          if (!motionOk) {
            gsap.set(frame, { autoAlpha: 1, rotationX: 0, y: 0 });
            return;
          }

          gsap.set(frame, { transformPerspective: 1200 });
          gsap.fromTo(
            frame,
            { autoAlpha: 0, rotationX: 18, y: 60 },
            {
              autoAlpha: 1,
              rotationX: 0,
              y: 0,
              ease: "none",
              scrollTrigger: {
                trigger: frame,
                start: "top 90%",
                end: "top 35%",
                scrub: true,
              },
            }
          );
        }
      );
    },
    { scope: frameRef }
  );

  return { frameRef };
};
