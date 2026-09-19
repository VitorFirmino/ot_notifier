import { useRef, type RefObject } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

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

const hexToRgb = (hex: string): string => {
  const clean = hex.trim().replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
};

export const useGridPingBackground = (): UseGridPingBackgroundResult => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useGSAP(
    () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;

      const readColors = (): { accent: string; dotRgb: string } => {
        const styles = getComputedStyle(document.documentElement);
        return {
          accent: styles.getPropertyValue("--color-accent").trim() || "#22d3ee",
          dotRgb: hexToRgb(styles.getPropertyValue("--color-text").trim() || "#e5e7eb"),
        };
      };

      let { accent, dotRgb } = readColors();
      const motionOk = window.matchMedia("(prefers-reduced-motion: no-preference)").matches;

      let width = 0;
      let height = 0;
      let pings: Ping[] = [];
      let rafId = 0;
      let pingIntervalId = 0;

      const resize = (): void => {
        width = window.innerWidth;
        height = window.innerHeight;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      };

      const drawDots = (): void => {
        ctx.fillStyle = `rgba(${dotRgb}, 0.08)`;
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

      const themeObserver = new MutationObserver(() => {
        ({ accent, dotRgb } = readColors());
        if (!motionOk) drawDots();
      });
      themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

      if (motionOk) {
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
        themeObserver.disconnect();
      };
    },
    { scope: canvasRef }
  );

  return { canvasRef };
};
