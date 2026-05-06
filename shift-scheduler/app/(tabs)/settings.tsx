import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '../../src/context/AppContext';
import { HourDifficulty } from '../../src/types';

const COLORS = {
  primary: '#1a237e', accent: '#ff6f00', bg: '#f0f2ff',
  card: '#fff', border: '#c5cae9', text: '#212121', muted: '#757575',
  danger: '#c62828', success: '#2e7d32',
};

export default function SettingsScreen() {
  const { data, updateSettings, exportBackup, importBackup } = useApp();
  const { settings } = data;

  const [shiftDur, setShiftDur] = useState(String(settings.shiftDurationHours));
  const [horizon, setHorizon] = useState(String(settings.horizonHours));
  const [minRest, setMinRest] = useState(String(settings.minRestHours));
  const [hourDiffs, setHourDiffs] = useState<HourDifficulty[]>(settings.hourDifficulties);

  function handleSaveGeneral() {
    const s = parseFloat(shiftDur);
    const h = parseFloat(horizon);
    const r = parseFloat(minRest);
    if (isNaN(s) || s < 1 || s > 24) { Alert.alert('שגיאה', 'משך משמרת: 1-24 שעות'); return; }
    if (isNaN(h) || h < 1) { Alert.alert('שגיאה', 'אופק תכנון חייב להיות חיובי'); return; }
    if (isNaN(r) || r < 0) { Alert.alert('שגיאה', 'מנוחה מינימלית חייבת להיות אי-שלילית'); return; }
    updateSettings({ shiftDurationHours: s, horizonHours: h, minRestHours: r });
    Alert.alert('✅', 'ההגדרות נשמרו!');
  }

  function handleHourDiffChange(hour: number, val: string) {
    const d = parseInt(val);
    if (isNaN(d) || d < 1 || d > 10) return;
    setHourDiffs(prev => prev.map(h => h.hour === hour ? { ...h, difficulty: d } : h));
  }

  function handleSaveHourDiffs() {
    updateSettings({ hourDifficulties: hourDiffs });
    Alert.alert('✅', 'קשיי שעות נשמרו!');
  }

  async function handleImport() {
    Alert.alert(
      'ייבוא גיבוי',
      'פעולה זו תחליף את כל הנתונים הנוכחיים. להמשיך?',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'ייבא',
          onPress: async () => {
            const ok = await importBackup();
            Alert.alert(ok ? '✅ יובא בהצלחה' : '❌ בוטל');
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={s.root} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>

        {/* General Settings */}
        <SectionCard title="⚙️ הגדרות כלליות">
          <SettingRow label="משך משמרת (שעות)">
            <TextInput
              style={s.input}
              value={shiftDur}
              onChangeText={setShiftDur}
              keyboardType="decimal-pad"
            />
          </SettingRow>
          <SettingRow label="אופק תכנון (שעות)">
            <TextInput
              style={s.input}
              value={horizon}
              onChangeText={setHorizon}
              keyboardType="decimal-pad"
            />
          </SettingRow>
          <SettingRow label="מנוחה מינימלית (שעות)">
            <TextInput
              style={s.input}
              value={minRest}
              onChangeText={setMinRest}
              keyboardType="decimal-pad"
            />
          </SettingRow>

          <View style={s.infoBox}>
            <Text style={s.infoText}>
              💡 עם {shiftDur}ש' משמרת ו-{minRest}ש' מנוחה — שומר יכול לעבוד
              כל {parseFloat(shiftDur || '0') + parseFloat(minRest || '0')}ש'.
              לכיסוי {data.positions.length} עמדות צריך לפחות{' '}
              {Math.ceil(data.positions.length * (parseFloat(shiftDur || '0') + parseFloat(minRest || '0')) / parseFloat(shiftDur || '1'))} שומרים.
            </Text>
          </View>

          <TouchableOpacity style={s.saveBtn} onPress={handleSaveGeneral}>
            <Text style={s.saveBtnText}>שמור הגדרות</Text>
          </TouchableOpacity>
        </SectionCard>

        {/* Hour Difficulty */}
        <SectionCard title="🕐 קשיי שעות (1-10)">
          <Text style={s.hint}>קשיי שעות משפיעים על חישוב משקל המשמרת. שעות לילה גבוהות יותר.</Text>
          <View style={s.hourGrid}>
            {hourDiffs.map(hd => (
              <View key={hd.hour} style={s.hourCell}>
                <Text style={s.hourLabel}>{String(hd.hour).padStart(2, '0')}:00</Text>
                <TextInput
                  style={[
                    s.hourInput,
                    hd.difficulty >= 8 && { borderColor: COLORS.danger, backgroundColor: '#fff5f5' },
                    hd.difficulty <= 3 && { borderColor: COLORS.success, backgroundColor: '#f5fff5' },
                  ]}
                  value={String(hd.difficulty)}
                  onChangeText={v => handleHourDiffChange(hd.hour, v)}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
            ))}
          </View>
          <TouchableOpacity style={s.saveBtn} onPress={handleSaveHourDiffs}>
            <Text style={s.saveBtnText}>שמור קשיי שעות</Text>
          </TouchableOpacity>
        </SectionCard>

        {/* Backup */}
        <SectionCard title="💾 גיבוי ושחזור">
          <Text style={s.hint}>ייצוא/ייבוא כל הנתונים: שומרים, עמדות, הגדרות ולוח זמנים.</Text>
          <View style={s.backupRow}>
            <TouchableOpacity style={[s.backupBtn, { backgroundColor: COLORS.primary }]} onPress={exportBackup}>
              <MaterialCommunityIcons name="database-export" size={20} color="#fff" />
              <Text style={s.backupBtnText}>ייצוא JSON</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.backupBtn, { backgroundColor: COLORS.success }]} onPress={handleImport}>
              <MaterialCommunityIcons name="database-import" size={20} color="#fff" />
              <Text style={s.backupBtnText}>ייבוא JSON</Text>
            </TouchableOpacity>
          </View>
        </SectionCard>

        {/* Score Summary */}
        <SectionCard title="📊 סיכום ניקודים">
          {data.guards.length === 0 ? (
            <Text style={s.hint}>אין שומרים במערכת.</Text>
          ) : (
            [...data.guards]
              .sort((a, b) => a.scoreBank - b.scoreBank)
              .map((g, i) => (
                <View key={g.id} style={s.scoreRow}>
                  <Text style={s.scoreRank}>#{i + 1}</Text>
                  <Text style={s.scoreName}>{g.name}</Text>
                  <View style={s.scoreBarWrap}>
                    <View
                      style={[
                        s.scoreBar,
                        {
                          width: `${Math.min(100, (g.scoreBank / Math.max(...data.guards.map(x => x.scoreBank), 1)) * 100)}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={s.scoreVal}>{g.scoreBank.toFixed(1)}</Text>
                </View>
              ))
          )}
        </SectionCard>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={sc.wrap}>
      <Text style={sc.title}>{title}</Text>
      {children}
    </View>
  );
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={sc.row}>
      <Text style={sc.label}>{label}</Text>
      {children}
    </View>
  );
}

const sc = StyleSheet.create({
  wrap: {
    backgroundColor: COLORS.card, borderRadius: 14, padding: 16, marginBottom: 14,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08,
  },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.primary, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  label: { fontSize: 14, color: COLORS.text, flex: 1 },
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: 14, paddingBottom: 40 },

  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6, fontSize: 16,
    color: COLORS.text, backgroundColor: COLORS.bg, minWidth: 80, textAlign: 'center',
  },

  infoBox: {
    backgroundColor: '#e8eaf6', borderRadius: 8, padding: 10, marginBottom: 12,
    borderLeftWidth: 3, borderLeftColor: COLORS.primary,
  },
  infoText: { fontSize: 13, color: COLORS.primary, lineHeight: 18 },

  hint: { fontSize: 13, color: COLORS.muted, marginBottom: 10, lineHeight: 18 },

  saveBtn: {
    backgroundColor: COLORS.primary, borderRadius: 10,
    padding: 12, alignItems: 'center', marginTop: 4,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  hourGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  hourCell: { alignItems: 'center', width: 58 },
  hourLabel: { fontSize: 10, color: COLORS.muted, marginBottom: 2 },
  hourInput: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 6,
    width: 48, height: 36, textAlign: 'center', fontSize: 15,
    fontWeight: '700', color: COLORS.text, backgroundColor: COLORS.bg,
  },

  backupRow: { flexDirection: 'row', gap: 10 },
  backupBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: 12, borderRadius: 10,
  },
  backupBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  scoreRank: { fontSize: 12, color: COLORS.muted, width: 24 },
  scoreName: { fontSize: 14, fontWeight: '600', color: COLORS.text, width: 90 },
  scoreBarWrap: { flex: 1, height: 10, backgroundColor: '#e0e0e0', borderRadius: 5, overflow: 'hidden' },
  scoreBar: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 5 },
  scoreVal: { fontSize: 13, fontWeight: '700', color: COLORS.primary, width: 40, textAlign: 'right' },
});
