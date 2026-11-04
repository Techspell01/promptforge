// The "forge" effect: text melts into smoke, smoke drifts while the model works, the prompt condenses
// back out of it. Monochrome by construction: every puff is the theme's ink colour at low opacity.

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function inkChannels(): [number, number, number] {
  const value = getComputedStyle(document.documentElement).getPropertyValue("--ink").trim();
  const match = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(value);
  if (!match) return [128, 128, 128];
  return [parseInt(match[1] ?? "80", 16), parseInt(match[2] ?? "80", 16), parseInt(match[3] ?? "80", 16)];
}

/** Light ink on a dark canvas reads as smoke at a higher opacity than dark ink on white. */
function themeStrength(): number {
  const [red] = inkChannels();
  return red > 128 ? 1 : 0.55;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  grow: number;
  age: number;
  life: number;
  alpha: number;
  seed: number;
}

export interface Region {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

const SPRITE_SIZE = 96;

/** A soft round puff, blurred with a canvas shadow so no gradient is involved. */
function makeSprite(): HTMLCanvasElement {
  const sprite = document.createElement("canvas");
  sprite.width = SPRITE_SIZE;
  sprite.height = SPRITE_SIZE;
  const context = sprite.getContext("2d");
  if (!context) return sprite;
  const [red, green, blue] = inkChannels();
  const offset = 1000;
  context.shadowColor = `rgb(${red} ${green} ${blue})`;
  context.shadowBlur = SPRITE_SIZE / 3.2;
  context.shadowOffsetX = offset;
  context.beginPath();
  context.arc(SPRITE_SIZE / 2 - offset, SPRITE_SIZE / 2, SPRITE_SIZE / 7, 0, Math.PI * 2);
  context.fill();
  return sprite;
}

const random = (min: number, max: number) => min + Math.random() * (max - min);

export class SmokeField {
  private readonly context: CanvasRenderingContext2D | null;
  private sprite: HTMLCanvasElement;
  private particles: Particle[] = [];
  private frame = 0;
  private last = 0;
  private ambient = 0;
  private ambientDebt = 0;
  private readonly strength: number;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.context = canvas.getContext("2d");
    this.sprite = makeSprite();
    this.strength = themeStrength();
  }

  /** Release a cloud across a region, e.g. where the idea text was. Coordinates are canvas-relative CSS px. */
  burst(region: Region, count: number, intensity = 1): void {
    for (let index = 0; index < count; index += 1) {
      this.particles.push({
        x: region.x + Math.random() * region.width,
        y: region.y + Math.random() * region.height,
        vx: random(-0.5, 0.5),
        vy: random(-1.3, -0.2),
        size: random(70, 150),
        grow: random(0.6, 1.4),
        age: 0,
        life: random(1300, 2500),
        alpha: random(0.1, 0.24) * intensity,
        seed: Math.random() * 1000,
      });
    }
    this.run();
  }

  /** Gentle continuous drift while the model works. 0 stops it; 1 is full. */
  setAmbient(level: number): void {
    this.ambient = level;
    if (level > 0) this.run();
  }

  destroy(): void {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.particles = [];
  }

  private run(): void {
    if (this.frame || !this.context) return;
    this.last = performance.now();
    this.frame = requestAnimationFrame(this.tick);
  }

  private fit(): { width: number; height: number } {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    if (
      this.canvas.width !== Math.round(width * ratio) ||
      this.canvas.height !== Math.round(height * ratio)
    ) {
      this.canvas.width = Math.round(width * ratio);
      this.canvas.height = Math.round(height * ratio);
    }
    this.context?.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { width, height };
  }

  private emitAmbient(elapsed: number, width: number, height: number): void {
    // About 10 puffs a second at full level, rising from the lower half of the box.
    this.ambientDebt += (elapsed / 1000) * 10 * this.ambient;
    while (this.ambientDebt >= 1) {
      this.ambientDebt -= 1;
      this.particles.push({
        x: random(width * 0.1, width * 0.9),
        y: random(height * 0.55, height * 1.05),
        vx: random(-0.25, 0.25),
        vy: random(-0.7, -0.25),
        size: random(160, 300),
        grow: random(0.3, 0.8),
        age: 0,
        life: random(2800, 4600),
        alpha: random(0.05, 0.11),
        seed: Math.random() * 1000,
      });
    }
  }

  private readonly tick = (now: number): void => {
    const context = this.context;
    if (!context) return;
    const elapsed = Math.min(now - this.last, 64);
    this.last = now;
    const step = elapsed / 16.67;
    const { width, height } = this.fit();
    if (this.ambient > 0) this.emitAmbient(elapsed, width, height);

    context.clearRect(0, 0, width, height);
    this.particles = this.particles.filter((particle) => {
      particle.age += elapsed;
      const progress = particle.age / particle.life;
      if (progress >= 1) return false;
      // A slow sideways sway makes the plume curl instead of rising in straight lines.
      particle.vx += Math.sin(particle.seed + particle.age / 280) * 0.018 * step;
      particle.vx *= 0.985;
      particle.vy -= 0.01 * step;
      particle.x += particle.vx * step;
      particle.y += particle.vy * step;
      particle.size += particle.grow * step;
      context.globalAlpha = particle.alpha * this.strength * Math.sin(Math.PI * progress);
      context.drawImage(
        this.sprite,
        particle.x - particle.size / 2,
        particle.y - particle.size / 2,
        particle.size,
        particle.size,
      );
      return true;
    });
    context.globalAlpha = 1;

    if (this.particles.length === 0 && this.ambient === 0) {
      this.frame = 0;
      context.clearRect(0, 0, width, height);
      return;
    }
    this.frame = requestAnimationFrame(this.tick);
  };
}

export interface DissolveFilter {
  readonly id: string;
  readonly turbulence: SVGFETurbulenceElement;
  readonly displacement: SVGFEDisplacementMapElement;
}

/**
 * Melts an element into noise ("out") or condenses it back ("in") with an SVG turbulence displacement,
 * a blur and a fade. Resolves when finished; leaves the element hidden after "out".
 */
export function dissolve(
  element: HTMLElement,
  filter: DissolveFilter,
  direction: "out" | "in",
  duration: number,
): Promise<void> {
  const finish = () => {
    filter.displacement.setAttribute("scale", "0");
    element.style.filter = "";
    element.style.transform = "";
    element.style.opacity = direction === "out" ? "0" : "";
  };
  if (prefersReducedMotion()) {
    finish();
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const started = performance.now();
    const frame = (now: number) => {
      const linear = Math.min(1, (now - started) / duration);
      const eased = direction === "out" ? linear * linear : 1 - (1 - linear) * (1 - linear);
      const amount = direction === "out" ? eased : 1 - eased;
      filter.displacement.setAttribute("scale", String(amount * 140));
      filter.turbulence.setAttribute(
        "baseFrequency",
        `${(0.008 + amount * 0.02).toFixed(4)} ${(0.03 + amount * 0.05).toFixed(4)}`,
      );
      element.style.filter = `url(#${filter.id}) blur(${(amount * 9).toFixed(2)}px)`;
      element.style.opacity = String(1 - amount);
      element.style.transform = `translateY(${(-amount * 14).toFixed(1)}px) scale(${1 + amount * 0.03})`;
      if (linear < 1) requestAnimationFrame(frame);
      else {
        finish();
        resolve();
      }
    };
    requestAnimationFrame(frame);
  });
}
