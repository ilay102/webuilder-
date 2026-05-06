import { Guard, Position, Settings, PinnedShift, Assignment, TimeSlot, ScheduleError, HourDifficulty } from '../types';

function genId(): string {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

function generateSlots(start: Date, horizonHours: number, shiftDurationHours: number): TimeSlot[] {
  const slots: TimeSlot[] = [];
  let current = new Date(start);
  const end = new Date(start.getTime() + horizonHours * 3600_000);
  let index = 0;
  while (current < end) {
    const slotEnd = new Date(current.getTime() + shiftDurationHours * 3600_000);
    slots.push({ index, start: new Date(current), end: slotEnd });
    current = slotEnd;
    index++;
  }
  return slots;
}

function avgHourDifficulty(slot: TimeSlot, hourDifficulties: HourDifficulty[]): number {
  const shiftMs = slot.end.getTime() - slot.start.getTime();
  const totalHours = shiftMs / 3600_000;
  let sum = 0;
  // Sample each hour covered by this slot
  for (let i = 0; i < Math.ceil(totalHours); i++) {
    const t = new Date(slot.start.getTime() + i * 3600_000);
    const h = t.getHours();
    const hd = hourDifficulties.find(d => d.hour === h);
    sum += hd ? hd.difficulty : 5;
  }
  return sum / Math.ceil(totalHours);
}

function calculateWeight(position: Position, slot: TimeSlot, settings: Settings): number {
  const hourDiff = avgHourDifficulty(slot, settings.hourDifficulties);
  // Multiply both factors and scale: max = 10*10 = 100 per shift
  return Math.round(position.difficulty * hourDiff * 10) / 10;
}

function isGuardAvailableForSlot(guard: Guard, slot: TimeSlot): boolean {
  if (!guard.departureTime) return true;
  const dep = new Date(guard.departureTime).getTime();
  const ret = guard.returnTime ? new Date(guard.returnTime).getTime() : Infinity;
  const slotStart = slot.start.getTime();
  const slotEnd = slot.end.getTime();
  // Guard is unavailable if any part of their absence overlaps this slot
  if (slotEnd > dep && slotStart < ret) return false;
  return true;
}

function getLastShiftEndForGuard(
  guardId: string,
  beforeSlotStart: Date,
  assignments: Assignment[],
  guardLastShiftEnd?: string
): Date | null {
  // Check assignments accumulated so far in this run
  const guardAssignments = assignments
    .filter(a => a.guardId === guardId && new Date(a.slotEnd) <= beforeSlotStart)
    .map(a => new Date(a.slotEnd).getTime());

  let candidates: number[] = [...guardAssignments];

  // Also factor in lastShiftEnd persisted from previous schedule
  if (guardLastShiftEnd) {
    const t = new Date(guardLastShiftEnd).getTime();
    if (t <= beforeSlotStart.getTime()) candidates.push(t);
  }

  if (candidates.length === 0) return null;
  return new Date(Math.max(...candidates));
}

function hasMinimumRest(
  guard: Guard,
  slot: TimeSlot,
  assignments: Assignment[],
  minRestHours: number
): boolean {
  const lastEnd = getLastShiftEndForGuard(guard.id, slot.start, assignments, guard.lastShiftEnd);
  if (!lastEnd) return true;
  const restHours = (slot.start.getTime() - lastEnd.getTime()) / 3600_000;
  return restHours >= minRestHours;
}

function isAlreadyAssignedThisSlot(guardId: string, slot: TimeSlot, assignments: Assignment[]): boolean {
  return assignments.some(
    a => a.guardId === guardId && new Date(a.slotStart).getTime() === slot.start.getTime()
  );
}

export interface ScheduleResult {
  assignments: Assignment[];
  errors: ScheduleError[];
  updatedScores: Record<string, number>; // guardId -> new total score
}

export function generateSchedule(
  guards: Guard[],
  positions: Position[],
  settings: Settings,
  pins: PinnedShift[],
  startTime: Date
): ScheduleResult {
  const slots = generateSlots(startTime, settings.horizonHours, settings.shiftDurationHours);
  const assignments: Assignment[] = [];
  const errors: ScheduleError[] = [];

  // Working copy of scores — does not mutate guard objects
  const runningScores: Record<string, number> = {};
  guards.forEach(g => { runningScores[g.id] = g.scoreBank; });

  for (const slot of slots) {
    for (const position of positions) {
      // --- Pinned shift takes priority ---
      const pin = pins.find(p => {
        if (p.positionId !== position.id) return false;
        const pinTime = new Date(p.slotStart).getTime();
        const slotTime = slot.start.getTime();
        // Allow ±1 minute tolerance for floating point / rounding
        return Math.abs(pinTime - slotTime) < 60_000;
      });

      if (pin) {
        const guard = guards.find(g => g.id === pin.guardId);
        if (guard) {
          const weight = calculateWeight(position, slot, settings);
          assignments.push({
            id: genId(),
            guardId: guard.id,
            guardName: guard.name,
            positionId: position.id,
            positionName: position.name,
            slotStart: slot.start.toISOString(),
            slotEnd: slot.end.toISOString(),
            weight,
            isPinned: true,
          });
          runningScores[guard.id] = (runningScores[guard.id] ?? 0) + weight;
          continue;
        }
      }

      // --- Greedy assignment ---
      const available = guards.filter(guard => {
        if (!isGuardAvailableForSlot(guard, slot)) return false;
        if (isAlreadyAssignedThisSlot(guard.id, slot, assignments)) return false;
        if (!hasMinimumRest(guard, slot, assignments, settings.minRestHours)) return false;
        return true;
      });

      if (available.length === 0) {
        const slotLabel = slot.start.toLocaleString('he-IL', {
          day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
        });
        errors.push({
          slotStart: slot.start.toISOString(),
          positionName: position.name,
          reason: `אין שומרים פנויים עבור "${position.name}" בתחילת ${slotLabel}. ` +
            `בדוק: מינימום מנוחה (${settings.minRestHours}ש'), חופשות, ומספר שומרים.`,
        });
        continue;
      }

      // Sort by score ascending (lowest score = needs harder work first)
      available.sort((a, b) => (runningScores[a.id] ?? 0) - (runningScores[b.id] ?? 0));
      const chosen = available[0];

      const weight = calculateWeight(position, slot, settings);
      assignments.push({
        id: genId(),
        guardId: chosen.id,
        guardName: chosen.name,
        positionId: position.id,
        positionName: position.name,
        slotStart: slot.start.toISOString(),
        slotEnd: slot.end.toISOString(),
        weight,
        isPinned: false,
      });
      runningScores[chosen.id] = (runningScores[chosen.id] ?? 0) + weight;
    }
  }

  return { assignments, errors, updatedScores: runningScores };
}
