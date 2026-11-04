"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";
import { dissolve, prefersReducedMotion, SmokeField } from "./smoke";

const FILTER_ID = "pf-dissolve";

/** Rough height of the text in a text box: wrapped lines times line height, plus padding. */
function textHeight(box: HTMLTextAreaElement): number {
  const style = getComputedStyle(box);
  const fontSize = parseFloat(style.fontSize) || 16;
  const lineHeight = parseFloat(style.lineHeight) || fontSize * 1.6;
  const padding = (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0);
  const perLine = Math.max(10, Math.floor(box.clientWidth / (fontSize * 0.52)));
  const lines = box.value
    .split(String.fromCharCode(10))
    .reduce((total, paragraph) => total + Math.max(1, Math.ceil(paragraph.length / perLine)), 0);
  return lines * lineHeight + padding;
}

/** Where the element's visible content is, relative to the stage. For a text box, only the lines with text. */
function regionWithin(element: Element, container: Element) {
  const inner = element.getBoundingClientRect();
  const outer = container.getBoundingClientRect();
  const height =
    element instanceof HTMLTextAreaElement ? Math.min(inner.height, textHeight(element)) : inner.height;
  return { x: inner.left - outer.left, y: inner.top - outer.top, width: inner.width, height };
}

/** Owns the smoke canvas and the melt filter for one forge box. All returned functions are stable. */
export function useForge() {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const turbulenceRef = useRef<SVGFETurbulenceElement>(null);
  const displacementRef = useRef<SVGFEDisplacementMapElement>(null);
  const smoke = useRef<SmokeField | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const field = new SmokeField(canvasRef.current);
    smoke.current = field;
    return () => {
      field.destroy();
    };
  }, []);

  /** A cloud of smoke released over an element's area. */
  const puff = useCallback((element: Element | null, count: number, intensity = 1) => {
    const stage = stageRef.current;
    if (!element || !stage || !smoke.current || prefersReducedMotion()) return;
    smoke.current.burst(regionWithin(element, stage), count, intensity);
  }, []);

  /** Melts an element into smoke ("out") or condenses it from smoke ("in"). */
  const melt = useCallback(async (element: HTMLElement | null, direction: "out" | "in", duration: number) => {
    const turbulence = turbulenceRef.current;
    const displacement = displacementRef.current;
    if (!element || !turbulence || !displacement) return;
    if (direction === "in") element.style.opacity = "0";
    await dissolve(element, { id: FILTER_ID, turbulence, displacement }, direction, duration);
  }, []);

  const setAmbient = useCallback((level: number) => {
    smoke.current?.setAmbient(prefersReducedMotion() ? 0 : level);
  }, []);

  return { stageRef, canvasRef, turbulenceRef, displacementRef, puff, melt, setAmbient };
}

/** Turbulence + displacement: the SVG filter that melts text into smoke. Render once per forge box. */
export function MeltFilter({
  turbulenceRef,
  displacementRef,
}: {
  turbulenceRef: RefObject<SVGFETurbulenceElement | null>;
  displacementRef: RefObject<SVGFEDisplacementMapElement | null>;
}) {
  return (
    <svg width="0" height="0" aria-hidden className="absolute">
      <filter id={FILTER_ID} x="-20%" y="-30%" width="140%" height="160%">
        <feTurbulence
          ref={turbulenceRef}
          type="fractalNoise"
          baseFrequency="0.008 0.03"
          numOctaves={2}
          seed={7}
          result="noise"
        />
        <feDisplacementMap
          ref={displacementRef}
          in="SourceGraphic"
          in2="noise"
          scale={0}
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </svg>
  );
}

/** The canvas the smoke is drawn on; it sits above the box content and ignores the pointer. */
export function SmokeCanvas({ canvasRef }: { canvasRef: RefObject<HTMLCanvasElement | null> }) {
  return (
    <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 z-20 h-full w-full" />
  );
}
