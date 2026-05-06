import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AppData, Guard, Position, PinnedShift, Settings, GeneratedSchedule } from '../types';
import { loadData, saveData, DEFAULT_APP_DATA } from '../storage/storage';
import { generateSchedule } from '../algorithm/scheduler';
import { exportScheduleToCSV, exportJSON, importJSON } from '../utils/export';

interface AppContextType {
  data: AppData;
  loading: boolean;

  // Guards
  addGuard: (name: string) => void;
  updateGuard: (guard: Guard) => void;
  removeGuard: (id: string) => void;

  // Positions
  addPosition: (name: string, difficulty: number) => void;
  updatePosition: (pos: Position) => void;
  removePosition: (id: string) => void;

  // Pins
  addPin: (pin: Omit<PinnedShift, 'id'>) => void;
  removePin: (id: string) => void;

  // Settings
  updateSettings: (s: Partial<Settings>) => void;

  // Schedule
  runSchedule: (startTime: Date) => { errors: string[] };
  clearSchedule: () => void;
  exportCSV: () => Promise<void>;

  // Backup
  exportBackup: () => Promise<void>;
  importBackup: () => Promise<boolean>;
}

const AppContext = createContext<AppContextType | null>(null);

function genId(): string {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(DEFAULT_APP_DATA);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData().then(d => { setData(d); setLoading(false); });
  }, []);

  const persist = useCallback((next: AppData) => {
    setData(next);
    saveData(next);
  }, []);

  // ─── Guards ───────────────────────────────────────────────────────────────

  const addGuard = useCallback((name: string) => {
    const maxScore = data.guards.reduce((m, g) => Math.max(m, g.scoreBank), 0);
    const newGuard: Guard = { id: genId(), name, scoreBank: maxScore };
    persist({ ...data, guards: [...data.guards, newGuard] });
  }, [data, persist]);

  const updateGuard = useCallback((guard: Guard) => {
    persist({ ...data, guards: data.guards.map(g => g.id === guard.id ? guard : g) });
  }, [data, persist]);

  const removeGuard = useCallback((id: string) => {
    persist({
      ...data,
      guards: data.guards.filter(g => g.id !== id),
      pins: data.pins.filter(p => p.guardId !== id),
    });
  }, [data, persist]);

  // ─── Positions ────────────────────────────────────────────────────────────

  const addPosition = useCallback((name: string, difficulty: number) => {
    const pos: Position = { id: genId(), name, difficulty };
    persist({ ...data, positions: [...data.positions, pos] });
  }, [data, persist]);

  const updatePosition = useCallback((pos: Position) => {
    persist({ ...data, positions: data.positions.map(p => p.id === pos.id ? pos : p) });
  }, [data, persist]);

  const removePosition = useCallback((id: string) => {
    persist({
      ...data,
      positions: data.positions.filter(p => p.id !== id),
      pins: data.pins.filter(p => p.positionId !== id),
    });
  }, [data, persist]);

  // ─── Pins ─────────────────────────────────────────────────────────────────

  const addPin = useCallback((pin: Omit<PinnedShift, 'id'>) => {
    const newPin: PinnedShift = { id: genId(), ...pin };
    // Replace if same slot+position already pinned
    const filtered = data.pins.filter(
      p => !(p.positionId === pin.positionId && p.slotStart === pin.slotStart)
    );
    persist({ ...data, pins: [...filtered, newPin] });
  }, [data, persist]);

  const removePin = useCallback((id: string) => {
    persist({ ...data, pins: data.pins.filter(p => p.id !== id) });
  }, [data, persist]);

  // ─── Settings ─────────────────────────────────────────────────────────────

  const updateSettings = useCallback((s: Partial<Settings>) => {
    persist({ ...data, settings: { ...data.settings, ...s } });
  }, [data, persist]);

  // ─── Schedule ─────────────────────────────────────────────────────────────

  const runSchedule = useCallback((startTime: Date): { errors: string[] } => {
    if (data.guards.length === 0) return { errors: ['אין שומרים במערכת.'] };
    if (data.positions.length === 0) return { errors: ['אין עמדות במערכת.'] };

    const { assignments, errors, updatedScores } = generateSchedule(
      data.guards,
      data.positions,
      data.settings,
      data.pins,
      startTime,
    );

    const schedule: GeneratedSchedule = {
      id: genId(),
      generatedAt: new Date().toISOString(),
      scheduleStart: startTime.toISOString(),
      scheduleEnd: new Date(startTime.getTime() + data.settings.horizonHours * 3600_000).toISOString(),
      assignments,
    };

    // Persist updated scores and last shift end into guard records
    const updatedGuards = data.guards.map(g => {
      const guardsAssignments = assignments.filter(a => a.guardId === g.id);
      const lastSlotEnd = guardsAssignments.length > 0
        ? guardsAssignments.reduce((latest, a) =>
            new Date(a.slotEnd) > new Date(latest) ? a.slotEnd : latest,
          guardsAssignments[0].slotEnd)
        : g.lastShiftEnd;

      return {
        ...g,
        scoreBank: updatedScores[g.id] ?? g.scoreBank,
        lastShiftEnd: lastSlotEnd ?? g.lastShiftEnd,
      };
    });

    persist({ ...data, guards: updatedGuards, schedule });
    return { errors: errors.map(e => e.reason) };
  }, [data, persist]);

  const clearSchedule = useCallback(() => {
    persist({ ...data, schedule: null });
  }, [data, persist]);

  const exportCSV = useCallback(async () => {
    if (!data.schedule) return;
    await exportScheduleToCSV(data.schedule, data.positions);
  }, [data]);

  // ─── Backup ───────────────────────────────────────────────────────────────

  const exportBackup = useCallback(async () => {
    await exportJSON(data);
  }, [data]);

  const importBackup = useCallback(async (): Promise<boolean> => {
    const imported = await importJSON();
    if (!imported) return false;
    persist(imported);
    return true;
  }, [persist]);

  return (
    <AppContext.Provider value={{
      data, loading,
      addGuard, updateGuard, removeGuard,
      addPosition, updatePosition, removePosition,
      addPin, removePin,
      updateSettings,
      runSchedule, clearSchedule, exportCSV,
      exportBackup, importBackup,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
