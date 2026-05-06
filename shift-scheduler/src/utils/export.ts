import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { GeneratedSchedule, Guard, Position, AppData } from '../types';

// ─── CSV Export ───────────────────────────────────────────────────────────────

function formatSlotLabel(isoString: string): string {
  const d = new Date(isoString);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const hour = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month} ${hour}:${min}`;
}

export async function exportScheduleToCSV(
  schedule: GeneratedSchedule,
  positions: Position[]
): Promise<void> {
  // Collect unique slot starts, sorted
  const slotStarts = [...new Set(schedule.assignments.map(a => a.slotStart))].sort();

  // Build header row: Time | Position1 | Position2 | ...
  const header = ['זמן', ...positions.map(p => p.name)].join(',');

  // Build data rows
  const rows = slotStarts.map(slotStart => {
    const timeLabel = formatSlotLabel(slotStart);
    const cells = positions.map(pos => {
      const a = schedule.assignments.find(
        x => x.slotStart === slotStart && x.positionId === pos.id
      );
      const name = a ? a.guardName : '';
      const pin = a?.isPinned ? ' (נעוץ)' : '';
      return `"${name}${pin}"`;
    });
    return [timeLabel, ...cells].join(',');
  });

  // UTF-8 BOM ensures Hebrew displays correctly in Excel
  const BOM = '﻿';
  const csv = BOM + [header, ...rows].join('\n');

  const filename = `schedule_${Date.now()}.csv`;
  const path = FileSystem.documentDirectory + filename;
  await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, { mimeType: 'text/csv', dialogTitle: 'ייצוא לוח זמנים' });
  }
}

// ─── JSON Backup ──────────────────────────────────────────────────────────────

export async function exportJSON(data: AppData): Promise<void> {
  const json = JSON.stringify(data, null, 2);
  const filename = `shift_backup_${Date.now()}.json`;
  const path = FileSystem.documentDirectory + filename;
  await FileSystem.writeAsStringAsync(path, json, { encoding: FileSystem.EncodingType.UTF8 });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, { mimeType: 'application/json', dialogTitle: 'ייצוא גיבוי JSON' });
  }
}

export async function importJSON(): Promise<AppData | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.[0]) return null;

  const raw = await FileSystem.readAsStringAsync(result.assets[0].uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  return JSON.parse(raw) as AppData;
}
