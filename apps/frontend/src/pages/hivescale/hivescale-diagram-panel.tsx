import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  Activity,
  Battery,
  ClipboardCheck,
  Download,
  Droplets,
  Frame,
  Gauge,
  Scale,
  PackagePlus,
  Pill,
  Sun,
  Thermometer,
  Utensils,
  Waves,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ActionType,
  type HiveWithBoxesResponse,
  type InspectionResponse,
} from 'shared-schemas';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { BeeLoadingMessages } from './hivescale-loading-messages';
import {
  getHiveReadings,
  hiveHumidityPercent,
  hiveWeightKg,
  type HiveScaleHiveSlot,
} from './hive-readings';
import type {
  HiveScaleDevice,
  HiveScaleMeasurement,
} from '@/api/hooks/useHiveScale';

export type HiveScaleDateRangePreset =
  | '24h'
  | '7d'
  | '30d'
  | '365d'
  | 'currentYear'
  | 'all'
  | 'custom';

export interface HiveScaleDateRange {
  preset: HiveScaleDateRangePreset;
  startAt?: string;
  endAt?: string;
}

type SeriesAxis =
  | 'weight'
  | 'temperature'
  | 'humidity'
  | 'pressure'
  | 'voltage'
  | 'percent'
  | 'current'
  | 'power'
  | 'dbfs'
  | 'beecount'
  | 'vibration';

// Series keys are generated at runtime so the diagram can scale to any number
// of hives. Per-hive keys take the form `hive:<index>:<metric>`; device-level
// series (mic, ambient, off-grid) keep stable string keys.
type SeriesKey = string;

// The set of metrics every hive exposes. Mirrors the per-hive `hive_readings`
// shape from the backend (weight / temp / humidity / pressure plus the
// accelerometer and bee-counter blocks). The stereo microphone is intentionally
// NOT here — it is a single device-level sensor, modelled as two fixed series.
type HiveMetric =
  | 'weight'
  | 'temp'
  | 'humidity'
  | 'pressure'
  | 'vibration'
  | 'swarmBand'
  | 'fanningBand'
  | 'activityBand'
  | 'beesIn'
  | 'beesOut'
  | 'netFlow';

interface DiagramSeries {
  key: SeriesKey;
  label: string;
  dataKey: string;
  axis: SeriesAxis;
  unit: string;
  stroke: string;
  // Display grouping: the hive name (or the ambient / off-grid group label) the
  // series sits under in the toggle list.
  group: string;
  subgroup: string;
  // Set for per-hive series so the toggle list can be filtered by selected hive.
  hiveIndex?: number;
  // Whether the series should be on by default the first time a hive appears.
  defaultVisible: boolean;
}

interface ChartMarker {
  id: string;
  timestamp: number;
  date: string;
  type:
    | 'inspection'
    | 'maintenance'
    | 'feeding'
    | 'frames'
    | 'treatment'
    | 'box';
  label: string;
  detail: string;
  hiveName: string;
  Icon: LucideIcon;
}

type AxisScaleMode = 'maxRange' | 'zeroToMax' | 'custom';
type AxisDomain = [number, number];

type VisibleSeriesMap = Record<SeriesKey, boolean>;

interface AxisScaleSettings {
  scaleMode: AxisScaleMode;
  customMin: string;
  customMax: string;
  side: 'left' | 'right';
}

type AxisScaleSettingsMap = Record<SeriesAxis, AxisScaleSettings>;

interface StoredDiagramSettings {
  version: 7;
  // Which hive indices are shown in the chart and toggle list. Empty means
  // "fall back to the first couple of hives the device reports".
  selectedHiveIndices: number[];
  visibleSeries: VisibleSeriesMap;
  axes: AxisScaleSettingsMap;
}

const diagramSettingsStoragePrefix = 'hivepal:hivescale-diagram:';

// Metrics shown by default the first time a hive is added to the chart. Other
// per-hive metrics and all device-level series start hidden.
const DEFAULT_VISIBLE_METRICS = new Set<HiveMetric>(['weight', 'temp']);

const defaultAxisSettings: AxisScaleSettings = {
  scaleMode: 'maxRange',
  customMin: '',
  customMax: '',
  side: 'left',
};

const getDefaultDiagramSettings = (): StoredDiagramSettings => ({
  version: 7,
  selectedHiveIndices: [],
  visibleSeries: {},
  axes: {
    weight: { ...defaultAxisSettings, side: 'left' },
    temperature: { ...defaultAxisSettings, side: 'right' },
    humidity: { ...defaultAxisSettings, side: 'right' },
    pressure: { ...defaultAxisSettings, side: 'right' },
    voltage: { ...defaultAxisSettings, side: 'right' },
    percent: { ...defaultAxisSettings, side: 'right' },
    current: { ...defaultAxisSettings, side: 'right' },
    power: { ...defaultAxisSettings, side: 'right' },
    dbfs: { ...defaultAxisSettings, side: 'right' },
    beecount: { ...defaultAxisSettings, scaleMode: 'zeroToMax', side: 'right' },
    vibration: {
      ...defaultAxisSettings,
      scaleMode: 'zeroToMax',
      side: 'right',
    },
  },
});

const presetButtonLabel = (
  preset: HiveScaleDateRangePreset,
  t: TFunction,
): string => {
  if (preset === 'currentYear') return new Date().getFullYear().toString();
  if (preset === 'all') return t('diagram.range.all');
  return preset;
};

const axisOrder: SeriesAxis[] = [
  'weight',
  'temperature',
  'humidity',
  'pressure',
  'voltage',
  'percent',
  'current',
  'power',
  'dbfs',
  'beecount',
  'vibration',
];

const axisPresentation: Record<
  SeriesAxis,
  { labelKey: string; unit: string; Icon: LucideIcon }
> = {
  weight: { labelKey: 'diagram.axis.weight', unit: 'kg', Icon: Scale },
  temperature: {
    labelKey: 'diagram.axis.temperature',
    unit: '°C',
    Icon: Thermometer,
  },
  humidity: { labelKey: 'diagram.axis.humidity', unit: '%', Icon: Droplets },
  pressure: { labelKey: 'diagram.axis.pressure', unit: 'hPa', Icon: Gauge },
  voltage: { labelKey: 'diagram.axis.voltage', unit: 'V', Icon: Battery },
  percent: { labelKey: 'diagram.axis.percent', unit: '%', Icon: Battery },
  current: { labelKey: 'diagram.axis.current', unit: 'mA', Icon: Zap },
  power: { labelKey: 'diagram.axis.power', unit: 'mW', Icon: Sun },
  dbfs: { labelKey: 'diagram.axis.sound', unit: 'dBFS', Icon: Activity },
  beecount: { labelKey: 'diagram.axis.beecount', unit: 'bees', Icon: Activity },
  vibration: { labelKey: 'diagram.axis.vibration', unit: 'mg', Icon: Waves },
};

type GroupedSeriesTuple = readonly [
  key: SeriesKey,
  labelKey: string,
  axis: SeriesAxis,
  unit: string,
  stroke: string,
  groupKey: string,
];

// Every hive exposes the same set of metrics — identical labels, axes and
// units. The series for each hive are generated from this list at runtime, so
// the chart scales from 1 to 18 hives without per-scale boilerplate.
const hiveMetricDefs: {
  metric: HiveMetric;
  labelKey: string;
  axis: SeriesAxis;
  unit: string;
}[] = [
  { metric: 'weight', labelKey: 'diagram.series.weight', axis: 'weight', unit: 'kg' },
  { metric: 'temp', labelKey: 'diagram.series.temp', axis: 'temperature', unit: '°C' },
  { metric: 'humidity', labelKey: 'diagram.series.humidity', axis: 'humidity', unit: '%' },
  { metric: 'pressure', labelKey: 'diagram.series.pressure', axis: 'pressure', unit: 'hPa' },
  { metric: 'vibration', labelKey: 'diagram.series.vibration', axis: 'vibration', unit: 'mg' },
  { metric: 'swarmBand', labelKey: 'diagram.series.swarmBand', axis: 'vibration', unit: 'mg' },
  { metric: 'fanningBand', labelKey: 'diagram.series.fanningBand', axis: 'vibration', unit: 'mg' },
  { metric: 'activityBand', labelKey: 'diagram.series.activityBand', axis: 'vibration', unit: 'mg' },
  { metric: 'beesIn', labelKey: 'diagram.series.beesIn', axis: 'beecount', unit: 'bees' },
  { metric: 'beesOut', labelKey: 'diagram.series.beesOut', axis: 'beecount', unit: 'bees' },
  { metric: 'netFlow', labelKey: 'diagram.series.netFlow', axis: 'beecount', unit: 'bees' },
];

const HIVE_PALETTE = [
  'var(--primary)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-1)',
  'var(--muted-foreground)',
  'var(--destructive)',
];

export const hiveSeriesKey = (index: number, metric: HiveMetric): SeriesKey =>
  `hive:${index}:${metric}`;

// Spread colours across both hive index and metric so two hives' weight lines
// (or one hive's weight vs temperature) don't collide. Uniqueness isn't
// guaranteed across 18 hives × 11 metrics, but the hive selector keeps only a
// handful visible at once and the legend labels disambiguate the rest.
const hiveStroke = (index: number, metricOffset: number): string =>
  HIVE_PALETTE[(index - 1 + metricOffset) % HIVE_PALETTE.length];

const buildHiveSeries = (
  slot: HiveScaleHiveSlot,
  t: TFunction,
): DiagramSeries[] =>
  hiveMetricDefs.map((def, offset) => ({
    key: hiveSeriesKey(slot.index, def.metric),
    label: t(def.labelKey, { name: slot.name }),
    dataKey: hiveSeriesKey(slot.index, def.metric),
    axis: def.axis,
    unit: def.unit,
    stroke: hiveStroke(slot.index, offset),
    group: slot.name,
    subgroup: slot.name,
    hiveIndex: slot.index,
    defaultVisible: DEFAULT_VISIBLE_METRICS.has(def.metric),
  }));

// The stereo microphone is a single device-level sensor (left / right), not a
// per-hive one. Map the two channels to the first two hive names for context.
const buildMicSeries = (
  leftName: string,
  rightName: string,
  t: TFunction,
): DiagramSeries[] => {
  const group = t('diagram.axis.sound');
  return [
    {
      key: 'micLeftRms',
      label: t('diagram.series.micRms', { name: leftName }),
      dataKey: 'micLeftRms',
      axis: 'dbfs',
      unit: 'dBFS',
      stroke: 'var(--chart-1)',
      group,
      subgroup: group,
      defaultVisible: false,
    },
    {
      key: 'micRightRms',
      label: t('diagram.series.micRms', { name: rightName }),
      dataKey: 'micRightRms',
      axis: 'dbfs',
      unit: 'dBFS',
      stroke: 'var(--chart-2)',
      group,
      subgroup: group,
      defaultVisible: false,
    },
  ];
};

const ambientAndOffGridSeriesTuples: GroupedSeriesTuple[] = [
  [
    'ambientTemperature',
    'diagram.series.ambientTemp',
    'temperature',
    '°C',
    'var(--chart-5)',
    'diagram.group.ambient',
  ],
  [
    'ambientHumidity',
    'diagram.series.ambientHumidity',
    'humidity',
    '%',
    'var(--chart-3)',
    'diagram.group.ambient',
  ],
  [
    'batteryVoltage',
    'diagram.series.batteryVoltage',
    'voltage',
    'V',
    'var(--destructive)',
    'diagram.group.offGrid',
  ],
  [
    'batterySoc',
    'diagram.series.batteryCharge',
    'percent',
    '%',
    'var(--chart-1)',
    'diagram.group.offGrid',
  ],
  [
    'solarLoadVoltage',
    'diagram.series.solarVoltage',
    'voltage',
    'V',
    'var(--chart-2)',
    'diagram.group.offGrid',
  ],
  [
    'solarCurrent',
    'diagram.series.solarCurrent',
    'current',
    'mA',
    'var(--chart-3)',
    'diagram.group.offGrid',
  ],
  [
    'solarPower',
    'diagram.series.solarPower',
    'power',
    'mW',
    'var(--chart-4)',
    'diagram.group.offGrid',
  ],
];

const toGroupedSeries = (
  tuples: GroupedSeriesTuple[],
  t: TFunction,
): DiagramSeries[] =>
  tuples.map(([key, labelKey, axis, unit, stroke, groupKey]) => {
    const group = t(groupKey);
    return {
      key,
      label: t(labelKey),
      dataKey: key,
      axis,
      unit,
      stroke,
      group,
      subgroup: group,
      defaultVisible: false,
    };
  });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatChartTick = (value: number) =>
  new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));

const formatDateTime = (value: number) =>
  new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));

const formatRelativeTime = (value: string | null | undefined): string => {
  if (!value) return '—';
  const ts = new Date(value).getTime();
  if (!Number.isFinite(ts)) return '—';
  const diffMs = Date.now() - ts;
  const absSec = Math.abs(diffMs) / 1000;
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 60 * 60 * 24 * 365],
    ['month', 60 * 60 * 24 * 30],
    ['day', 60 * 60 * 24],
    ['hour', 60 * 60],
    ['minute', 60],
    ['second', 1],
  ];
  for (const [unit, secondsInUnit] of units) {
    if (absSec >= secondsInUnit || unit === 'second') {
      const valueInUnit = Math.round(-diffMs / 1000 / secondsInUnit);
      return rtf.format(valueInUnit, unit);
    }
  }
  return '—';
};

const escapeCsvField = (str: string): string => {
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const toFiniteNumber = (value: unknown): number | null => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const cleanTemperature = (value: unknown): number | null => {
  const n = toFiniteNumber(value);
  if (n === null) return null;
  // Filter out sentinel values (e.g. 85°C from disconnected DS18B20 sensors)
  if (n >= 84.5 && n <= 85.5) return null;
  return n;
};

// Single-pass finite min/max. Deliberately avoids `Math.min(...arr)` /
// `Math.max(...arr)`: spreading a large array as function arguments throws
// `RangeError: Maximum call stack size exceeded` once it exceeds the engine's
// argument limit (~65k in V8). A long date range (capped at MAX_MEASUREMENT_POINTS
// = 20000) across several series on one axis easily clears that, so the spread
// form could crash the whole chart.
const finiteMinMax = (
  values: unknown[],
): { min: number; max: number } | null => {
  let min = Infinity;
  let max = -Infinity;
  let found = false;
  for (const v of values) {
    if (typeof v === 'number' && Number.isFinite(v)) {
      found = true;
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  return found ? { min, max } : null;
};

const getAxisDomain = (
  settings: AxisScaleSettings,
  values: unknown[],
): AxisDomain | undefined => {
  // 'maxRange' lets Recharts derive the domain itself, so there is no need to
  // scan the values at all — skip the work (and any chance of a large-array
  // crash) for the default mode.
  if (settings.scaleMode !== 'zeroToMax' && settings.scaleMode !== 'custom') {
    return undefined;
  }

  const bounds = finiteMinMax(values);
  if (!bounds) return undefined;
  const { min, max } = bounds;

  switch (settings.scaleMode) {
    case 'zeroToMax':
      return [0, max];
    case 'custom': {
      const customMin = Number.parseFloat(settings.customMin);
      const customMax = Number.parseFloat(settings.customMax);
      if (Number.isFinite(customMin) && Number.isFinite(customMax)) {
        return [customMin, customMax];
      }
      if (Number.isFinite(customMin)) return [customMin, max];
      if (Number.isFinite(customMax)) return [min, customMax];
      return undefined;
    }
    default:
      return undefined;
  }
};

const shouldAllowAxisDataOverflow = (settings: AxisScaleSettings) =>
  settings.scaleMode === 'custom';

// The upstream measurement API returns raw samples (no server-side
// downsampling) and simply caps the result to the most recent `limit` rows.
// Devices report roughly every 5 minutes, so the limit has to cover the entire
// requested window at that cadence — otherwise long ranges silently truncate to
// only the newest samples (e.g. a 7d window would show ~2 days). We size the
// limit from the window length and apply a guardrail cap so very long ranges
// don't overwhelm the chart/payload.
const MEASUREMENT_SAMPLES_PER_DAY = (24 * 60) / 5; // ~5-min cadence => 288/day
const MAX_MEASUREMENT_POINTS = 20000;

const measurementLimitForDays = (days: number): number =>
  Math.min(
    MAX_MEASUREMENT_POINTS,
    Math.max(1, Math.ceil(days * MEASUREMENT_SAMPLES_PER_DAY)),
  );

export const measurementLimitForRange = (range: HiveScaleDateRange): number => {
  switch (range.preset) {
    case '24h':
      return measurementLimitForDays(1);
    case '7d':
      return measurementLimitForDays(7);
    case '30d':
      return measurementLimitForDays(30);
    case '365d':
    case 'currentYear':
      return MAX_MEASUREMENT_POINTS;
    case 'custom': {
      if (range.startAt) {
        const startMs = new Date(range.startAt).getTime();
        const endMs = range.endAt
          ? new Date(range.endAt).getTime()
          : Date.now();
        const days = (endMs - startMs) / (24 * 60 * 60 * 1000);
        if (Number.isFinite(days) && days > 0) {
          return measurementLimitForDays(days);
        }
      }
      return MAX_MEASUREMENT_POINTS;
    }
    case 'all':
    default:
      return MAX_MEASUREMENT_POINTS;
  }
};

export const createPresetDateRange = (
  preset: HiveScaleDateRangePreset,
): HiveScaleDateRange => {
  const now = new Date();
  switch (preset) {
    case '24h':
      return {
        preset,
        startAt: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      };
    case '7d':
      return {
        preset,
        startAt: new Date(
          now.getTime() - 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      };
    case '30d':
      return {
        preset,
        startAt: new Date(
          now.getTime() - 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      };
    case '365d':
      return {
        preset,
        startAt: new Date(
          now.getTime() - 365 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      };
    case 'currentYear': {
      const start = new Date(now.getFullYear(), 0, 1);
      return { preset, startAt: start.toISOString() };
    }
    case 'all':
      return { preset };
    case 'custom':
      return { preset };
    default:
      return {
        preset: '7d',
        startAt: new Date(
          now.getTime() - 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      };
  }
};

// Series keys are dynamic now, so we can't validate them against a fixed map —
// just keep any boolean-valued entries. Unknown keys are harmless; series
// without a stored entry fall back to their `defaultVisible`.
const mergeVisibleSeries = (value: unknown): VisibleSeriesMap =>
  value && typeof value === 'object'
    ? Object.fromEntries(
        Object.entries(value as Record<string, unknown>).filter(
          ([, v]) => typeof v === 'boolean',
        ),
      )
    : {};

const mergeSelectedHiveIndices = (value: unknown): number[] =>
  Array.isArray(value)
    ? value.filter((v): v is number => typeof v === 'number')
    : [];

const mergeAxisSettings = (value: unknown): AxisScaleSettingsMap => {
  const defaults = getDefaultDiagramSettings().axes;
  if (!value || typeof value !== 'object') return defaults;
  const patch = value as Record<string, unknown>;
  return Object.fromEntries(
    axisOrder.map(axis => [
      axis,
      {
        ...defaults[axis],
        ...(patch[axis] && typeof patch[axis] === 'object' ? patch[axis] : {}),
      },
    ]),
  ) as AxisScaleSettingsMap;
};

const loadDiagramSettings = (deviceId: string): StoredDiagramSettings => {
  try {
    const raw = localStorage.getItem(
      `${diagramSettingsStoragePrefix}${deviceId}`,
    );
    if (!raw) return getDefaultDiagramSettings();
    const parsed = JSON.parse(raw) as Partial<StoredDiagramSettings>;
    // version 7 moves to dynamic per-hive series + a hive selector — reset if older
    if (parsed.version !== 7) return getDefaultDiagramSettings();
    return {
      version: 7,
      selectedHiveIndices: mergeSelectedHiveIndices(parsed.selectedHiveIndices),
      visibleSeries: mergeVisibleSeries(parsed.visibleSeries),
      axes: mergeAxisSettings(parsed.axes),
    };
  } catch {
    return getDefaultDiagramSettings();
  }
};

const saveDiagramSettings = (
  deviceId: string,
  settings: StoredDiagramSettings,
) => {
  try {
    localStorage.setItem(
      `${diagramSettingsStoragePrefix}${deviceId}`,
      JSON.stringify(settings),
    );
  } catch {
    // localStorage unavailable; silently ignore
  }
};

// ---------------------------------------------------------------------------
// Inspection / box markers
// ---------------------------------------------------------------------------

const ACTION_MARKER_MAP: Partial<Record<ActionType, ChartMarker['type']>> = {
  [ActionType.MAINTENANCE]: 'maintenance',
  [ActionType.FEEDING]: 'feeding',
  [ActionType.FRAME]: 'frames',
  [ActionType.TREATMENT]: 'treatment',
};

const ACTION_ICON_MAP: Partial<Record<ActionType, LucideIcon>> = {
  [ActionType.MAINTENANCE]: Wrench,
  [ActionType.FEEDING]: Utensils,
  [ActionType.FRAME]: Frame,
  [ActionType.TREATMENT]: Pill,
};

const normalizeName = (name: string | null | undefined) =>
  (name ?? '').trim().toLowerCase();

const buildInspectionMarkers = (
  inspections: InspectionResponse[] | undefined,
  hives: HiveWithBoxesResponse[],
  mappedHiveIds: string[],
  t: TFunction,
): ChartMarker[] => {
  if (!inspections) return [];
  return inspections
    .filter(ins => mappedHiveIds.includes(ins.hiveId))
    .flatMap(ins => {
      const hive = hives.find(h => h.id === ins.hiveId);
      const hiveName = hive?.name ?? ins.hiveId;
      const base: ChartMarker = {
        id: `ins-${ins.id}`,
        timestamp: new Date(ins.date).getTime(),
        date: ins.date,
        type: 'inspection',
        label: t('diagram.marker.inspection'),
        detail: '',
        hiveName,
        Icon: ClipboardCheck,
      };
      const actionMarkers: ChartMarker[] = (ins.actions ?? [])
        .filter(a => ACTION_MARKER_MAP[a.type])
        .map(a => {
          const actionType = a.type as string;
          const markerType = ACTION_MARKER_MAP[a.type]!;
          return {
            id: `act-${ins.id}-${actionType}`,
            timestamp: new Date(ins.date).getTime(),
            date: ins.date,
            type: markerType,
            label: t(`diagram.marker.action.${markerType}`),
            detail: '',
            hiveName,
            Icon: ACTION_ICON_MAP[a.type] ?? Wrench,
          };
        });
      return [base, ...actionMarkers];
    });
};

const buildBoxAddedMarkers = (
  hives: HiveWithBoxesResponse[],
  mappedHiveIds: string[],
  t: TFunction,
  startAt?: string,
  endAt?: string,
): ChartMarker[] => {
  const startMs = startAt ? new Date(startAt).getTime() : 0;
  const endMs = endAt ? new Date(endAt).getTime() : Infinity;
  return hives
    .filter(h => mappedHiveIds.includes(h.id))
    .flatMap(h =>
      (h.boxes ?? [])
        .filter(box => {
          if (!box.addedAt) return false;
          const ts = new Date(box.addedAt).getTime();
          return ts >= startMs && ts <= endMs;
        })
        .map(box => ({
          id: `box-${h.id}-${box.id}`,
          timestamp: new Date(box.addedAt ?? 0).getTime(),
          date: box.addedAt ? new Date(box.addedAt).toISOString() : '',
          type: 'box' as const,
          label: t('diagram.marker.boxAdded'),
          detail: box.type ?? '',
          hiveName: h.name,
          Icon: PackagePlus,
        })),
    );
};

// ---------------------------------------------------------------------------
// Marker reference line
// ---------------------------------------------------------------------------

interface MarkerLabelProps {
  // Recharts passes a `viewBox` to label render functions.
  viewBox?: { x?: number; y?: number };
}

// Vertical spacing between icons that share the same timestamp, so multiple
// markers (e.g. an inspection plus its actions) stack instead of overlapping.
const MARKER_STACK_SPACING = 16;

const renderMarkerLabel = (
  marker: ChartMarker,
  stackIndex: number,
  onEnter: (marker: ChartMarker, e: MouseEvent<SVGElement>) => void,
  onLeave: () => void,
  props: MarkerLabelProps,
) => {
  const Icon = marker.Icon;
  return (
    <g
      transform={`translate(${props.viewBox?.x ?? 0},${
        (props.viewBox?.y ?? 0) - 20 + stackIndex * MARKER_STACK_SPACING
      })`}
      onMouseEnter={e => onEnter(marker, e)}
      onMouseLeave={onLeave}
      style={{ cursor: 'default' }}
    >
      <Icon size={14} x={-7} y={-7} color="var(--muted-foreground)" />
    </g>
  );
};

// NOTE: This must be a plain function that returns a <ReferenceLine> element,
// NOT a React component rendered as <MarkerReferenceLine />. Recharts discovers
// reference lines by walking its children and matching them against the
// ReferenceLine type so it can inject the axis scale maps. A custom wrapper
// component's element type is the wrapper, not ReferenceLine, so recharts never
// finds it and the marker (and its icon label) is silently dropped.
const renderMarkerReferenceLine = ({
  marker,
  stackIndex,
  yAxisId,
  onEnter,
  onLeave,
}: {
  marker: ChartMarker;
  stackIndex: number;
  yAxisId: SeriesAxis;
  onEnter: (marker: ChartMarker, e: MouseEvent<SVGElement>) => void;
  onLeave: () => void;
}) => (
  <ReferenceLine
    key={marker.id}
    x={marker.timestamp}
    yAxisId={yAxisId}
    stroke="var(--border)"
    strokeDasharray="4 2"
    label={(props: MarkerLabelProps) =>
      renderMarkerLabel(marker, stackIndex, onEnter, onLeave, props)
    }
  />
);

// ---------------------------------------------------------------------------
// Component props
// ---------------------------------------------------------------------------

// A single row of charted values. Per-hive metrics live under their generated
// `hive:<index>:<metric>` keys, so the row carries a string index signature
// alongside the fixed timestamp / measuredAt fields.
interface ChartRow {
  timestamp: number;
  measuredAt: string;
  [key: string]: number | string | null;
}

interface HiveScaleDiagramPanelProps {
  selectedDevice: HiveScaleDevice;
  measurements: HiveScaleMeasurement[] | undefined;
  isLoading: boolean;
  dateRange: HiveScaleDateRange;
  onDateRangeChange: (range: HiveScaleDateRange) => void;
  // Every hive this device exposes (index + display name), index-ascending.
  hiveSlots: HiveScaleHiveSlot[];
  hives?: HiveWithBoxesResponse[];
  inspections?: InspectionResponse[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const HiveScaleDiagramPanel = ({
  selectedDevice,
  measurements,
  isLoading,
  dateRange,
  onDateRangeChange,
  hiveSlots,
  hives,
  inspections,
}: HiveScaleDiagramPanelProps) => {
  const { t } = useTranslation('hivescale');
  const [diagramSettings, setDiagramSettings] = useState<StoredDiagramSettings>(
    () => loadDiagramSettings(selectedDevice.device_id),
  );

  const { visibleSeries, axes: axisScaleSettings } = diagramSettings;
  const { selectedHiveIndices } = diagramSettings;

  const [hoveredMarker, setHoveredMarker] = useState<{
    marker: ChartMarker;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    saveDiagramSettings(selectedDevice.device_id, diagramSettings);
  }, [selectedDevice.device_id, diagramSettings]);

  // If device changes, reload settings
  useEffect(() => {
    setDiagramSettings(loadDiagramSettings(selectedDevice.device_id));
  }, [selectedDevice.device_id]);

  // The hives shown in the chart. An empty stored selection falls back to the
  // first couple of hives so a fresh device still renders something useful.
  const selectedSlots = useMemo(() => {
    const chosen = hiveSlots.filter(slot =>
      selectedHiveIndices.includes(slot.index),
    );
    return chosen.length > 0 ? chosen : hiveSlots.slice(0, 2);
  }, [hiveSlots, selectedHiveIndices]);

  // The two microphone channels are labelled with the first two hive names.
  const micLeftName = hiveSlots[0]?.name ?? t('sound.micLeftFallback');
  const micRightName = hiveSlots[1]?.name ?? t('sound.micRightFallback');

  const series = useMemo<DiagramSeries[]>(
    () => [
      ...selectedSlots.flatMap(slot => buildHiveSeries(slot, t)),
      ...buildMicSeries(micLeftName, micRightName, t),
      ...toGroupedSeries(ambientAndOffGridSeriesTuples, t),
    ],
    [selectedSlots, micLeftName, micRightName, t],
  );

  const activeSeries = useMemo(
    () => series.filter(item => visibleSeries[item.key] ?? item.defaultVisible),
    [series, visibleSeries],
  );
  const activeAxes = useMemo(
    () => new Set(activeSeries.map(item => item.axis)),
    [activeSeries],
  );

  const chartData = useMemo<ChartRow[]>(
    () =>
      [...(measurements ?? [])]
        .sort(
          (a, b) =>
            new Date(a.measured_at).getTime() -
            new Date(b.measured_at).getTime(),
        )
        .map(item => {
          // Device-level series (mic / ambient / off-grid) are shared across
          // hives and read straight from the measurement.
          const row: ChartRow = {
            timestamp: new Date(item.measured_at).getTime(),
            measuredAt: item.measured_at,
            ambientTemperature: cleanTemperature(item.ambient_temp_c),
            ambientHumidity: toFiniteNumber(item.ambient_humidity_percent),
            batteryVoltage: toFiniteNumber(
              item.battery_voltage_v ?? item.battery_voltage,
            ),
            batterySoc: toFiniteNumber(item.battery_soc_percent),
            solarLoadVoltage: toFiniteNumber(item.solar_load_voltage_v),
            solarCurrent: toFiniteNumber(item.solar_current_ma),
            solarPower: toFiniteNumber(item.solar_power_mw),
            micLeftRms: toFiniteNumber(item.mic_left_rms_dbfs),
            micRightRms: toFiniteNumber(item.mic_right_rms_dbfs),
          };

          // Per-hive series — generated from the normalized readings so this
          // scales from 1 to 18 hives with no per-scale branching.
          for (const reading of getHiveReadings(item)) {
            const i = reading.index;
            // A missing / not-ok sensor must show as a gap, not a misleading
            // 0 reading; zero-counts from an ok sensor are valid.
            const accelOk = reading.accel?.ok !== false;
            const bcOk = reading.bee_counter?.ok !== false;
            const bIn = toFiniteNumber(reading.bee_counter?.interval_in);
            const bOut = toFiniteNumber(reading.bee_counter?.interval_out);
            const bNet =
              bIn !== null && bOut !== null ? bIn - bOut : null;

            // weight keeps temperature compensation for hives 1–2 (see
            // hiveWeightKg); humidity prefers the promoted column.
            row[hiveSeriesKey(i, 'weight')] = toFiniteNumber(
              hiveWeightKg(item, reading),
            );
            row[hiveSeriesKey(i, 'temp')] = cleanTemperature(reading.temp_c);
            row[hiveSeriesKey(i, 'humidity')] = toFiniteNumber(
              hiveHumidityPercent(reading),
            );
            row[hiveSeriesKey(i, 'pressure')] = toFiniteNumber(
              reading.ble?.pressure_hpa,
            );
            row[hiveSeriesKey(i, 'vibration')] = accelOk
              ? toFiniteNumber(reading.accel?.rms_mg)
              : null;
            row[hiveSeriesKey(i, 'swarmBand')] = accelOk
              ? toFiniteNumber(reading.accel?.band_swarm_mg)
              : null;
            row[hiveSeriesKey(i, 'fanningBand')] = accelOk
              ? toFiniteNumber(reading.accel?.band_fanning_mg)
              : null;
            row[hiveSeriesKey(i, 'activityBand')] = accelOk
              ? toFiniteNumber(reading.accel?.band_activity_mg)
              : null;
            row[hiveSeriesKey(i, 'beesIn')] = bcOk ? bIn : null;
            row[hiveSeriesKey(i, 'beesOut')] = bcOk ? bOut : null;
            row[hiveSeriesKey(i, 'netFlow')] = bcOk ? bNet : null;
          }

          return row;
        })
        .filter(item => Number.isFinite(item.timestamp)),
    [measurements],
  );

  const visibleChartData = useMemo(() => {
    const startMs = dateRange.startAt
      ? new Date(dateRange.startAt).getTime()
      : null;
    const endMs = dateRange.endAt ? new Date(dateRange.endAt).getTime() : null;
    if (!startMs && !endMs) return chartData;
    return chartData.filter(item => {
      if (startMs && item.timestamp < startMs) return false;
      if (endMs && item.timestamp > endMs) return false;
      return true;
    });
  }, [chartData, dateRange]);

  // Which series actually carry at least one finite reading in the visible
  // window. Series without data are greyed out (and not toggleable) so the user
  // can tell at a glance which sensors this device is reporting for the range.
  const availableSeriesKeys = useMemo(() => {
    const available = new Set<SeriesKey>();
    const keys = series.map(s => s.key);
    for (const row of visibleChartData) {
      for (const key of keys) {
        if (available.has(key)) continue;
        const value = row[key as keyof typeof row];
        if (typeof value === 'number' && Number.isFinite(value)) {
          available.add(key);
        }
      }
      if (available.size === keys.length) break;
    }
    return available;
  }, [series, visibleChartData]);

  const axisDomains = useMemo(() => {
    const domains: Partial<Record<SeriesAxis, AxisDomain | undefined>> = {};
    for (const axis of axisOrder) {
      if (!activeAxes.has(axis)) continue;
      const axisSeriesKeys = activeSeries
        .filter(s => s.axis === axis)
        .map(s => s.dataKey);
      const values = visibleChartData.flatMap(d =>
        axisSeriesKeys.map(k => d[k as keyof typeof d]),
      );
      domains[axis] = getAxisDomain(axisScaleSettings[axis], values);
    }
    return domains;
  }, [activeAxes, activeSeries, axisScaleSettings, visibleChartData]);

  const mappedHives = useMemo(() => {
    const hiveList = hives ?? [];
    const names = hiveSlots.map(slot => normalizeName(slot.name)).filter(Boolean);
    return hiveList.filter(hive => names.includes(normalizeName(hive.name)));
  }, [hives, hiveSlots]);

  const markers = useMemo(() => {
    const hiveList = hives ?? [];
    const mappedHiveIds = mappedHives.map(hive => hive.id);
    const sorted = [
      ...buildInspectionMarkers(inspections, hiveList, mappedHiveIds, t),
      ...buildBoxAddedMarkers(
        hiveList,
        mappedHiveIds,
        t,
        dateRange.startAt,
        dateRange.endAt,
      ),
    ].sort((a, b) => a.timestamp - b.timestamp);
    // Markers that share a timestamp (e.g. an inspection plus its actions) would
    // otherwise draw their icons on top of each other. Assign each one a stack
    // index within its timestamp group so they can be offset vertically.
    const stackCountByTimestamp = new Map<number, number>();
    return sorted.map(marker => {
      const stackIndex = stackCountByTimestamp.get(marker.timestamp) ?? 0;
      stackCountByTimestamp.set(marker.timestamp, stackIndex + 1);
      return { marker, stackIndex };
    });
  }, [dateRange.endAt, dateRange.startAt, hives, inspections, mappedHives, t]);

  const toggleSeries = (key: SeriesKey) => {
    setDiagramSettings(current => {
      const target = series.find(item => item.key === key);
      const currentlyVisible =
        current.visibleSeries[key] ?? target?.defaultVisible ?? false;
      return {
        ...current,
        visibleSeries: { ...current.visibleSeries, [key]: !currentlyVisible },
      };
    });
  };

  // Add / remove a hive from the chart. An empty stored selection means "first
  // couple of hives", so seed from the effective selection before toggling.
  const toggleHive = (index: number) => {
    setDiagramSettings(current => {
      const effective =
        current.selectedHiveIndices.length > 0
          ? current.selectedHiveIndices
          : hiveSlots.slice(0, 2).map(slot => slot.index);
      const next = effective.includes(index)
        ? effective.filter(i => i !== index)
        : [...effective, index].sort((a, b) => a - b);
      return { ...current, selectedHiveIndices: next };
    });
  };

  const updateAxisScaleSettings = (
    axis: SeriesAxis,
    updates: Partial<AxisScaleSettings>,
  ) => {
    setDiagramSettings(current => ({
      ...current,
      axes: {
        ...current.axes,
        [axis]: { ...current.axes[axis], ...updates },
      },
    }));
  };

  const resetAxisLayout = () => {
    setDiagramSettings(getDefaultDiagramSettings());
  };

  const downloadVisibleDataCsv = () => {
    if (!visibleChartData.length || !activeSeries.length) return;

    const headers = [
      'measured_at',
      'timestamp',
      ...activeSeries.map(item => `${item.label} (${item.unit})`),
    ];
    const rows = visibleChartData.map(item => [
      item.measuredAt,
      new Date(item.timestamp).toISOString(),
      ...activeSeries.map(seriesItem => {
        const value = item[seriesItem.dataKey as keyof typeof item];
        return typeof value === 'number' && Number.isFinite(value)
          ? value.toString()
          : '';
      }),
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(escapeCsvField).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hivescale-${selectedDevice.device_id}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const hideMarkerTooltip = () => setHoveredMarker(null);

  const handleMarkerMouseEnter = (
    marker: ChartMarker,
    e: MouseEvent<SVGElement>,
  ) => {
    setHoveredMarker({ marker, x: e.clientX, y: e.clientY });
  };

  // Group series into ordered, sub-headed sections (one per selected hive, plus
  // the mic / ambient / off-grid device sections). Rendered in a responsive
  // grid that wraps, so the layout scales with the number of selected hives
  // instead of being capped at three fixed columns.
  const sections = useMemo(() => {
    const out: { subgroup: string; items: DiagramSeries[] }[] = [];
    for (const s of series) {
      let section = out[out.length - 1];
      if (!section || section.subgroup !== s.subgroup) {
        section = { subgroup: s.subgroup, items: [] };
        out.push(section);
      }
      section.items.push(s);
    }
    return out;
  }, [series]);

  // Timestamp of the most recent measurement in the loaded range, used for the
  // "last data" line in the header.
  const lastDataAt = useMemo<string | null>(() => {
    if (!measurements?.length) return null;
    let latest = -Infinity;
    for (const m of measurements) {
      const ts = new Date(m.measured_at).getTime();
      if (Number.isFinite(ts) && ts > latest) latest = ts;
    }
    return latest === -Infinity ? null : new Date(latest).toISOString();
  }, [measurements]);

  // HiveInside in-hive sensors report their running firmware over BLE; show the
  // latest non-empty value for each populated hive next to the HiveScale node
  // firmware. Searching all loaded measurements (not just the newest row) makes
  // this robust against cycles where the GATT read failed or the sensor was
  // absent — the version from an earlier row is still current and useful.
  const hiveInsideFirmware = useMemo<string[]>(() => {
    if (!measurements?.length) return [];
    const sorted = [...measurements].sort(
      (a, b) =>
        new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime(),
    );
    const newestNonEmpty = (
      key: 'ble_1_firmware_version' | 'ble_2_firmware_version',
    ): string | null => {
      for (const m of sorted) {
        const v = m[key];
        if (typeof v === 'string' && v.length > 0) return v;
      }
      return null;
    };
    return [
      newestNonEmpty('ble_1_firmware_version'),
      newestNonEmpty('ble_2_firmware_version'),
    ].filter((v): v is string => v !== null);
  }, [measurements]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle>{t('diagram.title')}</CardTitle>
            <CardDescription>{t('diagram.subtitle')}</CardDescription>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>
                <span className="font-medium text-foreground">
                  {t('diagram.meta.device')}
                </span>{' '}
                {selectedDevice.display_name ?? selectedDevice.device_id}
              </span>
              <span>
                <span className="font-medium text-foreground">
                  {t('diagram.meta.lastSeen')}
                </span>{' '}
                {formatRelativeTime(selectedDevice.last_seen_at)}
              </span>
              <span>
                <span className="font-medium text-foreground">
                  {t('diagram.meta.lastData')}
                </span>{' '}
                {formatRelativeTime(lastDataAt)}
              </span>
              <span>
                <span className="font-medium text-foreground">
                  {t('diagram.meta.firmware')}
                </span>{' '}
                {selectedDevice.last_firmware_version ?? '—'}
              </span>
              {hiveInsideFirmware.length > 0 && (
                <span>
                  <span className="font-medium text-foreground">
                    {t('diagram.meta.hiveInsideFirmware')}
                  </span>{' '}
                  {hiveInsideFirmware.join(' / ')}
                </span>
              )}
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={downloadVisibleDataCsv}
            disabled={!visibleChartData.length || !activeSeries.length}
          >
            <Download className="mr-1 h-3.5 w-3.5" />
            CSV
          </Button>
        </div>

        {/* Date range */}
        <div className="flex flex-wrap items-end gap-2 pt-2">
          <div className="flex flex-wrap gap-1">
            {(
              [
                '24h',
                '7d',
                '30d',
                '365d',
                'currentYear',
                'all',
              ] as HiveScaleDateRangePreset[]
            ).map(preset => (
              <Button
                key={preset}
                type="button"
                size="sm"
                variant={
                  dateRange.preset === preset && dateRange.preset !== 'custom'
                    ? 'default'
                    : 'outline'
                }
                onClick={() => onDateRangeChange(createPresetDateRange(preset))}
              >
                {presetButtonLabel(preset, t)}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <Label className="text-xs">{t('diagram.range.from')}</Label>
            <Input
              type="datetime-local"
              className="h-8 w-44 text-xs"
              value={dateRange.startAt?.slice(0, 16) ?? ''}
              onChange={e =>
                onDateRangeChange({
                  preset: 'custom',
                  startAt: e.target.value
                    ? new Date(e.target.value).toISOString()
                    : undefined,
                  endAt: dateRange.endAt,
                })
              }
            />
            <Label className="text-xs">{t('diagram.range.to')}</Label>
            <Input
              type="datetime-local"
              className="h-8 w-44 text-xs"
              value={dateRange.endAt?.slice(0, 16) ?? ''}
              onChange={e =>
                onDateRangeChange({
                  preset: 'custom',
                  startAt: dateRange.startAt,
                  endAt: e.target.value
                    ? new Date(e.target.value).toISOString()
                    : undefined,
                })
              }
            />
          </div>
        </div>

        {/* Hive selector — choose which hives are charted. Hidden for a single
            hive, where there is nothing to pick. */}
        {hiveSlots.length > 1 && (
          <div className="space-y-1 pt-2">
            <div className="text-xs font-medium text-muted-foreground">
              {t('diagram.hives', { defaultValue: 'Hives' })}
            </div>
            <div className="flex flex-wrap gap-1">
              {hiveSlots.map(slot => {
                const isSelected = selectedSlots.some(
                  s => s.index === slot.index,
                );
                return (
                  <Badge
                    key={slot.index}
                    variant={isSelected ? 'default' : 'outline'}
                    className="cursor-pointer select-none"
                    onClick={() => toggleHive(slot.index)}
                  >
                    {slot.name}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {/* Series toggles — one sub-headed section per selected hive plus the
            device-level groups, in a responsive grid that wraps. */}
        <div className="grid gap-4 pt-2 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map(section => (
            <div key={section.subgroup} className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">
                {section.subgroup}
              </div>
              <div className="flex flex-wrap gap-1">
                {section.items.map(s => {
                  // Only grey out once we actually have measurements loaded —
                  // while loading (empty data) every series would otherwise
                  // appear unavailable.
                  const hasData =
                    !visibleChartData.length || availableSeriesKeys.has(s.key);
                  const isActive = visibleSeries[s.key] ?? s.defaultVisible;
                  return (
                    <Badge
                      key={s.key}
                      variant={isActive ? 'default' : 'outline'}
                      aria-disabled={!hasData}
                      title={
                        hasData ? undefined : t('diagram.noDataForSeries')
                      }
                      className={cn(
                        'select-none',
                        hasData
                          ? 'cursor-pointer'
                          : 'cursor-not-allowed opacity-40',
                      )}
                      style={
                        !hasData
                          ? undefined
                          : isActive
                            ? {
                                backgroundColor: s.stroke,
                                borderColor: s.stroke,
                              }
                            : { borderColor: s.stroke, color: s.stroke }
                      }
                      onClick={hasData ? () => toggleSeries(s.key) : undefined}
                    >
                      {s.label}
                    </Badge>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <BeeLoadingMessages />
        ) : visibleChartData.length ? (
          <div className="h-[28rem]" onMouseLeave={hideMarkerTooltip}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={visibleChartData}
                margin={{
                  top: 32,
                  right: axisOrder.some(
                    a =>
                      activeAxes.has(a) &&
                      axisScaleSettings[a].side === 'right',
                  )
                    ? 48
                    : 8,
                  bottom: 8,
                  left: axisOrder.some(
                    a =>
                      activeAxes.has(a) && axisScaleSettings[a].side === 'left',
                  )
                    ? 8
                    : 0,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  domain={[
                    dateRange.startAt
                      ? new Date(dateRange.startAt).getTime()
                      : 'dataMin',
                    dateRange.endAt
                      ? new Date(dateRange.endAt).getTime()
                      : 'dataMax',
                  ]}
                  minTickGap={24}
                  scale="time"
                  tickFormatter={formatChartTick}
                  type="number"
                />
                {axisOrder.map(axis => {
                  if (!activeAxes.has(axis)) return null;
                  const { unit } = axisPresentation[axis];
                  const settings = axisScaleSettings[axis];
                  const unitWidths: Partial<Record<SeriesAxis, number>> = {
                    pressure: 74,
                    current: 58,
                    power: 62,
                    dbfs: 68,
                    beecount: 62,
                    vibration: 58,
                  };
                  return (
                    <YAxis
                      key={axis}
                      yAxisId={axis}
                      orientation={settings.side}
                      unit={` ${unit}`}
                      width={unitWidths[axis] ?? 52}
                      domain={axisDomains[axis]}
                      allowDataOverflow={shouldAllowAxisDataOverflow(settings)}
                    />
                  );
                })}
                <Tooltip
                  labelFormatter={value => formatDateTime(Number(value))}
                  formatter={(value, name) => [value, name]}
                />
                <Legend />
                {markers.map(({ marker, stackIndex }) =>
                  renderMarkerReferenceLine({
                    marker,
                    stackIndex,
                    yAxisId: activeSeries[0]?.axis ?? 'weight',
                    onEnter: handleMarkerMouseEnter,
                    onLeave: hideMarkerTooltip,
                  }),
                )}
                {activeSeries.map(s => (
                  <Line
                    key={s.key}
                    yAxisId={s.axis}
                    type="monotone"
                    dataKey={s.dataKey}
                    name={s.label}
                    stroke={s.stroke}
                    dot={false}
                    connectNulls={false}
                    strokeWidth={1.5}
                    unit={` ${s.unit}`}
                    // Animating thousands of points per series on every data
                    // change is the main source of chart jank; the data is
                    // dense enough that the entry animation adds no value.
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            {t('diagram.noMeasurements')}
          </div>
        )}

        {/* Marker tooltip rendered as a portal-like fixed overlay */}
        {hoveredMarker && (
          <div
            className="pointer-events-none fixed z-50 rounded-md border bg-popover px-3 py-2 text-sm shadow-md"
            style={{
              left: hoveredMarker.x + 12,
              top: hoveredMarker.y - 8,
            }}
          >
            <div className="font-medium">{hoveredMarker.marker.label}</div>
            <div className="text-muted-foreground">
              {hoveredMarker.marker.hiveName}
            </div>
            {hoveredMarker.marker.detail && (
              <div className="text-muted-foreground">
                {hoveredMarker.marker.detail}
              </div>
            )}
            <div className="text-muted-foreground">
              {formatDateTime(hoveredMarker.marker.timestamp)}
            </div>
          </div>
        )}

        {/* Axis scale settings */}
        <div className="space-y-3 rounded-md border p-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">
              {t('diagram.axisSettings.title')}
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={resetAxisLayout}
            >
              {t('diagram.axisSettings.reset')}
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {axisOrder.map(axis => {
              if (!activeAxes.has(axis)) return null;
              const { labelKey, Icon } = axisPresentation[axis];
              const settings = axisScaleSettings[axis];
              return (
                <div key={axis} className="space-y-2 rounded-md border p-2">
                  <div className="flex items-center gap-1 text-xs font-medium">
                    <Icon className="h-3.5 w-3.5" />
                    {t(labelKey)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Label className="w-8 text-xs text-muted-foreground">
                      {t('diagram.axisSettings.side')}
                    </Label>
                    <Select
                      value={settings.side}
                      onValueChange={value =>
                        updateAxisScaleSettings(axis, {
                          side: value as 'left' | 'right',
                        })
                      }
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left">
                          {t('diagram.axisSettings.left')}
                        </SelectItem>
                        <SelectItem value="right">
                          {t('diagram.axisSettings.right')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-1">
                    <Label className="w-8 text-xs text-muted-foreground">
                      {t('diagram.axisSettings.scale')}
                    </Label>
                    <Select
                      value={settings.scaleMode}
                      onValueChange={value =>
                        updateAxisScaleSettings(axis, {
                          scaleMode: value as AxisScaleMode,
                        })
                      }
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="maxRange">
                          {t('diagram.axisSettings.auto')}
                        </SelectItem>
                        <SelectItem value="zeroToMax">
                          {t('diagram.axisSettings.zeroToMax')}
                        </SelectItem>
                        <SelectItem value="custom">
                          {t('diagram.axisSettings.custom')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {settings.scaleMode === 'custom' && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <Label className="w-8 text-xs text-muted-foreground">
                          {t('diagram.axisSettings.min')}
                        </Label>
                        <Input
                          className="h-7 text-xs"
                          placeholder={t(
                            'diagram.axisSettings.autoPlaceholder',
                          )}
                          value={settings.customMin}
                          onChange={e =>
                            updateAxisScaleSettings(axis, {
                              customMin: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <Label className="w-8 text-xs text-muted-foreground">
                          {t('diagram.axisSettings.max')}
                        </Label>
                        <Input
                          className="h-7 text-xs"
                          placeholder={t(
                            'diagram.axisSettings.autoPlaceholder',
                          )}
                          value={settings.customMax}
                          onChange={e =>
                            updateAxisScaleSettings(axis, {
                              customMax: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
