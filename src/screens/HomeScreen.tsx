import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useApp } from '../context/AppContext';
import { COLORS, CAT_CONFIG } from '../utils/constants';
import { formatVND, formatShort, formatDateShort } from '../utils/helpers';
import { SectionHeader, ProgressBar, EmptyState } from '../components/UI';
import { Category, MainTabParamList } from '../types';

type Nav = BottomTabNavigationProp<MainTabParamList>;

const CATS: { key: Category | 'all'; label: string }[] = [
  { key: 'all',    label: 'Tất cả' },
  { key: 'food',   label: '🍜 Ăn uống' },
  { key: 'move',   label: '🛵 Di chuyển' },
  { key: 'shop',   label: '🛍 Mua sắm' },
  { key: 'health', label: '💊 Sức khoẻ' },
  { key: 'fun',    label: '🎮 Giải trí' },
  { key: 'other',  label: '📦 Khác' },
];

export function HomeScreen() {
  const { state } = useApp();
  const navigation = useNavigation<Nav>();
  const [filter, setFilter] = useState<Category | 'all'>('all');

  // Guard: ensure amt is always a number
  const safeAmt = (v: any): number => (typeof v === 'number' && !isNaN(v) ? v : 0);

  const exps = state.transactions.filter(t => t.type === 'exp');
  const totalSpent = exps.reduce((s, t) => s + safeAmt(t.amt), 0);
  const budgetTotal = safeAmt(state.budget?.total) || 5_000_000;
  const left = Math.max(budgetTotal - totalSpent, 0);
  const pct  = totalSpent > 0 ? Math.min(totalSpent / budgetTotal, 1) : 0;
  const barColor = pct > 0.9 ? COLORS.danger : pct > 0.7 ? COLORS.warning : '#fff';

  const catSums: Partial<Record<Category, number>> = {};
  exps.forEach(t => {
    if (t.cat) catSums[t.cat] = (catSums[t.cat] ?? 0) + safeAmt(t.amt);
  });
  const topCatEntry = Object.entries(catSums).sort((a, b) => b[1] - a[1])[0];
  const topCat = topCatEntry ? CAT_CONFIG[topCatEntry[0] as Category]?.label : '—';

  const filtered = filter === 'all'
    ? exps
    : exps.filter(t => t.cat === filter);

  return (
    <ScrollView style={s.screen} showsVerticalScrollIndicator={false}>
      {/* Dark topbar */}
      <View style={s.topbar}>
        <View style={s.topRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={s.avatar}>
              <Text style={s.avatarTxt}>{state.user?.avatar ?? 'U'}</Text>
            </View>
            <View>
              <Text style={s.greet}>Xin chào,</Text>
              <Text style={s.uname}>{state.user?.name ?? 'Bạn'}</Text>
            </View>
          </View>
          {state.isSyncing
            ? <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>⟳ Đang sync...</Text>
            : null}
        </View>

        {/* Hero card */}
        <View style={s.hero}>
          <Text style={s.heroLbl}>
            Hũ chi tiêu · Tháng {new Date().getMonth() + 1}
          </Text>
          <Text style={s.heroAmt}>{formatVND(totalSpent)}</Text>
          <Text style={s.heroSub}>
            Còn lại{' '}
            <Text style={{ color: '#C0DD97', fontWeight: '600' }}>{formatVND(left)}</Text>
          </Text>
          <View style={{ marginTop: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={s.progLbl}>{Math.round(pct * 100)}% đã dùng</Text>
              <Text style={s.progLbl}>{formatVND(budgetTotal)}</Text>
            </View>
            <View style={s.progTrack}>
              <View style={[
                s.progFill,
                { width: `${Math.round(pct * 100)}%` as any, backgroundColor: barColor },
              ]} />
            </View>
          </View>
        </View>
      </View>

      <View style={s.body}>
        {/* Quick stats */}
        <View style={s.qsRow}>
          <View style={[s.qs, { borderRightWidth: 0.5, borderColor: '#eee' }]}>
            <Text style={s.qsV}>{exps.length}</Text>
            <Text style={s.qsL}>Giao dịch</Text>
          </View>
          <View style={[s.qs, { borderRightWidth: 0.5, borderColor: '#eee' }]}>
            <Text style={s.qsV}>
              {exps.length ? formatShort(Math.round(totalSpent / exps.length)) : '—'}
            </Text>
            <Text style={s.qsL}>Trung bình</Text>
          </View>
          <View style={s.qs}>
            <Text style={[s.qsV, { color: COLORS.primary }]}>{topCat}</Text>
            <Text style={s.qsL}>Lớn nhất</Text>
          </View>
        </View>

        {/* Filter pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          {CATS.map(c => (
            <TouchableOpacity
              key={c.key}
              style={[s.pill, filter === c.key && s.pillOn]}
              onPress={() => setFilter(c.key)}
            >
              <Text style={[s.pillTxt, filter === c.key && s.pillTxtOn]}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Transactions */}
        <SectionHeader
          title="Giao dịch gần đây"
          actionLabel="+ Thêm"
          onAction={() => navigation.navigate('Add')}
        />

        {filtered.length === 0
          ? <EmptyState icon="🧾" message="Chưa có giao dịch nào" />
          : filtered.slice(0, 15).map(txn => {
              const cfg = CAT_CONFIG[txn.cat] ?? CAT_CONFIG.other;
              const amt = safeAmt(txn.amt);
              return (
                <View key={txn.id} style={s.txn}>
                  <View style={[s.txnIco, { backgroundColor: cfg.bg }]}>
                    <Text style={{ fontSize: 18 }}>{cfg.icon}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.txnName} numberOfLines={1}>{txn.name || '—'}</Text>
                    <Text style={s.txnMeta}>
                      {cfg.label} · {txn.date || formatDateShort(txn.timestamp)}
                    </Text>
                  </View>
                  <Text style={[
                    s.txnAmt,
                    { color: txn.type === 'inc' ? COLORS.success : COLORS.danger },
                  ]}>
                    {txn.type === 'inc' ? '+' : '-'}{formatShort(amt)}
                  </Text>
                </View>
              );
            })
        }
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  topbar: { backgroundColor: COLORS.dark, paddingBottom: 24 },
  topRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, paddingBottom: 0,
  },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  avatarTxt: { color: '#fff', fontSize: 13, fontWeight: '600' },
  greet: { fontSize: 11, color: 'rgba(255,255,255,0.5)' },
  uname: { fontSize: 15, fontWeight: '600', color: '#fff' },
  hero: {
    backgroundColor: COLORS.primary, marginHorizontal: 16,
    marginTop: 16, borderRadius: 20, padding: 18,
  },
  heroLbl: {
    fontSize: 10, color: 'rgba(255,255,255,0.65)',
    textTransform: 'uppercase', letterSpacing: 0.05, marginBottom: 4,
  },
  heroAmt: { fontSize: 30, fontWeight: '500', color: '#fff', letterSpacing: -0.5 },
  heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  progLbl: { fontSize: 10, color: 'rgba(255,255,255,0.6)' },
  progTrack: { height: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, overflow: 'hidden' },
  progFill: { height: 5, borderRadius: 3 },
  body: { padding: 16 },
  qsRow: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderRadius: 16, marginBottom: 16, overflow: 'hidden',
  },
  qs: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  qsV: { fontSize: 14, fontWeight: '600', color: COLORS.dark },
  qsL: { fontSize: 10, color: COLORS.textMuted, marginTop: 3 },
  pill: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#fff', marginRight: 8,
    borderWidth: 1.5, borderColor: '#eee',
  },
  pillOn: { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary },
  pillTxt: { fontSize: 12, fontWeight: '500', color: '#888' },
  pillTxtOn: { color: COLORS.primaryDark },
  txn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 14, padding: 12, marginBottom: 8,
  },
  txnIco: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  txnName: { fontSize: 14, fontWeight: '500', color: COLORS.dark },
  txnMeta: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  txnAmt: { fontSize: 14, fontWeight: '600' },
});
