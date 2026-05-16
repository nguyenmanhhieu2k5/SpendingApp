import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useApp } from '../context/AppContext';
import { COLORS, CAT_CONFIG } from '../utils/constants';
import { formatVND, formatShort } from '../utils/helpers';
import { Card, Button, Input, SectionHeader, ProgressBar } from '../components/UI';
import { Category } from '../types';

const CATS: Category[] = ['food', 'move', 'shop', 'health', 'fun', 'other'];

export function BudgetScreen() {
  const { state, setBudget } = useApp();

  const safeAmt = (v: any): number => (typeof v === 'number' && !isNaN(v) ? v : 0);

  const budgetTotal = safeAmt(state.budget?.total) || 5_000_000;
  const catLimits   = state.budget?.categoryLimits ?? {};

  const [totalInp, setTotalInp] = useState(String(budgetTotal));
  const [catInp, setCatInp] = useState<Record<Category, string>>(
    Object.fromEntries(
      CATS.map(c => [c, String(safeAmt(catLimits[c]) || 0)])
    ) as Record<Category, string>
  );

  const exps = state.transactions.filter(t => t.type === 'exp');
  const totalSpent = exps.reduce((s, t) => s + safeAmt(t.amt), 0);
  const pct = budgetTotal > 0 ? Math.min(totalSpent / budgetTotal, 1) : 0;

  function catSpent(cat: Category) {
    return exps.filter(t => t.cat === cat).reduce((s, t) => s + safeAmt(t.amt), 0);
  }

  async function save() {
    const total = Number(totalInp);
    if (!total || total <= 0) { Alert.alert('Lỗi', 'Ngân sách không hợp lệ'); return; }
    const limits = Object.fromEntries(
      CATS.map(c => [c, Number(catInp[c]) || 0])
    ) as Record<Category, number>;
    await setBudget({ total, categoryLimits: limits });
    Alert.alert('✅ Đã lưu', 'Ngân sách đã cập nhật');
  }

  return (
    <ScrollView style={s.screen} showsVerticalScrollIndicator={false}>
      <View style={s.hdr}>
        <Text style={s.hdrTtl}>Ngân sách</Text>
        <Text style={s.hdrSub}>
          Tháng {new Date().getMonth() + 1}/{new Date().getFullYear()}
        </Text>
      </View>

      <View style={s.body}>
        {/* Overview */}
        <Card style={{ backgroundColor: COLORS.primary }}>
          <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', marginBottom: 4 }}>
            TỔNG NGÂN SÁCH
          </Text>
          <Text style={{ fontSize: 26, fontWeight: '600', color: '#fff' }}>
            {formatVND(budgetTotal)}
          </Text>
          <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 4, marginBottom: 12 }}>
            Đã dùng {formatVND(totalSpent)} · Còn {formatVND(Math.max(budgetTotal - totalSpent, 0))}
          </Text>
          <ProgressBar pct={pct} color="#fff" height={6} />
          {pct > 0.9 && (
            <Text style={{ fontSize: 10, color: '#FFCDD2', fontWeight: '600', marginTop: 6 }}>
              ⚠️ Gần vượt hạn mức!
            </Text>
          )}
        </Card>

        {/* Edit total */}
        <Card>
          <SectionHeader title="Chỉnh ngân sách tổng" />
          <Input
            value={totalInp}
            onChangeText={setTotalInp}
            placeholder="Ngân sách tháng (đ)"
            keyboardType="numeric"
          />
          <Button label="Lưu" onPress={save} />
        </Card>

        {/* Per-category */}
        <Card>
          <SectionHeader title="Hạn mức theo danh mục" />
          {CATS.map(cat => {
            const cfg    = CAT_CONFIG[cat];
            const spent  = catSpent(cat);
            const limit  = safeAmt(catLimits[cat]) || 1;
            const p      = Math.min(spent / limit, 1);
            const color  = p > 0.9 ? COLORS.danger : p > 0.7 ? COLORS.warning : cfg.color;
            return (
              <View key={cat} style={s.catSec}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={[s.catIco, { backgroundColor: cfg.bg }]}>
                    <Text style={{ fontSize: 16 }}>{cfg.icon}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={s.catName}>{cfg.label}</Text>
                      <Text style={{ fontSize: 11, color }}>
                        {formatShort(spent)} / {formatShort(safeAmt(catLimits[cat]))}
                      </Text>
                    </View>
                    <ProgressBar pct={p} color={color} height={5} />
                  </View>
                </View>
                <Input
                  value={catInp[cat]}
                  onChangeText={v => setCatInp(prev => ({ ...prev, [cat]: v }))}
                  placeholder={`Hạn mức ${cfg.label}`}
                  keyboardType="numeric"
                  containerStyle={{ marginTop: 8, marginBottom: 0 }}
                />
              </View>
            );
          })}
          <Button label="Lưu hạn mức" onPress={save} style={{ marginTop: 8 }} />
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
  catSec: { marginBottom: 16, paddingBottom: 16, borderBottomWidth: 0.5, borderColor: '#f0f0f0' },
  catIco: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  catName: { fontSize: 13, fontWeight: '600', color: COLORS.dark },
});
