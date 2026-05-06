import React, { useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { GeneratedSchedule, Position, PinnedShift } from '../types';

interface Props {
  schedule: GeneratedSchedule;
  positions: Position[];
  pins: PinnedShift[];
  onCellPress: (slotStart: string, positionId: string) => void;
}

const COL_WIDTH = 110;
const ROW_LABEL_WIDTH = 80;
const ROW_HEIGHT = 56;
const HEADER_HEIGHT = 48;

const COLORS = {
  primary: '#1a237e',
  accent: '#ff6f00',
  pinned: '#e8f5e9',
  pinnedBorder: '#2e7d32',
  empty: '#ffebee',
  emptyText: '#c62828',
  header: '#283593',
  rowLabel: '#e8eaf6',
  border: '#c5cae9',
  text: '#212121',
  subtext: '#546e7a',
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, '0');
  const mon = String(d.getMonth() + 1).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${mon}\n${h}:${m}`;
}

export default function ScheduleGrid({ schedule, positions, pins, onCellPress }: Props) {
  // Collect unique slot starts, sorted chronologically
  const slotStarts = [...new Set(schedule.assignments.map(a => a.slotStart))]
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  // Also include slots that may have errors (no assignment for a position)
  // We derive from the first/last assignment times and rebuild the grid
  const getAssignment = useCallback(
    (slotStart: string, positionId: string) =>
      schedule.assignments.find(a => a.slotStart === slotStart && a.positionId === positionId),
    [schedule]
  );

  const getPin = useCallback(
    (slotStart: string, positionId: string) =>
      pins.find(p => p.positionId === positionId &&
        Math.abs(new Date(p.slotStart).getTime() - new Date(slotStart).getTime()) < 60_000),
    [pins]
  );

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator>
      <View>
        {/* Header row */}
        <View style={s.headerRow}>
          <View style={[s.headerCell, { width: ROW_LABEL_WIDTH }]}>
            <Text style={s.headerText}>זמן</Text>
          </View>
          {positions.map(pos => (
            <View key={pos.id} style={[s.headerCell, { width: COL_WIDTH }]}>
              <Text style={s.headerText} numberOfLines={2}>{pos.name}</Text>
              <Text style={s.headerSub}>קושי: {pos.difficulty}</Text>
            </View>
          ))}
        </View>

        {/* Data rows */}
        <ScrollView showsVerticalScrollIndicator nestedScrollEnabled>
          {slotStarts.map((slotStart, rowIdx) => (
            <View key={slotStart} style={[s.dataRow, rowIdx % 2 === 1 && s.dataRowAlt]}>
              {/* Time label */}
              <View style={[s.rowLabel, { width: ROW_LABEL_WIDTH }]}>
                <Text style={s.rowLabelText}>{formatTime(slotStart)}</Text>
              </View>

              {/* Position cells */}
              {positions.map(pos => {
                const assignment = getAssignment(slotStart, pos.id);
                const pin = getPin(slotStart, pos.id);
                const isEmpty = !assignment;

                return (
                  <TouchableOpacity
                    key={pos.id}
                    style={[
                      s.cell,
                      { width: COL_WIDTH },
                      assignment?.isPinned && s.cellPinned,
                      isEmpty && s.cellEmpty,
                    ]}
                    onPress={() => onCellPress(slotStart, pos.id)}
                    activeOpacity={0.7}
                  >
                    {isEmpty ? (
                      <Text style={s.emptyText}>—</Text>
                    ) : (
                      <>
                        <Text style={s.cellName} numberOfLines={2}>{assignment.guardName}</Text>
                        <Text style={s.cellWeight}>⚖ {assignment.weight.toFixed(1)}</Text>
                        {assignment.isPinned && <Text style={s.pinBadge}>📌</Text>}
                      </>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </ScrollView>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.header,
    height: HEADER_HEIGHT,
  },
  headerCell: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderRightWidth: 1,
    borderRightColor: '#3949ab',
  },
  headerText: { color: '#fff', fontWeight: '700', fontSize: 13, textAlign: 'center' },
  headerSub: { color: '#b3c5ff', fontSize: 10, textAlign: 'center' },

  dataRow: {
    flexDirection: 'row',
    height: ROW_HEIGHT,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: '#fff',
  },
  dataRowAlt: { backgroundColor: '#f3f4ff' },

  rowLabel: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.rowLabel,
    borderRightWidth: 2,
    borderRightColor: COLORS.primary,
    paddingHorizontal: 4,
  },
  rowLabelText: { fontSize: 12, fontWeight: '700', color: COLORS.primary, textAlign: 'center' },

  cell: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    padding: 4,
  },
  cellPinned: { backgroundColor: COLORS.pinned, borderWidth: 1, borderColor: COLORS.pinnedBorder },
  cellEmpty: { backgroundColor: COLORS.empty },

  cellName: { fontSize: 13, fontWeight: '600', color: COLORS.text, textAlign: 'center' },
  cellWeight: { fontSize: 10, color: COLORS.subtext, marginTop: 2 },
  pinBadge: { fontSize: 10, position: 'absolute', top: 2, right: 4 },
  emptyText: { color: COLORS.emptyText, fontSize: 20, fontWeight: '300' },
});
