import { useRef, type RefObject } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { MOCK_ACTIVITY_EVENTS, type MockActivityEvent } from "@data/mockEvents";

gsap.registerPlugin(useGSAP);

interface UseActivityTickerResult {
  listRef: RefObject<HTMLUListElement | null>;
  events: MockActivityEvent[];
}

export const useActivityTicker = (): UseActivityTickerResult => {
  const listRef = useRef<HTMLUListElement>(null);

  useGSAP(
    () => {
      const items = listRef.current?.querySelectorAll("[data-ticker-item]");
      if (!items || items.length === 0) return;

      gsap.matchMedia().add(
        { motionOk: "(prefers-reduced-motion: no-preference)" },
        (context) => {
          const { motionOk } = context.conditions as { motionOk: boolean };
          if (!motionOk) {
            gsap.set(items, { autoAlpha: 1, y: 0 });
            return;
          }

          gsap.set(items, { autoAlpha: 0, y: 16 });

          gsap.timeline({ repeat: -1, repeatDelay: 1.2 }).to(items, {
            autoAlpha: 1,
            y: 0,
            duration: 0.5,
            ease: "power2.out",
            stagger: 0.5,
          });
        }
      );
    },
    { scope: listRef }
  );

  return { listRef, events: MOCK_ACTIVITY_EVENTS };
};
