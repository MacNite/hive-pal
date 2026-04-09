export const QUEEN_STATUS_VARIANTS: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  ACTIVE: 'default',
  REPLACED: 'secondary',
  DEAD: 'destructive',
  UNKNOWN: 'outline',
};

export const QUEEN_COLOR_CLASSES: Record<string, string> = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  red: 'bg-red-500',
  yellow: 'bg-yellow-500',
  purple: 'bg-purple-500',
  indigo: 'bg-indigo-500',
  pink: 'bg-pink-500',
  gray: 'bg-gray-500',
  black: 'bg-black',
  white: 'bg-white border border-gray-200',
};

export const getQueenColorClass = (
  color: string | null | undefined,
  fallback = 'bg-gray-200',
): string => {
  if (!color) return fallback;
  return QUEEN_COLOR_CLASSES[color.toLowerCase()] ?? fallback;
};

export const getQueenDisplayName = (
  name: string | null | undefined,
  marking: string | null | undefined,
  year: number | null | undefined,
): string => name || marking || `Queen ${year ?? '—'}`;
