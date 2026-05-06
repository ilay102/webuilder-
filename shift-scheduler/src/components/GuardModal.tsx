import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Switch, Platform,
} from 'react-native';
import { Guard } from '../types';

interface Props {
  visible: boolean;
  guard?: Guard;
  onSave: (data: Partial<Guard> & { name: string }) => void;
  onClose: () => void;
}

const COLORS = {
  primary: '#1a237e',
  accent: '#ff6f00',
  bg: '#f5f5f5',
  card: '#ffffff',
  border: '#e0e0e0',
  text: '#212121',
  muted: '#757575',
  danger: '#c62828',
};

export default function GuardModal({ visible, guard, onSave, onClose }: Props) {
  const [name, setName] = useState('');
  const [scoreBank, setScoreBank] = useState('0');
  const [hasDeparture, setHasDeparture] = useState(false);
  const [depDate, setDepDate] = useState('');
  const [depHour, setDepHour] = useState('');
  const [returnDays, setReturnDays] = useState('4');

  useEffect(() => {
    if (guard) {
      setName(guard.name);
      setScoreBank(String(guard.scoreBank));
      if (guard.departureTime) {
        setHasDeparture(true);
        const d = new Date(guard.departureTime);
        setDepDate(
          `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
        );
        setDepHour(`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`);
        if (guard.returnTime) {
          const diff = (new Date(guard.returnTime).getTime() - new Date(guard.departureTime).getTime()) / 86400_000;
          setReturnDays(String(Math.round(diff)));
        }
      } else {
        setHasDeparture(false);
        setDepDate(''); setDepHour(''); setReturnDays('4');
      }
    } else {
      setName(''); setScoreBank('0');
      setHasDeparture(false); setDepDate(''); setDepHour(''); setReturnDays('4');
    }
  }, [guard, visible]);

  function parseDeparture(): { departureTime?: string; returnTime?: string } {
    if (!hasDeparture || !depDate || !depHour) return {};
    const [day, month, year] = depDate.split('/').map(Number);
    const [hour, minute] = depHour.split(':').map(Number);
    if (isNaN(day) || isNaN(month) || isNaN(year) || isNaN(hour) || isNaN(minute)) return {};
    const dep = new Date(year, month - 1, day, hour, minute);
    const ret = new Date(dep.getTime() + Number(returnDays) * 86400_000);
    return { departureTime: dep.toISOString(), returnTime: ret.toISOString() };
  }

  function handleSave() {
    if (!name.trim()) return;
    const dep = parseDeparture();
    onSave({
      name: name.trim(),
      scoreBank: parseFloat(scoreBank) || 0,
      ...dep,
    });
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.card}>
          <Text style={s.title}>{guard ? 'עריכת שומר' : 'הוספת שומר'}</Text>
          <ScrollView showsVerticalScrollIndicator={false}>

            <Text style={s.label}>שם *</Text>
            <TextInput
              style={s.input}
              value={name}
              onChangeText={setName}
              placeholder="שם השומר"
              placeholderTextColor={COLORS.muted}
            />

            <Text style={s.label}>בנק ניקוד</Text>
            <TextInput
              style={s.input}
              value={scoreBank}
              onChangeText={setScoreBank}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={COLORS.muted}
            />

            <View style={s.row}>
              <Text style={s.label}>יש יציאה מתוכננת</Text>
              <Switch
                value={hasDeparture}
                onValueChange={setHasDeparture}
                thumbColor={hasDeparture ? COLORS.accent : '#ccc'}
                trackColor={{ true: COLORS.primary + '80', false: '#ccc' }}
              />
            </View>

            {hasDeparture && (
              <>
                <Text style={s.label}>תאריך יציאה (DD/MM/YYYY)</Text>
                <TextInput
                  style={s.input}
                  value={depDate}
                  onChangeText={setDepDate}
                  placeholder="31/12/2024"
                  placeholderTextColor={COLORS.muted}
                  keyboardType="numbers-and-punctuation"
                />
                <Text style={s.label}>שעת יציאה (HH:MM)</Text>
                <TextInput
                  style={s.input}
                  value={depHour}
                  onChangeText={setDepHour}
                  placeholder="08:00"
                  placeholderTextColor={COLORS.muted}
                  keyboardType="numbers-and-punctuation"
                />
                <Text style={s.label}>ימי היעדרות</Text>
                <TextInput
                  style={s.input}
                  value={returnDays}
                  onChangeText={setReturnDays}
                  keyboardType="number-pad"
                  placeholder="4"
                  placeholderTextColor={COLORS.muted}
                />
              </>
            )}
          </ScrollView>

          <View style={s.btnRow}>
            <TouchableOpacity style={[s.btn, s.btnCancel]} onPress={onClose}>
              <Text style={s.btnCancelText}>ביטול</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, s.btnSave]} onPress={handleSave}>
              <Text style={s.btnSaveText}>שמור</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#00000088', justifyContent: 'center', padding: 16 },
  card: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 20,
    maxHeight: '90%',
  },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.primary, marginBottom: 16, textAlign: 'center' },
  label: { fontSize: 14, color: COLORS.muted, marginTop: 12, marginBottom: 4 },
  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 8,
    padding: 10, fontSize: 16, color: COLORS.text, backgroundColor: COLORS.bg,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  btn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
  btnCancel: { backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border },
  btnSave: { backgroundColor: COLORS.primary },
  btnCancelText: { color: COLORS.muted, fontWeight: '600' },
  btnSaveText: { color: '#fff', fontWeight: '700' },
});
