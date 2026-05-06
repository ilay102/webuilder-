import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppData, Settings, HourDifficulty } from '../types';

const STORAGE_KEY = 'shift_scheduler_data';

const defaultHourDifficulties: HourDifficulty[] = Array.from({ length: 24 }, (_, h) => ({
  hour: h,
  // Night hours (22-05) are harder
  difficulty: h >= 22 || h < 5 ? 8 : h >= 5 && h < 7 ? 6 : 5,
}));

export const DEFAULT_SETTINGS: Settings = {
  shiftDurationHours: 8,
  horizonHours: 72,
  minRestHours: 9,
  hourDifficulties: defaultHourDifficulties,
};

export const DEFAULT_APP_DATA: AppData = {
  guards: [],
  positions: [],
  pins: [],
  settings: DEFAULT_SETTINGS,
  schedule: null,
};

export async function loadData(): Promise<AppData> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_APP_DATA;
    const parsed = JSON.parse(raw) as AppData;
    // Merge in any missing settings keys (for app upgrades)
    parsed.settings = { ...DEFAULT_SETTINGS, ...parsed.settings };
    if (!parsed.pins) parsed.pins = [];
    return parsed;
  } catch {
    return DEFAULT_APP_DATA;
  }
}

export async function saveData(data: AppData): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export async function resetData(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
