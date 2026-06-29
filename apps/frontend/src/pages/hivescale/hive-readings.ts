import type {
  HiveScaleDevice,
  HiveScaleHiveReading,
  HiveScaleMeasurement,
} from '@/api/hooks/useHiveScale';

// The HiveScale firmware (v0.20.0+) / backend report up to 18 hives per device.
export const MAX_HIVES = 18;

export interface HiveScaleHiveSlot {
  index: number; // 1..18
  name: string;
}

// Synthesize the 1–2 legacy hive readings from the flat scale_N_*/hive_N_*/
// ble_N_*/accel_N_*/bee_counter_N_* columns. Used as a fallback for older rows
// (or cached payloads) that predate the normalized `hives` array. The backend
// already backfills `hives` for stored rows, so this only matters for very old
// or partial payloads — but it keeps every consumer on a single code path.
const synthesizeLegacyReadings = (
  m: HiveScaleMeasurement,
): HiveScaleHiveReading[] => {
  const make = (index: 1 | 2): HiveScaleHiveReading => ({
    index,
    weight_kg: index === 1 ? m.scale_1_weight_kg : m.scale_2_weight_kg,
    raw_weight: index === 1 ? m.scale_1_raw : m.scale_2_raw,
    temp_c: index === 1 ? m.hive_1_temp_c : m.hive_2_temp_c,
    humidity_percent:
      index === 1 ? m.ble_1_humidity_percent : m.ble_2_humidity_percent,
    accel: {
      ok: index === 1 ? m.accel_1_ok : m.accel_2_ok,
      sample_count: index === 1 ? m.accel_1_sample_count : m.accel_2_sample_count,
      range_g: index === 1 ? m.accel_1_range_g : m.accel_2_range_g,
      rms_mg: index === 1 ? m.accel_1_rms_mg : m.accel_2_rms_mg,
      peak_mg: index === 1 ? m.accel_1_peak_mg : m.accel_2_peak_mg,
      band_swarm_mg:
        index === 1 ? m.accel_1_band_swarm_mg : m.accel_2_band_swarm_mg,
      band_fanning_mg:
        index === 1 ? m.accel_1_band_fanning_mg : m.accel_2_band_fanning_mg,
      band_activity_mg:
        index === 1 ? m.accel_1_band_activity_mg : m.accel_2_band_activity_mg,
    },
    ble: {
      humidity_percent:
        index === 1 ? m.ble_1_humidity_percent : m.ble_2_humidity_percent,
      pressure_hpa: index === 1 ? m.ble_1_pressure_hpa : m.ble_2_pressure_hpa,
      battery_percent:
        index === 1 ? m.ble_1_battery_percent : m.ble_2_battery_percent,
      rssi_dbm: index === 1 ? m.ble_1_rssi_dbm : m.ble_2_rssi_dbm,
    },
    bee_counter: {
      ok: index === 1 ? m.bee_counter_1_ok : m.bee_counter_2_ok,
      total_in: index === 1 ? m.bee_counter_1_total_in : m.bee_counter_2_total_in,
      total_out:
        index === 1 ? m.bee_counter_1_total_out : m.bee_counter_2_total_out,
      interval_in:
        index === 1 ? m.bee_counter_1_interval_in : m.bee_counter_2_interval_in,
      interval_out:
        index === 1 ? m.bee_counter_1_interval_out : m.bee_counter_2_interval_out,
    },
  });
  return [make(1), make(2)];
};

// Normalized per-hive readings for a single measurement, index-ascending. This
// is the single source of truth every panel should read from — it prefers the
// backend `hives` array (up to 18) and falls back to the legacy 1–2 columns.
export const getHiveReadings = (
  measurement: HiveScaleMeasurement | undefined,
): HiveScaleHiveReading[] => {
  if (!measurement) return [];
  if (measurement.hives && measurement.hives.length > 0) {
    return [...measurement.hives].sort((a, b) => a.index - b.index);
  }
  return synthesizeLegacyReadings(measurement);
};

export const getHiveReading = (
  measurement: HiveScaleMeasurement | undefined,
  index: number,
): HiveScaleHiveReading | undefined =>
  getHiveReadings(measurement).find(reading => reading.index === index);

// Resolve the weight to display for a hive. Hives 1–2 keep the existing
// temperature-compensated weight from the legacy mirror columns (so the
// compensation feature is not regressed); hives 3–18 only exist in the
// normalized array, where `weight_kg` is already the corrected reading.
export const hiveWeightKg = (
  measurement: HiveScaleMeasurement,
  reading: HiveScaleHiveReading,
): number | null => {
  if (reading.index === 1) {
    return (
      measurement.scale_1_weight_kg_compensated ??
      measurement.scale_1_weight_kg ??
      reading.weight_kg
    );
  }
  if (reading.index === 2) {
    return (
      measurement.scale_2_weight_kg_compensated ??
      measurement.scale_2_weight_kg ??
      reading.weight_kg
    );
  }
  return reading.weight_kg;
};

// Resolve in-hive humidity, preferring the promoted column and falling back to
// the raw BLE sensor block.
export const hiveHumidityPercent = (
  reading: HiveScaleHiveReading,
): number | null => reading.humidity_percent ?? reading.ble?.humidity_percent ?? null;

// The ordered set of hives this device currently exposes, with display names.
// Names come from the device channel config for the two legacy scales and from
// the reading's own `name` for hives 3–18; anything unnamed gets a fallback.
// Indices 1 and 2 are always present (every device has the two legacy scales),
// plus every index seen in the newest measurement that carries a `hives` array.
export const getHiveSlots = (
  device: HiveScaleDevice | undefined,
  measurements: HiveScaleMeasurement[] | undefined,
  fallbackName: (index: number) => string,
): HiveScaleHiveSlot[] => {
  const indices = new Set<number>([1, 2]);
  const readingByIndex = new Map<number, HiveScaleHiveReading>();

  const sorted = [...(measurements ?? [])].sort(
    (a, b) =>
      new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime(),
  );
  // The newest row that actually carries a hives array defines the active set.
  for (const m of sorted) {
    if (m.hives && m.hives.length > 0) {
      for (const reading of m.hives) {
        indices.add(reading.index);
        if (!readingByIndex.has(reading.index)) {
          readingByIndex.set(reading.index, reading);
        }
      }
      break;
    }
  }

  const channelName = (index: number): string | null | undefined => {
    if (index === 1) return device?.channels?.scale_1;
    if (index === 2) return device?.channels?.scale_2;
    return undefined;
  };

  return [...indices]
    .sort((a, b) => a - b)
    .map(index => ({
      index,
      name:
        channelName(index)?.trim() ||
        readingByIndex.get(index)?.name?.trim() ||
        fallbackName(index),
    }));
};
