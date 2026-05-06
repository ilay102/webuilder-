import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '../../src/context/AppContext';
import { Guard, Position } from '../../src/types';
import GuardModal from '../../src/components/GuardModal';
import PositionModal from '../../src/components/PositionModal';

const COLORS = {
  primary: '#1a237e', accent: '#ff6f00', bg: '#f0f2ff',
  card: '#fff', border: '#c5cae9', text: '#212121', muted: '#757575',
  danger: '#c62828', success: '#2e7d32',
};

type Tab = 'guards' | 'positions';

export default function GuardsScreen() {
  const { data, addGuard, updateGuard, removeGuard, addPosition, updatePosition, removePosition } = useApp();
  const [tab, setTab] = useState<Tab>('guards');
  const [guardModal, setGuardModal] = useState<{ visible: boolean; guard?: Guard }>({ visible: false });
  const [positionModal, setPositionModal] = useState<{ visible: boolean; position?: Position }>({ visible: false });

  // ─── Guards ───────────────────────────────────────────────────────────────

  function handleSaveGuard(d: Partial<Guard> & { name: string }) {
    if (guardModal.guard) {
      updateGuard({ ...guardModal.guard, ...d });
    } else {
      addGuard(d.name);
      // If departure info provided, update the guard right after adding
      if (d.departureTime) {
        // find newly added guard (last one)
        setTimeout(() => {
          const updated = data.guards[data.guards.length - 1];
          if (updated) updateGuard({ ...updated, ...d });
        }, 50);
      }
    }
  }

  function confirmRemoveGuard(guard: Guard) {
    Alert.alert('מחיקת שומר', `למחוק את ${guard.name}?`, [
      { text: 'ביטול', style: 'cancel' },
      { text: 'מחק', style: 'destructive', onPress: () => removeGuard(guard.id) },
    ]);
  }

  // ─── Positions ────────────────────────────────────────────────────────────

  function handleSavePosition(d: { name: string; difficulty: number }) {
    if (positionModal.position) {
      updatePosition({ ...positionModal.position, ...d });
    } else {
      addPosition(d.name, d.difficulty);
    }
  }

  function confirmRemovePosition(pos: Position) {
    Alert.alert('מחיקת עמדה', `למחוק את "${pos.name}"?`, [
      { text: 'ביטול', style: 'cancel' },
      { text: 'מחק', style: 'destructive', onPress: () => removePosition(pos.id) },
    ]);
  }

  function formatDeparture(guard: Guard): string {
    if (!guard.departureTime) return '';
    const dep = new Date(guard.departureTime);
    const ret = guard.returnTime ? new Date(guard.returnTime) : null;
    const depStr = dep.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    const retStr = ret ? ret.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' }) : '?';
    return `✈️ יציאה: ${depStr} → חזרה: ${retStr}`;
  }

  const sortedGuards = [...data.guards].sort((a, b) => a.scoreBank - b.scoreBank);

  return (
    <SafeAreaView style={s.root} edges={['bottom']}>
      {/* Tab switcher */}
      <View style={s.tabBar}>
        <TouchableOpacity
          style={[s.tab, tab === 'guards' && s.tabActive]}
          onPress={() => setTab('guards')}
        >
          <MaterialCommunityIcons
            name="account-group"
            size={18}
            color={tab === 'guards' ? '#fff' : COLORS.muted}
          />
          <Text style={[s.tabText, tab === 'guards' && s.tabTextActive]}>
            שומרים ({data.guards.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tab, tab === 'positions' && s.tabActive]}
          onPress={() => setTab('positions')}
        >
          <MaterialCommunityIcons
            name="map-marker-multiple"
            size={18}
            color={tab === 'positions' ? '#fff' : COLORS.muted}
          />
          <Text style={[s.tabText, tab === 'positions' && s.tabTextActive]}>
            עמדות ({data.positions.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Guards list */}
      {tab === 'guards' && (
        <>
          <FlatList
            data={sortedGuards}
            keyExtractor={g => g.id}
            contentContainerStyle={s.list}
            ListEmptyComponent={<EmptyState text="אין שומרים. לחץ + להוספה." />}
            renderItem={({ item: guard, index }) => (
              <View style={s.card}>
                <View style={s.cardRank}>
                  <Text style={s.rankNum}>{index + 1}</Text>
                </View>
                <View style={s.cardBody}>
                  <Text style={s.cardName}>{guard.name}</Text>
                  <Text style={s.cardScore}>בנק ניקוד: {guard.scoreBank.toFixed(1)}</Text>
                  {guard.departureTime && (
                    <Text style={s.cardDep}>{formatDeparture(guard)}</Text>
                  )}
                  {guard.lastShiftEnd && (
                    <Text style={s.cardLast}>
                      סוף משמרת אחרון: {new Date(guard.lastShiftEnd).toLocaleString('he-IL')}
                    </Text>
                  )}
                </View>
                <View style={s.cardActions}>
                  <TouchableOpacity
                    style={s.iconBtn}
                    onPress={() => setGuardModal({ visible: true, guard })}
                  >
                    <MaterialCommunityIcons name="pencil" size={20} color={COLORS.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.iconBtn}
                    onPress={() => confirmRemoveGuard(guard)}
                  >
                    <MaterialCommunityIcons name="delete" size={20} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
          <TouchableOpacity style={s.fab} onPress={() => setGuardModal({ visible: true })}>
            <MaterialCommunityIcons name="plus" size={28} color="#fff" />
          </TouchableOpacity>
        </>
      )}

      {/* Positions list */}
      {tab === 'positions' && (
        <>
          <FlatList
            data={data.positions}
            keyExtractor={p => p.id}
            contentContainerStyle={s.list}
            ListEmptyComponent={<EmptyState text="אין עמדות. לחץ + להוספה." />}
            renderItem={({ item: pos }) => (
              <View style={s.card}>
                <View style={[s.cardRank, { backgroundColor: COLORS.accent }]}>
                  <Text style={s.rankNum}>{pos.difficulty}</Text>
                  <Text style={[s.rankNum, { fontSize: 9 }]}>קושי</Text>
                </View>
                <View style={s.cardBody}>
                  <Text style={s.cardName}>{pos.name}</Text>
                  <Text style={s.cardScore}>רמת קושי: {pos.difficulty}/10</Text>
                </View>
                <View style={s.cardActions}>
                  <TouchableOpacity
                    style={s.iconBtn}
                    onPress={() => setPositionModal({ visible: true, position: pos })}
                  >
                    <MaterialCommunityIcons name="pencil" size={20} color={COLORS.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.iconBtn}
                    onPress={() => confirmRemovePosition(pos)}
                  >
                    <MaterialCommunityIcons name="delete" size={20} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
          <TouchableOpacity style={s.fab} onPress={() => setPositionModal({ visible: true })}>
            <MaterialCommunityIcons name="plus" size={28} color="#fff" />
          </TouchableOpacity>
        </>
      )}

      <GuardModal
        visible={guardModal.visible}
        guard={guardModal.guard}
        onSave={handleSaveGuard}
        onClose={() => setGuardModal({ visible: false })}
      />
      <PositionModal
        visible={positionModal.visible}
        position={positionModal.position}
        onSave={handleSavePosition}
        onClose={() => setPositionModal({ visible: false })}
      />
    </SafeAreaView>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <View style={{ alignItems: 'center', padding: 40 }}>
      <MaterialCommunityIcons name="inbox-outline" size={48} color={COLORS.border} />
      <Text style={{ color: COLORS.muted, marginTop: 12, fontSize: 15 }}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  tabBar: { flexDirection: 'row', backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12,
  },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: COLORS.muted },
  tabTextActive: { color: '#fff' },

  list: { padding: 12, gap: 10, paddingBottom: 90 },
  card: {
    flexDirection: 'row', backgroundColor: COLORS.card, borderRadius: 12,
    overflow: 'hidden', elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3,
  },
  cardRank: {
    width: 48, backgroundColor: COLORS.primary, alignItems: 'center',
    justifyContent: 'center',
  },
  rankNum: { color: '#fff', fontWeight: '800', fontSize: 16 },
  cardBody: { flex: 1, padding: 12 },
  cardName: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  cardScore: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  cardDep: { fontSize: 12, color: COLORS.accent, marginTop: 4 },
  cardLast: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  cardActions: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, gap: 4 },
  iconBtn: { padding: 8, borderRadius: 8 },

  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center',
    elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 4,
  },
});
