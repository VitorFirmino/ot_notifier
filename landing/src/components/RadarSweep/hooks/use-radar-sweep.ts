import { useRef, type RefObject } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

interface UseRadarSweepResult {
  svgRef: RefObject<SVGSVGElement | null>;
}

export const useRadarSweep = (): UseRadarSweepResult => {
  const svgRef = useRef<SVGSVGElement>(null);

  useGSAP(
    () => {
      const sweep = svgRef.current?.querySelector("[data-sweep]");
      const blips = svgRef.current?.querySelectorAll("[data-blip]");
      if (!sweep || !blips || blips.length === 0) return;

      const motionOk = window.matchMedia("(prefers-reduced-motion: no-preference)").matches;
      if (!motionOk) return;

      gsap.to(sweep, {
        rotation: 360,
        duration: 4,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      });

      gsap.to(blips, {
        opacity: 0.35,
        scale: 0.85,
        duration: 1.4,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        stagger: { each: 0.3, from: "random" },
        transformOrigin: "50% 50%",
      });
    },
    { scope: svgRef }
  );

  return { svgRef };
};
