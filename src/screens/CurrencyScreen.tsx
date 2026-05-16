import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, TextInput, Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../context/AppContext';
import { COLORS } from '../utils/constants';
import { RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// ─── Supported currencies ─────────────────────────────────────────────────────
const CURRENCIES = [
  { code: 'VND', name: 'Việt Nam Đồng', flag: '🇻🇳', symbol: '₫' },
  { code: 'USD', name: 'US Dollar',      flag: '🇺🇸', symbol: '$' },
  { code: 'EUR', name: 'Euro',           flag: '🇪🇺', symbol: '€' },
  { code: 'JPY', name: 'Japanese Yen',   flag: '🇯🇵', symbol: '¥' },
  { code: 'KRW', name: 'Korean Won',     flag: '🇰🇷', symbol: '₩' },
  { code: 'THB', name: 'Thai Baht',      flag: '🇹🇭', symbol: '฿' },
  { code: 'CNY', name: 'Chinese Yuan',   flag: '🇨🇳', symbol: '¥' },
  { code: 'SGD', name: 'Singapore Dollar', flag: '🇸🇬', symbol: 'S$' },
  { code: 'GBP', name: 'British Pound',  flag: '🇬🇧', symbol: '£' },
  { code: 'AUD', name: 'Australian Dollar', flag: '🇦🇺', symbol: 'A$' },
];

interface RateMap { [currency: string]: number }
interface RateState {
  rates: RateMap;
  base: string;
  lastUpdated: string;
  loading: boolean;
  error: string | null;
}

// ─── Free exchange rate API (no key needed) ───────────────────────────────────
const RATE_API = 'https://open.er-api.com/v6/latest/VND';

export function CurrencyScreen({ navigation }: { navigation: Nav }) {
  const { state, dispatch } = useApp();

  const activeCurrency = (state as any).currency ?? 'VND';

  const [rateState, setRateState] = useState<RateState>({
    rates: {}, base: 'VND', lastUpdated: '',
    loading: true, error: null,
  });
  const [amount, setAmount] = useState('1000000');
  const [search, setSearch] = useState('');

  // ── Fetch live rates ────────────────────────────────────────────────────────
  const fetchRates = useCallback(async () => {
    setRateState(r => ({ ...r, loading: true, error: null }));
    try {
      const res  = await fetch(RATE_API, { signal: AbortSignal.timeout(8000) });
      const json = await res.json();
      if (json.result !== 'success') throw new Error('API error');
      setRateState({
        rates: json.rates as RateMap,
        base: 'VND',
        lastUpdated: new Date().toLocaleString('vi-VN'),
        loading: false,
        error: null,
      });
    } catch (e: any) {
      // Fallback static rates if network fails
      setRateState({
        rates: { VND:1, USD:0.0000403, EUR:0.0000372, JPY:0.00607, KRW:0.0539, THB:0.00143, CNY:0.000292, SGD:0.0000543, GBP:0.0000318, AUD:0.0000619 },
        base: 'VND',
        lastUpdated: 'Tỷ giá tạm thời (offline)',
        loading: false,
        error: 'Không lấy được tỷ giá thực. Đang dùng tỷ giá gần nhất.',
      });
    }
  }, []);

  useEffect(() => { fetchRates(); }, []);

  // ── Convert VND → target ────────────────────────────────────────────────────
  function convert(targetCode: string): string {
    const base  = Number(amount.replace(/[^0-9.]/g, '')) || 0;
    const rate  = rateState.rates[targetCode];
    if (!rate) return '—';
    const result = base * rate;
    if (targetCode === 'VND') return result.toLocaleString('vi-VN');
    if (result >= 1000) return result.toLocaleString('en-US', { maximumFractionDigits: 2 });
    return result.toFixed(4);
  }

  function selectCurrency(code: string) {
    dispatch({ type: 'UPDATE_USER', payload: {} }); // trigger save
    // Store currency preference in a simple way
    (state as any).currency = code;
    // Proper way: add currency to AppState — dispatching custom action
    dispatch({ type: 'SET_CURRENCY' as any, payload: code });
    Alert.alert('✅ Đã chọn', `Đơn vị tiền tệ: ${code}`, [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  }

  const filtered = CURRENCIES.filter(c =>
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const inputAmt = Number(amount.replace(/[^0-9]/g, '')) || 0;

  return (
    <View style={s.screen}>
      {/* Header */}
      <View style={s.hdr}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
          <Text style={s.backTxt}>←</Text>
        </TouchableOpacity>
        <Text style={s.hdrTtl}>Đơn vị tiền tệ</Text>
        <TouchableOpacity onPress={fetchRates} style={s.refreshBtn}>
          <Text style={{ fontSize: 18 }}>{rateState.loading ? '⏳' : '🔄'}</Text>
        </TouchableOpacity>
      </View>

      {/* Converter */}
      <View style={s.converterCard}>
        <Text style={s.converterLabel}>Nhập số VND để quy đổi</Text>
        <View style={s.converterInput}>
          <Text style={s.currencyPrefix}>₫</Text>
          <TextInput
            style={s.amountInput}
            value={inputAmt > 0 ? inputAmt.toLocaleString('vi-VN') : ''}
            onChangeText={t => setAmount(t.replace(/[^0-9]/g, ''))}
            keyboardType="numeric"
            placeholder="1.000.000"
            placeholderTextColor={COLORS.textMuted}
          />
        </View>
        {rateState.error && (
          <Text style={s.errorTxt}>⚠️ {rateState.error}</Text>
        )}
        <Text style={s.updatedTxt}>
          Cập nhật: {rateState.lastUpdated || '—'}
        </Text>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <TextInput
          style={s.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="🔍  Tìm tiền tệ..."
          placeholderTextColor={COLORS.textMuted}
        />
      </View>

      {/* Rate list */}
      {rateState.loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={{ color: COLORS.textMuted, fontSize: 13 }}>Đang tải tỷ giá thực...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.code}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          renderItem={({ item }) => {
            const isActive = activeCurrency === item.code;
            const converted = convert(item.code);
            const rate = rateState.rates[item.code];
            return (
              <TouchableOpacity
                style={[s.rateItem, isActive && s.rateItemActive]}
                onPress={() => selectCurrency(item.code)}
                activeOpacity={0.75}
              >
                <Text style={s.flag}>{item.flag}</Text>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={s.code}>{item.code}</Text>
                    {isActive && (
                      <View style={s.activeBadge}>
                        <Text style={s.activeBadgeTxt}>Đang dùng</Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.currName}>{item.name}</Text>
                  {rate && (
                    <Text style={s.rateSmall}>
                      1 VND = {item.code === 'VND' ? '1' : rate.toFixed(6)} {item.code}
                    </Text>
                  )}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={s.convertedAmt}>
                    {item.symbol}{converted}
                  </Text>
                  <Text style={s.convertedLbl}>={inputAmt.toLocaleString('vi-VN')}₫</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  hdr: {
    backgroundColor: COLORS.dark, padding: 20, paddingTop: 56,
    paddingBottom: 20, flexDirection: 'row', alignItems: 'center',
  },
  back: { marginRight: 12 },
  backTxt: { color: 'rgba(255,255,255,0.7)', fontSize: 20 },
  hdrTtl: { flex: 1, fontSize: 20, fontWeight: '700', color: '#fff' },
  refreshBtn: { padding: 4 },
  converterCard: {
    backgroundColor: COLORS.primary, margin: 16, borderRadius: 20, padding: 18,
  },
  converterLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 10 },
  converterInput: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  currencyPrefix: { fontSize: 22, color: '#fff', marginRight: 8, fontWeight: '500' },
  amountInput: {
    flex: 1, fontSize: 26, fontWeight: '600', color: '#fff',
  },
  errorTxt: { fontSize: 11, color: '#FFCDD2', marginTop: 8 },
  updatedTxt: { fontSize: 10, color: 'rgba(255,255,255,0.55)', marginTop: 6 },
  searchWrap: { paddingHorizontal: 16, paddingBottom: 4 },
  searchInput: {
    backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 10, fontSize: 14, color: COLORS.dark,
  },
  rateItem: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 2, borderColor: 'transparent',
  },
  rateItemActive: {
    borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight,
  },
  flag: { fontSize: 28 },
  code: { fontSize: 16, fontWeight: '700', color: COLORS.dark },
  activeBadge: {
    backgroundColor: COLORS.primary, borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  activeBadgeTxt: { fontSize: 10, color: '#fff', fontWeight: '600' },
  currName: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  rateSmall: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
  convertedAmt: { fontSize: 16, fontWeight: '700', color: COLORS.dark },
  convertedLbl: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
});
