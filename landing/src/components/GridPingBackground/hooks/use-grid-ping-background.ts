import { useRef, type RefObject } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

interface Ping {
  x: number;
  y: number;
  start: number;
}

interface UseGridPingBackgroundResult {
  canvasRef: RefObject<HTMLCanvasElement | null>;
}

const PING_LIFETIME_MS = 2200;
const PING_INTERVAL_MS = 2400;
const GRID_SPACING = 28;
const DOT_RADIUS = 1.2;

export const useGridPingBackground = (): UseGridPingBackgroundResult => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useGSAP(
    () => {
      const canvas = canvasRef.current;
      const parent = canvas?.parentElement;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !parent || !ctx) return;

      const accent = getComputedStyle(document.documentElement).getPropertyValue("--color-accent").trim() || "#22d3ee";
      const motionOk = window.matchMedia("(prefers-reduced-motion: no-preference)").matches;

      let width = 0;
      let height = 0;
      let pings: Ping[] = [];
      let rafId = 0;
      let pingIntervalId = 0;

      const resize = (): void => {
        width = parent.clientWidth;
        height = parent.clientHeight;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      };

      const drawDots = (): void => {
        ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
        for (let y = GRID_SPACING / 2; y < height; y += GRID_SPACING) {
          for (let x = GRID_SPACING / 2; x < width; x += GRID_SPACING) {
            ctx.beginPath();
            ctx.arc(x, y, DOT_RADIUS, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      };

      const drawFrame = (time: number): void => {
        ctx.clearRect(0, 0, width, height);
        drawDots();

        pings = pings.filter((ping) => time - ping.start < PING_LIFETIME_MS);
        pings.forEach((ping) => {
          const progress = Math.max(0, (time - ping.start) / PING_LIFETIME_MS);
          const radius = progress * Math.max(width, height) * 0.6;
          const alpha = Math.round((1 - progress) * 60)
            .toString(16)
            .padStart(2, "0");
          ctx.strokeStyle = `${accent}${alpha}`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(ping.x, ping.y, radius, 0, Math.PI * 2);
          ctx.stroke();
        });

        rafId = requestAnimationFrame(drawFrame);
      };

      const spawnPing = (): void => {
        pings.push({ x: Math.random() * width, y: Math.random() * height, start: performance.now() });
      };

      resize();
      window.addEventListener("resize", resize);

      if (motionOk) {
        gsap.to(canvas, {
          yPercent: 20,
          ease: "none",
          scrollTrigger: {
            trigger: parent,
            start: "top top",
            end: "bottom top",
            scrub: true,
          },
        });

        spawnPing();
        rafId = requestAnimationFrame(drawFrame);
        pingIntervalId = window.setInterval(spawnPing, PING_INTERVAL_MS);
      } else {
        drawDots();
      }

      return () => {
        window.removeEventListener("resize", resize);
        cancelAnimationFrame(rafId);
        window.clearInterval(pingIntervalId);
      };
    },
    { scope: canvasRef }
  );

  return { canvasRef };
};
