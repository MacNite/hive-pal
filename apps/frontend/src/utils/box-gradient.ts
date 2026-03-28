export function buildBoxGradient(
  boxes?: { position: number; color?: string }[],
): string {
  if (!boxes || boxes.length === 0) {
    return 'linear-gradient(to bottom, hsl(var(--muted)), hsl(var(--muted) / 0.5))';
  }
  const sorted = [...boxes].sort((a, b) => a.position - b.position);
  const colors = sorted.map(b => b.color).filter((c): c is string => !!c);
  if (colors.length === 0) {
    return 'linear-gradient(to bottom, hsl(var(--muted)), hsl(var(--muted) / 0.5))';
  }
  if (colors.length === 1) {
    return colors[0];
  }
  // Each box gets a defined band with a short blend zone between them
  const step = 100 / colors.length;
  const blend = 5; // percentage of blend between colors
  const stops = colors.flatMap((color, i) => [
    `${color} ${Math.max(0, i * step + blend).toFixed(1)}%`,
    `${color} ${Math.min(100, (i + 1) * step - blend).toFixed(1)}%`,
  ]);
  return `linear-gradient(to bottom, ${stops.join(', ')})`;
}
