export interface Guard {
  id: string;
  name: string;
  scoreBank: number;
  lastShiftEnd?: string; // ISO string - persisted across sessions
  departureTime?: string; // ISO string - when they leave base
  returnTime?: string;   // ISO string - when they return (usually departure + 4 days)
}

export interface Position {
  id: string;
  name: string;
  difficulty: number; // 1-10
}

export interface HourDifficulty {
  hour: number; // 0-23
  difficulty: number; // 1-10
}

export interface PinnedShift {
  id: string;
  guardId: string;
  positionId: string;
  slotStart: string; // ISO string - exact slot start time
}

export interface Assignment {
  id: string;
  guardId: string;
  guardName: string;
  positionId: string;
  positionName: string;
  slotStart: string; // ISO string
  slotEnd: string;   // ISO string
  weight: number;
  isPinned: boolean;
}

export interface GeneratedSchedule {
  id: string;
  generatedAt: string;
  scheduleStart: string;
  scheduleEnd: string;
  assignments: Assignment[];
}

export interface Settings {
  shiftDurationHours: number;   // how long each shift is (e.g. 8)
  horizonHours: number;          // how far ahead to schedule (e.g. 72)
  minRestHours: number;          // mandatory rest between shifts (e.g. 9)
  hourDifficulties: HourDifficulty[]; // difficulty per hour of day
}

export interface AppData {
  guards: Guard[];
  positions: Position[];
  pins: PinnedShift[];
  settings: Settings;
  schedule: GeneratedSchedule | null;
}

export interface TimeSlot {
  index: number;
  start: Date;
  end: Date;
}

export interface ScheduleError {
  slotStart: string;
  positionName: string;
  reason: string;
}
