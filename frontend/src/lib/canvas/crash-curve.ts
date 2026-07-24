export type Point = { x: number; y: number };

const CURVE_WIDTH_FRAC = 0.85;
const CURVE_HEIGHT_FRAC = 0.85;

export function computePoints(
  multiplier: number,
  crashPoint: number,
  width: number,
  height: number,
): Point[] {
  if (crashPoint <= 1 || multiplier <= 1 || width <= 0 || height <= 0) return [];

  const progress = Math.min((multiplier - 1) / (crashPoint - 1), 1);
  const count = Math.max(2, Math.ceil(progress * 150));
  const expDenom = Math.exp(4) - 1;

  const points: Point[] = [];
  for (let i = 0; i < count; i++) {
    const p = i / (count - 1);
    const curve = (Math.exp(4 * p) - 1) / expDenom;
    points.push({
      x: p * width * CURVE_WIDTH_FRAC,
      y: height - curve * progress * height * CURVE_HEIGHT_FRAC,
    });
  }
  return points;
}

export function drawLine(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  color: string,
): void {
  if (points.length < 2) return;

  ctx.save();
  ctx.shadowBlur = 10;
  ctx.shadowColor = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.stroke();
  ctx.restore();
}

export function drawCircle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
): void {
  ctx.save();
  ctx.shadowBlur = 8;
  ctx.shadowColor = color;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
