import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView, FlatList,
} from 'react-native';
import { Guard, Position, PinnedShift } from '../types';

interface Props {
  visible: boolean;
  slotStart: string;  // ISO string of the slot being pinned
  positionId: string;
  positionName: string;
  guards: Guard[];
  existingPin?: PinnedShift;
  onPin: (guardId: string) => void;
  onUnpin: () => void;
  onClose: () => void;
}

const COLORS = {
  primary: '#1a237e', accent: '#ff6f00', bg: '#f5f5f5',
  card: '#ffffff', border: '#e0e0e0', text: '#212121', muted: '#757575',
  danger: '#c62828',
};

function formatSlot(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('he-IL', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function PinModal({
  visible, slotStart, positionId, positionName, guards, existingPin, onPin, onUnpin, onClose,
}: Props) {
  const [selected, setSelected] = useState<string | null>(existingPin?.guardId ?? null);

  function handleConfirm() {
    if (selected) { onPin(selected); }
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.card}>
          <Text style={s.title}>נעיצת משמרת</Text>
          <Text style={s.subtitle}>{positionName} — {formatSlot(slotStart)}</Text>

          <Text style={s.label}>בחר שומר לנעוץ:</Text>
          <ScrollView style={{ maxHeight: 260 }}>
            {guards.map(g => (
              <TouchableOpacity
                key={g.id}
                style={[s.guardRow, selected === g.id && s.guardRowActive]}
                onPress={() => setSelected(g.id)}
              >
                <Text style={[s.guardName, selected === g.id && s.guardNameActive]}>{g.name}</Text>
                <Text style={[s.guardScore, selected === g.id && s.guardNameActive]}>
                  ניקוד: {g.scoreBank.toFixed(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={s.btnRow}>
            {existingPin && (
              <TouchableOpacity style={[s.btn, s.btnDanger]} onPress={() => { onUnpin(); onClose(); }}>
                <Text style={s.btnSaveText}>הסר נעיצה</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[s.btn, s.btnCancel]} onPress={onClose}>
              <Text style={s.btnCancelText}>ביטול</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, s.btnSave]} onPress={handleConfirm} disabled={!selected}>
              <Text style={s.btnSaveText}>נעץ</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#00000088', justifyContent: 'center', padding: 16 },
  card: { backgroundColor: COLORS.card, borderRadius: 16, padding: 20, maxHeight: '80%' },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.primary, textAlign: 'center' },
  subtitle: { fontSize: 14, color: COLORS.muted, textAlign: 'center', marginBottom: 12 },
  label: { fontSize: 14, color: COLORS.muted, marginBottom: 8 },
  guardRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 12, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border,
    marginBottom: 6, backgroundColor: COLORS.bg,
  },
  guardRowActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  guardName: { fontSize: 16, color: COLORS.text, fontWeight: '600' },
  guardNameActive: { color: '#fff' },
  guardScore: { fontSize: 13, color: COLORS.muted },
  btnRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  btn: { flex: 1, padding: 13, borderRadius: 10, alignItems: 'center' },
  btnCancel: { backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border },
  btnSave: { backgroundColor: COLORS.primary },
  btnDanger: { backgroundColor: COLORS.danger },
  btnCancelText: { color: COLORS.muted, fontWeight: '600' },
  btnSaveText: { color: '#fff', fontWeight: '700' },
});
