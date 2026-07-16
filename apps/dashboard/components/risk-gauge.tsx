"use client";

import { cn } from "@/lib/utils";

interface RiskGaugeProps {
  score: number;
  zoneName: string;
  previousScore?: number;
  size?: number;
  className?: string;
}

function getGaugeColor(score: number): string {
  if (score >= 85) return "hsl(var(--shadcn-destructive))";
  if (score >= 67) return "hsl(var(--shadcn-primary))";
  if (score >= 34) return "hsl(var(--shadcn-warning))";
  return "hsl(var(--shadcn-success))";
}

function getScoreLabel(score: number): string {
  if (score >= 85) return "Critique";
  if (score >= 67) return "Élevé";
  if (score >= 34) return "Modéré";
  return "Faible";
}

export function RiskGauge({
  score,
  zoneName,
  previousScore,
  size = 200,
  className,
}: RiskGaugeProps) {
  const clampedScore = Math.min(100, Math.max(0, score));
  // 270° arc from 135° (bottom-left) to 405° equivalent (bottom-right)
  const startAngle = 135;
  const endAngle = 405;
  const range = endAngle - startAngle; // 270°
  const needleAngle = startAngle + (clampedScore / 100) * range;

  const centerX = size / 2;
  const centerY = size * 0.55;
  const radius = size * 0.36;

  // Convert angle to radians, then to SVG coordinates
  function polarToCartesian(
    cx: number,
    cy: number,
    r: number,
    angleInDegrees: number
  ) {
    const angleInRadians = ((angleInDegrees - 180) * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(angleInRadians),
      y: cy + r * Math.sin(angleInRadians),
    };
  }

  function describeArc(
    cx: number,
    cy: number,
    r: number,
    startDeg: number,
    endDeg: number
  ) {
    const start = polarToCartesian(cx, cy, r, endDeg);
    const end = polarToCartesian(cx, cy, r, startDeg);
    const largeArcFlag = endDeg - startDeg <= 180 ? "0" : "1";
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
  }

  // Background arc (full 270°)
  const bgPath = describeArc(centerX, centerY, radius, startAngle, endAngle);

  // Color segments
  const greenPath = describeArc(centerX, centerY, radius, startAngle, startAngle + (33 / 100) * range);
  const amberPath = describeArc(centerX, centerY, radius, startAngle + (33 / 100) * range, startAngle + (66 / 100) * range);
  const cyanPath = describeArc(centerX, centerY, radius, startAngle + (66 / 100) * range, startAngle + (84 / 100) * range);
  const redPath = describeArc(centerX, centerY, radius, startAngle + (84 / 100) * range, endAngle);

  // Value arc (filled up to score)
  const valueEndAngle = startAngle + (clampedScore / 100) * range;
  const valuePath = describeArc(centerX, centerY, radius, startAngle, valueEndAngle);

  // Needle tip
  const needleEnd = polarToCartesian(centerX, centerY, radius * 0.82, needleAngle);

  const scoreColor = getGaugeColor(clampedScore);
  const scoreLabel = getScoreLabel(clampedScore);
  const trendArrow = previousScore != null
    ? clampedScore > previousScore
      ? "↑"
      : clampedScore < previousScore
        ? "↓"
        : "→"
    : null;

  return (
    <div
      className={cn(
        "relative flex flex-col items-center rounded-2xl bg-card/60 backdrop-blur-sm border border-border/40 p-6",
        className
      )}
    >
      <svg
        width={size}
        height={size * 0.65}
        viewBox={`0 0 ${size} ${size * 0.65}`}
        className="overflow-visible"
      >
        {/* Background arc */}
        <path
          d={bgPath}
          fill="none"
          stroke="hsl(var(--shadcn-secondary))"
          strokeWidth={size * 0.1}
          strokeLinecap="round"
        />

        {/* Color segments */}
        <path d={greenPath} fill="none" stroke="hsl(var(--shadcn-success))" strokeWidth={size * 0.1} strokeLinecap="butt" />
        <path d={amberPath} fill="none" stroke="hsl(var(--shadcn-warning))" strokeWidth={size * 0.1} strokeLinecap="butt" />
        <path d={cyanPath} fill="none" stroke="hsl(var(--shadcn-primary))" strokeWidth={size * 0.1} strokeLinecap="butt" />
        <path d={redPath} fill="none" stroke="hsl(var(--shadcn-destructive))" strokeWidth={size * 0.1} strokeLinecap="butt" />

        {/* Value fill arc */}
        {clampedScore > 0 && (
          <path
            d={valuePath}
            fill="none"
            stroke={scoreColor}
            strokeWidth={size * 0.08}
            strokeLinecap="round"
            style={{
              filter: `drop-shadow(0 0 ${size * 0.02}px ${scoreColor})`,
            }}
          />
        )}

        {/* Needle */}
        <line
          x1={centerX}
          y1={centerY}
          x2={needleEnd.x}
          y2={needleEnd.y}
          stroke="hsl(var(--shadcn-foreground))"
          strokeWidth={2}
          strokeLinecap="round"
        />
        <circle
          cx={centerX}
          cy={centerY}
          r={size * 0.03}
          fill="hsl(var(--shadcn-foreground))"
        />
      </svg>

      {/* Score display */}
      <div className="flex flex-col items-center -mt-6">
        <div className="flex items-center gap-2">
          <span
            className="font-mono tabular-nums text-3xl font-semibold tracking-tight"
            style={{ color: scoreColor }}
          >
            {clampedScore}
          </span>
          {trendArrow && (
            <span
              className={cn(
                "text-lg font-semibold",
                clampedScore > (previousScore ?? 0)
                  ? "text-destructive"
                  : "text-success"
              )}
            >
              {trendArrow}
            </span>
          )}
        </div>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
          {scoreLabel}
        </span>
        <span className="text-xs text-muted-foreground mt-1">{zoneName}</span>
      </div>
    </div>
  );
}
