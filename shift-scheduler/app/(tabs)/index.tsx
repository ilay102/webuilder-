import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '../../src/context/AppContext';
import ScheduleGrid from '../../src/components/ScheduleGrid';
import PinModal from '../../src/components/PinModal';

const COLORS = {
  primary: '#1a237e', accent: '#ff6f00', bg: '#f0f2ff',
  card: '#fff', border: '#c5cae9', text: '#212121', muted: '#757575',
  success: '#2e7d32', danger: '#c62828',
};

function now(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ScheduleScreen() {
  const { data, loading, runSchedule, clearSchedule, exportCSV, addPin, removePin } = useApp();
  const [startTime, setStartTime] = useState(now);
  const [generating, setGenerating] = useState(false);
  const [pinModalData, setPinModalData] = useState<{
    slotStart: string; positionId: string; positionName: string;
  } | null>(null);

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  async function handleGenerate() {
    const start = new Date(startTime);
    if (isNaN(start.getTime())) {
      Alert.alert('שגיאה', 'תאריך/שעת התחלה לא תקינים. פורמט: YYYY-MM-DDTHH:MM');
      return;
    }
    setGenerating(true);
    // Delay to let UI render the spinner
    setTimeout(() => {
      const { errors } = runSchedule(start);
      setGenerating(false);
      if (errors.length > 0) {
        Alert.alert(
          `⚠️ הלוח נוצר עם ${errors.length} בעיות`,
          errors.slice(0, 5).join('\n\n') + (errors.length > 5 ? `\n...ועוד ${errors.length - 5}` : ''),
          [{ text: 'הבנתי' }]
        );
      } else {
        Alert.alert('✅ הצלחה', 'לוח הזמנים נוצר בהצלחה!');
      }
    }, 100);
  }

  function handleCellPress(slotStart: string, positionId: string) {
    const pos = data.positions.find(p => p.id === positionId);
    if (!pos) return;
    setPinModalData({ slotStart, positionId, positionName: pos.name });
  }

  function handlePin(guardId: string) {
    if (!pinModalData) return;
    addPin({ guardId, positionId: pinModalData.positionId, slotStart: pinModalData.slotStart });
  }

  function handleUnpin() {
    if (!pinModalData) return;
    const pin = data.pins.find(
      p => p.positionId === pinModalData.positionId &&
        Math.abs(new Date(p.slotStart).getTime() - new Date(pinModalData.slotStart).getTime()) < 60_000
    );
    if (pin) removePin(pin.id);
  }

  const existingPin = pinModalData
    ? data.pins.find(p =>
        p.positionId === pinModalData.positionId &&
        Math.abs(new Date(p.slotStart).getTime() - new Date(pinModalData.slotStart).getTime()) < 60_000
      )
    : undefined;

  return (
    <SafeAreaView style={s.root} edges={['bottom']}>
      {/* Control Bar */}
      <View style={s.controls}>
        <View style={s.inputRow}>
          <Text style={s.inputLabel}>התחלה:</Text>
          <TextInput
            style={s.timeInput}
            value={startTime}
            onChangeText={setStartTime}
            placeholder="YYYY-MM-DDTHH:MM"
            placeholderTextColor={COLORS.muted}
          />
        </View>

        <View style={s.btnBar}>
          <TouchableOpacity
            style={[s.actionBtn, s.btnGenerate]}
            onPress={handleGenerate}
            disabled={generating}
          >
            {generating
              ? <ActivityIndicator size="small" color="#fff" />
              : <MaterialCommunityIcons name="play-circle" size={18} color="#fff" />
            }
            <Text style={s.actionBtnText}>{generating ? 'מייצר...' : 'צור לוח'}</Text>
          </TouchableOpacity>

          {data.schedule && (
            <>
              <TouchableOpacity style={[s.actionBtn, s.btnExport]} onPress={exportCSV}>
                <MaterialCommunityIcons name="microsoft-excel" size={18} color="#fff" />
                <Text style={s.actionBtnText}>Excel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.actionBtn, s.btnClear]}
                onPress={() => Alert.alert('מחיקה', 'למחוק את הלוח?', [
                  { text: 'ביטול', style: 'cancel' },
                  { text: 'מחק', style: 'destructive', onPress: clearSchedule },
                ])}
              >
                <MaterialCommunityIcons name="delete" size={18} color="#fff" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Stats bar */}
      {data.schedule && (
        <View style={s.statsBar}>
          <StatChip icon="account-multiple" label={`${data.guards.length} שומרים`} />
          <StatChip icon="map-marker-multiple" label={`${data.positions.length} עמדות`} />
          <StatChip icon="calendar-range" label={`${data.settings.horizonHours}ש'`} />
          <StatChip icon="pin" label={`${data.pins.length} נעוצים`} />
        </View>
      )}

      {/* Grid or empty state */}
      {data.schedule ? (
        <View style={s.gridWrapper}>
          <Text style={s.hint}>לחץ על תא לנעיצת שומר</Text>
          <ScheduleGrid
            schedule={data.schedule}
            positions={data.positions}
            pins={data.pins}
            onCellPress={handleCellPress}
          />
        </View>
      ) : (
        <View style={s.emptyState}>
          <MaterialCommunityIcons name="calendar-blank" size={64} color={COLORS.border} />
          <Text style={s.emptyTitle}>אין לוח זמנים</Text>
          <Text style={s.emptyText}>
            הוסף שומרים ועמדות בטאבים האחרים, ואז לחץ "צור לוח"
          </Text>
        </View>
      )}

      {/* Pin Modal */}
      {pinModalData && (
        <PinModal
          visible={!!pinModalData}
          slotStart={pinModalData.slotStart}
          positionId={pinModalData.positionId}
          positionName={pinModalData.positionName}
          guards={data.guards}
          existingPin={existingPin}
          onPin={handlePin}
          onUnpin={handleUnpin}
          onClose={() => setPinModalData(null)}
        />
      )}
    </SafeAreaView>
  );
}

function StatChip({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={s.chip}>
      <MaterialCommunityIcons name={icon as any} size={14} color={COLORS.primary} />
      <Text style={s.chipText}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  controls: {
    backgroundColor: COLORS.card, padding: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    elevation: 2,
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  inputLabel: { color: COLORS.muted, marginRight: 8, fontSize: 13, fontWeight: '600' },
  timeInput: {
    flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8,
    padding: 8, fontSize: 14, color: COLORS.text, backgroundColor: COLORS.bg,
  },
  btnBar: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8,
  },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnGenerate: { backgroundColor: COLORS.primary, flex: 1 },
  btnExport: { backgroundColor: COLORS.success },
  btnClear: { backgroundColor: COLORS.danger },

  statsBar: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: '#e8eaf6',
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#fff', paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 12, borderWidth: 1, borderColor: COLORS.border,
  },
  chipText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },

  gridWrapper: { flex: 1 },
  hint: { fontSize: 11, color: COLORS.muted, textAlign: 'center', paddingVertical: 4 },

  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: COLORS.primary },
  emptyText: { fontSize: 15, color: COLORS.muted, textAlign: 'center', lineHeight: 22 },
});
