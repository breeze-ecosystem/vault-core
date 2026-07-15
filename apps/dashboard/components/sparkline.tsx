interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
  className?: string;
}

export function Sparkline({
  data,
  color,
  height = 32,
  className,
}: SparklineProps) {
  if (!data || data.length < 2) return null;

  const strokeColor = color || "hsl(var(--shadcn-primary))";
  const width = data.length * 10;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data
    .map((val, i) => {
      const x = i * 10 + 5;
      const y = height - ((val - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  if (data.length < 2) return null;

  const step = 10;
  const polyPoints = data.map((val, i) => ({
    x: i * step + 5,
    y: height - ((val - min) / range) * (height - 4) - 2,
  }));

  let gradientPath = "";
  if (polyPoints.length >= 2) {
    const first = polyPoints[0]!;
    const last = polyPoints[polyPoints.length - 1]!;
    const curvePoints = polyPoints.slice(1).map((p, i) => {
      const prev = polyPoints[i]!;
      return `C${prev.x + (p.x - prev.x) * 0.4},${prev.y} ${prev.x + (p.x - prev.x) * 0.6},${p.y} ${p.x},${p.y}`;
    }).join(" ");
    gradientPath = `M${first.x},${first.y} ${curvePoints} L${last.x},${height} L5,${height} Z`;
  }

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="sparkline-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity={0.2} />
          <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
        </linearGradient>
      </defs>
      {gradientPath && (
        <path
          d={gradientPath}
          fill="url(#sparkline-fill)"
        />
      )}
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}
