import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Position } from '../types';

interface Props {
  visible: boolean;
  position?: Position;
  onSave: (data: { name: string; difficulty: number }) => void;
  onClose: () => void;
}

const COLORS = {
  primary: '#1a237e', accent: '#ff6f00', bg: '#f5f5f5',
  card: '#ffffff', border: '#e0e0e0', text: '#212121', muted: '#757575',
};

export default function PositionModal({ visible, position, onSave, onClose }: Props) {
  const [name, setName] = useState('');
  const [difficulty, setDifficulty] = useState(5);

  useEffect(() => {
    if (position) {
      setName(position.name);
      setDifficulty(position.difficulty);
    } else {
      setName(''); setDifficulty(5);
    }
  }, [position, visible]);

  function handleSave() {
    if (!name.trim()) return;
    onSave({ name: name.trim(), difficulty });
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.card}>
          <Text style={s.title}>{position ? 'עריכת עמדה' : 'הוספת עמדה'}</Text>

          <Text style={s.label}>שם העמדה *</Text>
          <TextInput
            style={s.input}
            value={name}
            onChangeText={setName}
            placeholder="למשל: שער ראשי"
            placeholderTextColor={COLORS.muted}
          />

          <Text style={s.label}>רמת קושי: {difficulty}/10</Text>
          <View style={s.diffRow}>
            {[1,2,3,4,5,6,7,8,9,10].map(d => (
              <TouchableOpacity
                key={d}
                style={[s.diffBtn, difficulty === d && s.diffBtnActive]}
                onPress={() => setDifficulty(d)}
              >
                <Text style={[s.diffText, difficulty === d && s.diffTextActive]}>{d}</Text>
              </TouchableOpacity>
            ))}
          </View>

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
  card: { backgroundColor: COLORS.card, borderRadius: 16, padding: 20 },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.primary, marginBottom: 16, textAlign: 'center' },
  label: { fontSize: 14, color: COLORS.muted, marginTop: 12, marginBottom: 4 },
  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 8,
    padding: 10, fontSize: 16, color: COLORS.text, backgroundColor: COLORS.bg,
  },
  diffRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  diffBtn: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 1,
    borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.bg,
  },
  diffBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  diffText: { color: COLORS.text, fontWeight: '600' },
  diffTextActive: { color: '#fff' },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  btn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
  btnCancel: { backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border },
  btnSave: { backgroundColor: COLORS.primary },
  btnCancelText: { color: COLORS.muted, fontWeight: '600' },
  btnSaveText: { color: '#fff', fontWeight: '700' },
});
