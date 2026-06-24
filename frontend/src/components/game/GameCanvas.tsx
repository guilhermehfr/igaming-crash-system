import { Lock } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const SAMPLE_SEED = '0f9a...3c2';

const TICK_MS = 100;
const GROWTH = 0.005;
const POWER = 2.2;
const EXPLOSION_DURATION = 800;
const PARTICLE_DURATION = 600;
const COLOR_TRANSITION_MS = 600;
const PARTICLE_COUNT = 8;
const SCALE_DENOM = Math.log(15);

type Point = { x: number; y: number };
type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  startTime: number;
  radius: number;
};
type RGB = { r: number; g: number; b: number };

const GREEN: RGB = { r: 0x00, g: 0xff, b: 0x88 };
const RED: RGB = { r: 0xff, g: 0x44, b: 0x44 };

function rgbString(c: RGB): string {
  return `rgb(${c.r},${c.g},${c.b})`;
}

function lerpRGB(a: RGB, b: RGB, t: number): RGB {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}

function computePoints(m: number, w: number, h: number): Point[] {
  if (m <= 1.0) return [];
  const scaleFactor = (h * 0.85) / SCALE_DENOM;
  const pts = 150;
  const out: Point[] = [];
  for (let i = 0; i <= pts; i++) {
    const t = i / pts;
    const curveM = 1 + (m - 1) * t ** POWER;
    const x = t * w;
    const y = h - Math.log(curveM) * scaleFactor;
    out.push({ x, y: Math.max(0, Math.min(h, y)) });
  }
  return out;
}

function getTipAngle(points: Point[]): number {
  if (points.length < 2) return -Math.PI / 2;
  const a = points[points.length - 2];
  const b = points[points.length - 1];
  return Math.atan2(b.y - a.y, b.x - a.x);
}

function drawLine(ctx: CanvasRenderingContext2D, points: Point[], color: RGB) {
  const c = rgbString(color);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.strokeStyle = c;
  ctx.shadowBlur = 10;
  ctx.shadowColor = c;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();
}

function drawRocket(ctx: CanvasRenderingContext2D, tip: Point, angle: number, color: RGB) {
  const s = 12;
  ctx.save();
  ctx.translate(tip.x, tip.y);
  ctx.rotate(angle + Math.PI / 2);
  ctx.fillStyle = rgbString(color);
  ctx.shadowBlur = 8;
  ctx.shadowColor = rgbString(color);
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.lineTo(-s * 0.55, -s * 0.15);
  ctx.lineTo(-s * 0.35, s * 0.4);
  ctx.lineTo(-s * 0.45, s * 0.6);
  ctx.lineTo(-s * 0.6, s);
  ctx.lineTo(-s * 0.25, s);
  ctx.lineTo(-s * 0.15, s * 0.55);
  ctx.lineTo(s * 0.15, s * 0.55);
  ctx.lineTo(s * 0.25, s);
  ctx.lineTo(s * 0.6, s);
  ctx.lineTo(s * 0.45, s * 0.6);
  ctx.lineTo(s * 0.35, s * 0.4);
  ctx.lineTo(s * 0.55, -s * 0.15);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function generateParticles(x: number, y: number, now: number): Particle[] {
  const p: Particle[] = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const angle = (Math.PI * 2 * i) / PARTICLE_COUNT + (Math.random() - 0.5) * 0.6;
    const speed = 1.5 + Math.random() * 2.5;
    p.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      startTime: now,
      radius: 2 + Math.random() * 2.5,
    });
  }
  return p;
}

function drawExplosion(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
  crashTime: number,
  now: number,
) {
  const elapsed = now - crashTime;
  const centerT = Math.min(elapsed / EXPLOSION_DURATION, 1);
  const centerRadius = centerT * 40;
  const centerOpacity = 1 - centerT;

  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  if (particles.length > 0) {
    const tip = { x: particles[0].x, y: particles[0].y };
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, centerRadius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${centerOpacity * 0.6})`;
    ctx.fill();

    for (const p of particles) {
      const pElapsed = now - p.startTime;
      if (pElapsed > PARTICLE_DURATION) continue;
      const pT = pElapsed / PARTICLE_DURATION;
      const px = p.x + p.vx * pElapsed * 0.04;
      const py = p.y + p.vy * pElapsed * 0.04;
      const pOpacity = 1 - pT;
      ctx.beginPath();
      ctx.arc(px, py, p.radius * (1 - pT * 0.4), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,210,220,${pOpacity * 0.5})`;
      ctx.fill();
    }
  }

  ctx.restore();
}

export function GameCanvas({
  roundState,
  roundNumber,
  currentMultiplier,
}: {
  roundState: 'betting' | 'running' | 'crashed';
  roundNumber: number;
  currentMultiplier?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const multiplierRef = useRef(1.0);
  const crashTimeRef = useRef(0);
  const finalMultiplierRef = useRef(1.0);
  const pathPointsRef = useRef<Point[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const stateRef = useRef(roundState);

  const [fallbackMultiplier, setFallbackMultiplier] = useState(1.0);

  stateRef.current = roundState;

  const multiplier = currentMultiplier !== undefined ? currentMultiplier : fallbackMultiplier;

  useEffect(() => {
    if (currentMultiplier !== undefined) {
      multiplierRef.current = currentMultiplier;
    }
  }, [currentMultiplier]);

  useEffect(() => {
    if (currentMultiplier !== undefined) return;

    if (roundState !== 'running') {
      clearInterval(timerRef.current);
      timerRef.current = undefined;
      return;
    }
    timerRef.current = setInterval(() => {
      setFallbackMultiplier((prev) => {
        const next = prev + prev * GROWTH;
        multiplierRef.current = next;
        return next;
      });
    }, TICK_MS);
    return () => {
      clearInterval(timerRef.current);
      timerRef.current = undefined;
    };
  }, [roundState, currentMultiplier]);

  useEffect(() => {
    if (roundState === 'running') {
      if (currentMultiplier === undefined) {
        setFallbackMultiplier(1.0);
        multiplierRef.current = 1.0;
      }
      pathPointsRef.current = [];
    }

    if (roundState === 'crashed') {
      clearInterval(timerRef.current);
      timerRef.current = undefined;
      finalMultiplierRef.current = multiplierRef.current;
      const now = performance.now();
      crashTimeRef.current = now;
      const points = pathPointsRef.current;
      if (points.length > 0) {
        const tip = points[points.length - 1];
        particlesRef.current = generateParticles(tip.x, tip.y, now);
      }
    }

    if (roundState === 'betting') {
      clearInterval(timerRef.current);
      timerRef.current = undefined;
      if (currentMultiplier === undefined) {
        setFallbackMultiplier(1.0);
        multiplierRef.current = 1.0;
      }
      particlesRef.current = [];
      crashTimeRef.current = 0;
      pathPointsRef.current = [];
      finalMultiplierRef.current = 1.0;
    }
  }, [roundState, currentMultiplier]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    function resize() {
      const c = containerRef.current;
      const cv = canvasRef.current;
      if (!c || !cv) return;
      cv.width = c.clientWidth;
      cv.height = c.clientHeight;
    }

    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();

    function loop(now: number) {
      const cv = canvasRef.current;
      if (!cv) return;
      const ctx = cv.getContext('2d');
      if (!ctx) return;

      const w = cv.width;
      const h = cv.height;

      ctx.clearRect(0, 0, w, h);

      const state = stateRef.current;
      const crashTime = crashTimeRef.current;

      if (state === 'running') {
        const m = multiplierRef.current;
        const points = computePoints(m, w, h);
        pathPointsRef.current = points;
        if (points.length > 0) {
          drawLine(ctx, points, GREEN);
          drawRocket(ctx, points[points.length - 1], getTipAngle(points), GREEN);
        }
      }

      if (state === 'crashed' && crashTime > 0) {
        const finalM = finalMultiplierRef.current;
        const t = Math.min((now - crashTime) / COLOR_TRANSITION_MS, 1);
        const color = lerpRGB(GREEN, RED, t);
        const points = computePoints(finalM, w, h);
        if (points.length > 0) {
          drawLine(ctx, points, color);
        }
        const explosionElapsed = now - crashTime;
        if (explosionElapsed < EXPLOSION_DURATION) {
          drawExplosion(ctx, particlesRef.current, crashTime, now);
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const displayM = roundState === 'betting' ? 1.0 : multiplier;
  const textColor =
    roundState === 'crashed'
      ? 'text-loss-red'
      : roundState === 'running'
        ? 'text-neon-green'
        : 'text-slate-500';

  return (
    <div ref={containerRef} className="relative flex flex-1 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(255,255,255,0.025) 0px, rgba(255,255,255,0.025) 1px, transparent 1px, transparent 60px),' +
            'repeating-linear-gradient(90deg, rgba(255,255,255,0.025) 0px, rgba(255,255,255,0.025) 1px, transparent 1px, transparent 60px)',
        }}
      />

      <canvas ref={canvasRef} className="absolute inset-0 size-full" />

      <div className="absolute top-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1.5">
        <span className="text-xs font-medium uppercase tracking-widest text-slate-500">
          ROUND #{roundNumber}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700/50 bg-slate-800/60 px-2.5 py-0.5 text-[11px] font-medium text-slate-400">
          <Lock className="size-3" />
          SEED HASH: {SAMPLE_SEED}
        </span>
      </div>

      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className={`font-heading font-bold tabular-nums tracking-tight transition-colors duration-200 ${textColor}`}
          style={{
            fontSize: 'clamp(3rem, 14vw, 9rem)',
            lineHeight: 1,
            filter:
              roundState === 'running'
                ? 'drop-shadow(0 0 30px rgba(34,255,122,0.25))'
                : roundState === 'crashed'
                  ? 'drop-shadow(0 0 30px rgba(255,68,68,0.25))'
                  : 'none',
          }}
        >
          {displayM.toFixed(2)}x
        </span>
      </div>
    </div>
  );
}
