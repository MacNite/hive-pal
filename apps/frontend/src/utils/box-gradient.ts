export function buildBoxGradient(
  boxes?: { position: number; color?: string }[],
): string {
  if (!boxes || boxes.length === 0) {
    return 'linear-gradient(to bottom, hsl(var(--muted)), hsl(var(--muted)))';
  }
  // Sort descending by position so highest position (top box) is first in the gradient
  const sorted = [...boxes].sort((a, b) => b.position - a.position);
  const colors = sorted.map(b => b.color).filter((c): c is string => !!c);
  if (colors.length === 0) {
    return 'linear-gradient(to bottom, hsl(var(--muted)), hsl(var(--muted)))';
  }
  if (colors.length === 1) {
    return colors[0];
  }
  // Hard stops — each color occupies an equal band with no blending
  const step = 100 / colors.length;
  const stops = colors.flatMap((color, i) => [
    `${color} ${(i * step).toFixed(1)}%`,
    `${color} ${((i + 1) * step).toFixed(1)}%`,
  ]);
  return `linear-gradient(to bottom, ${stops.join(', ')})`;
}
