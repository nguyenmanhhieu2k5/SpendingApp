import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useApp } from '../context/AppContext';
import { COLORS, CAT_CONFIG } from '../utils/constants';
import { formatVND, formatShort, getLast7Days } from '../utils/helpers';
import { Card, SectionHeader, ProgressBar } from '../components/UI';
import { Category } from '../types';

export function StatsScreen() {
  const { state } = useApp();

  const safeAmt = (v: any): number => (typeof v === 'number' && !isNaN(v) ? v : 0);

  const exps  = state.transactions.filter(t => t.type === 'exp');
  const inc   = state.transactions.filter(t => t.type === 'inc').reduce((s, t) => s + safeAmt(t.amt), 0);
  const total = exps.reduce((s, t) => s + safeAmt(t.amt), 0);

  const catSums = useMemo(() => {
    const m: Partial<Record<Category, number>> = {};
    exps.forEach(t => {
      if (t.cat) m[t.cat] = (m[t.cat] ?? 0) + safeAmt(t.amt);
    });
    return Object.entries(m).sort((a, b) => b[1] - a[1]) as [Category, number][];
  }, [exps]);

  const maxCat = catSums[0]?.[1] ?? 1;

  const dayLabels = getLast7Days();
  const dayData = useMemo(() => {
    const arr = Array(7).fill(0);
    const now = Date.now();
    exps.forEach(t => {
      const ts = t.timestamp ?? 0;
      const diff = Math.floor((now - ts) / 86400000);
      if (diff >= 0 && diff < 7) arr[6 - diff] += safeAmt(t.amt);
    });
    return arr;
  }, [exps]);

  const maxDay = Math.max(...dayData, 1);

  function exportCSV() {
    if (!exps.length) { Alert.alert('Chưa có dữ liệu'); return; }
    Alert.alert('Xuất CSV', `${exps.length} giao dịch sẵn sàng.\nTrong app thực tế sẽ lưu vào Downloads.`);
  }

  return (
    <ScrollView style={s.screen} showsVerticalScrollIndicator={false}>
      <View style={s.hdr}>
        <Text style={s.hdrTtl}>Thống kê</Text>
        <Text style={s.hdrSub}>
          Tháng {new Date().getMonth() + 1}/{new Date().getFullYear()}
        </Text>
      </View>

      <View style={s.body}>
        {/* Summary cards */}
        <View style={s.summRow}>
          {[
            { icon: '💸', val: formatShort(total), lbl: 'Tổng chi', bg: '#FFF0F0', c: COLORS.danger },
            { icon: '💰', val: formatShort(inc),   lbl: 'Tổng thu', bg: '#EDFAF3', c: COLORS.success },
            { icon: '💼', val: formatShort(inc - total), lbl: 'Tiết kiệm', bg: COLORS.primaryLight, c: COLORS.primary },
          ].map((it, i) => (
            <View key={i} style={[s.summCard, { backgroundColor: it.bg }]}>
              <Text style={{ fontSize: 20, marginBottom: 4 }}>{it.icon}</Text>
              <Text style={[s.summVal, { color: it.c }]}>{it.val}</Text>
              <Text style={s.summLbl}>{it.lbl}</Text>
            </View>
          ))}
        </View>

        {/* 7-day bar chart */}
        <Card>
          <SectionHeader title="Chi tiêu 7 ngày gần nhất" />
          <View style={s.chart}>
            {dayData.map((val, i) => (
              <View key={i} style={s.barCol}>
                <Text style={s.barVal}>{val > 0 ? formatShort(val) : ''}</Text>
                <View style={s.barTrack}>
                  <View style={[
                    s.barFill,
                    {
                      height: `${Math.round((val / maxDay) * 100)}%` as any,
                      backgroundColor: i === dayData.length - 1 ? COLORS.primary : COLORS.primaryLight,
                    },
                  ]} />
                </View>
                <Text style={s.barLbl}>{dayLabels[i]}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Category breakdown */}
        <Card>
          <SectionHeader title="Theo danh mục" />
          {catSums.length === 0
            ? <Text style={{ color: COLORS.textMuted, textAlign: 'center', paddingVertical: 12 }}>
                Chưa có dữ liệu
              </Text>
            : catSums.map(([cat, val]) => {
                const cfg = CAT_CONFIG[cat] ?? CAT_CONFIG.other;
                const pctOfTotal = total > 0 ? val / total : 0;
                return (
                  <View key={cat} style={s.catRow}>
                    <View style={[s.catIco, { backgroundColor: cfg.bg }]}>
                      <Text style={{ fontSize: 14 }}>{cfg.icon}</Text>
                    </View>
                    <View style={{ flex: 1, gap: 4 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={s.catName}>{cfg.label}</Text>
                        <Text style={s.catAmt}>{formatShort(val)}</Text>
                      </View>
                      <ProgressBar pct={maxCat > 0 ? val / maxCat : 0} color={cfg.color} height={5} />
                    </View>
                    <Text style={s.catPct}>{Math.round(pctOfTotal * 100)}%</Text>
                  </View>
                );
              })
          }
        </Card>

        {/* Export */}
        <Card>
          <SectionHeader title="Xuất báo cáo" />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity style={[s.expBtn, { flex: 1 }]} onPress={exportCSV}>
              <Text style={s.expTxt}>📄 Xuất CSV</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.expBtn, { flex: 1 }]}
              onPress={() => Alert.alert('PDF', 'Tính năng sẽ có trong phiên bản tiếp theo.')}
            >
              <Text style={s.expTxt}>📋 Xuất PDF</Text>
            </TouchableOpacity>
          </View>
        </Card>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  hdr: { backgroundColor: COLORS.dark, padding: 20, paddingTop: 56, paddingBottom: 28 },
  hdrTtl: { fontSize: 22, fontWeight: '700', color: '#fff' },
  hdrSub: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  body: { padding: 16 },
  summRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  summCard: { flex: 1, borderRadius: 16, padding: 12, alignItems: 'center' },
  summVal: { fontSize: 15, fontWeight: '700', color: COLORS.dark },
  summLbl: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
  chart: { flexDirection: 'row', height: 140, alignItems: 'flex-end', gap: 6 },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  barVal: { fontSize: 8, color: COLORS.textMuted, textAlign: 'center' },
  barTrack: {
    flex: 1, width: '100%',
    backgroundColor: '#f0f0f5', borderRadius: 6,
    justifyContent: 'flex-end', overflow: 'hidden',
  },
  barFill: { width: '100%', borderRadius: 6 },
  barLbl: { fontSize: 10, color: COLORS.textMuted },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  catIco: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  catName: { fontSize: 12, fontWeight: '500', color: COLORS.dark },
  catAmt: { fontSize: 12, fontWeight: '600', color: COLORS.dark },
  catPct: { fontSize: 11, color: COLORS.textMuted, width: 34, textAlign: 'right' },
  expBtn: { backgroundColor: COLORS.bg, borderRadius: 12, padding: 12, alignItems: 'center' },
  expTxt: { fontSize: 13, fontWeight: '500', color: COLORS.dark },
});
