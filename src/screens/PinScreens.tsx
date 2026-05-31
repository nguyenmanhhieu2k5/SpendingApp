import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Alert, Vibration, Platform,
  InteractionManager,
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useApp } from '../context/AppContext';
import { COLORS } from '../utils/constants';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const PIN_LEN = 6;
const DIALPAD = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

// ─── Sinh trắc học ────────────────────────────────────────────────────────────
async function getBioInfo() {
  try {
    const has      = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!has || !enrolled) return null;
    const types   = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const hasFace = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
    return { icon: hasFace ? '👁' : '👆', label: hasFace ? 'Face ID' : 'Vân tay' };
  } catch { return null; }
}

async function promptBio(label: string): Promise<boolean> {
  try {
    const r = await LocalAuthentication.authenticateAsync({
      promptMessage: `Xác nhận bằng ${label}`,
      cancelLabel: 'Huỷ',
      fallbackLabel: '',
      disableDeviceFallback: false,
    });
    return r.success;
  } catch { return false; }
}

// ─── Dots ─────────────────────────────────────────────────────────────────────
function PinDots({ filled, shake }: { filled: number; shake: Animated.Value }) {
  return (
    <Animated.View style={[s.dots, { transform: [{ translateX: shake }] }]}>
      {Array.from({ length: PIN_LEN }).map((_, i) => (
        <View key={i} style={[s.dot, i < filled ? s.dotOn : s.dotOff]} />
      ))}
    </Animated.View>
  );
}

// ─── Key ──────────────────────────────────────────────────────────────────────
function DialKey({ value, onPress }: { value: string; onPress: (v: string) => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  if (!value) return <View style={s.keyEmpty} />;
  function press() {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.88, duration: 70, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1,    duration: 70, useNativeDriver: true }),
    ]).start();
    onPress(value);
  }
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity style={s.key} onPress={press} activeOpacity={0.7}>
        {value === '⌫'
          ? <Text style={s.keyBack}>⌫</Text>
          : <Text style={s.keyTxt}>{value}</Text>}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── PinPad core ─────────────────────────────────────────────────────────────
interface PinPadProps {
  title: string; subtitle: string;
  onComplete: (pin: string) => void;
  errorMessage?: string; onClearError?: () => void;
  onForgot?: () => void;
  rightAction?: { label: string; onPress: () => void };
  bioInfo?: { icon: string; label: string } | null;
  onBiometric?: () => void;
}

function PinPad({ title, subtitle, onComplete, errorMessage, onClearError, onForgot, rightAction, bioInfo, onBiometric }: PinPadProps) {
  const [pin, setPin]       = useState<string[]>([]);
  const submitted           = useRef(false);
  const shake               = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!errorMessage) return;
    submitted.current = false;
    Vibration.vibrate(Platform.OS === 'android' ? [0, 80, 60, 80] : 400);
    Animated.sequence([
      Animated.timing(shake, { toValue:  14, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -14, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue:   8, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue:  -8, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue:   0, duration: 55, useNativeDriver: true }),
    ]).start(() => setPin([]));
  }, [errorMessage]);

  const handleKey = useCallback((key: string) => {
    if (key === '⌫') { onClearError?.(); setPin(p => p.slice(0, -1)); return; }
    if (submitted.current) return;
    setPin(prev => {
      if (prev.length >= PIN_LEN) return prev;
      const next = [...prev, key];
      if (next.length === PIN_LEN) {
        submitted.current = true;
        InteractionManager.runAfterInteractions(() => onComplete(next.join('')));
      }
      return next;
    });
  }, [onComplete, onClearError]);

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <View style={s.badge}><Text style={{ fontSize: 36 }}>🔐</Text></View>
        <Text style={s.title}>{title}</Text>
        <Text style={s.subtitle}>{subtitle}</Text>
      </View>

      <PinDots filled={pin.length} shake={shake} />

      <View style={s.errWrap}>
        <Text style={[s.errTxt, !errorMessage && { opacity: 0 }]}>{errorMessage ?? ' '}</Text>
      </View>

      <View style={s.dialpad}>
        {DIALPAD.map((key, i) => <DialKey key={i} value={key} onPress={handleKey} />)}
      </View>

      {/* Nút sinh trắc học */}
      {bioInfo && onBiometric && (
        <TouchableOpacity style={s.bioBtn} onPress={onBiometric} activeOpacity={0.75}>
          <Text style={s.bioIcon}>{bioInfo.icon}</Text>
          <Text style={s.bioTxt}>Dùng {bioInfo.label}</Text>
        </TouchableOpacity>
      )}

      <View style={s.actions}>
        {onForgot   && <TouchableOpacity onPress={onForgot} style={s.actionBtn}><Text style={s.actionTxt}>Quên mã PIN?</Text></TouchableOpacity>}
        {rightAction && <TouchableOpacity onPress={rightAction.onPress} style={s.actionBtn}><Text style={s.actionTxt}>{rightAction.label}</Text></TouchableOpacity>}
      </View>
    </View>
  );
}

// ─── PinSetupScreen ───────────────────────────────────────────────────────────
export function PinSetupScreen({ navigation }: { navigation: Nav }) {
  const { setupPin } = useApp();
  const [step, setStep]           = useState<'enter' | 'confirm'>('enter');
  const [firstPin, setFirstPin]   = useState('');
  const [error, setError]         = useState('');

  function handleFirst(pin: string) { setFirstPin(pin); setError(''); setStep('confirm'); }

  function handleConfirm(pin: string) {
    if (pin !== firstPin) {
      setError('Mã PIN không khớp. Nhập lại từ đầu.');
      setTimeout(() => { setStep('enter'); setFirstPin(''); setError(''); }, 1800);
      return;
    }
    setupPin(pin);
    // Navigator tự chuyển khi isPinVerified = true
  }

  if (step === 'enter') {
    return <PinPad key="setup-enter" title="Thiết lập mã PIN" subtitle="Nhập mã PIN 6 chữ số" onComplete={handleFirst} errorMessage={error} onClearError={() => setError('')} rightAction={navigation.canGoBack() ? { label: 'Bỏ qua', onPress: () => navigation.goBack() } : undefined} />;
  }
  return <PinPad key="setup-confirm" title="Xác nhận mã PIN" subtitle="Nhập lại mã PIN vừa tạo" onComplete={handleConfirm} errorMessage={error} onClearError={() => setError('')} rightAction={{ label: '← Nhập lại', onPress: () => { setStep('enter'); setFirstPin(''); setError(''); } }} />;
}

// ─── PinVerifyScreen ──────────────────────────────────────────────────────────
export function PinVerifyScreen({ navigation }: { navigation: Nav }) {
  const { state, verifyPin, logout, dispatch } = useApp();
  const [error, setError]       = useState('');
  const [attempts, setAttempts] = useState(0);
  const [bioInfo, setBioInfo]   = useState<{ icon: string; label: string } | null>(null);
  const MAX = 5;

  useEffect(() => {
    // Không có PIN → auto verify
    if (state.user && !state.user.pin) { verifyPin(''); return; }

    // Kiểm tra sinh trắc học
    if (state.user?.biometricEnabled) {
      getBioInfo().then(info => {
        if (info) {
          setBioInfo(info);
          // Tự động bật prompt sinh trắc học
          setTimeout(() => handleBiometric(info), 600);
        }
      });
    }
  }, []);

  async function handleBiometric(info?: typeof bioInfo) {
    const bi = info ?? bioInfo;
    if (!bi) return;
    const ok = await promptBio(bi.label);
    if (ok) {
      // ✅ Sinh trắc học thành công → dispatch VERIFY_PIN trực tiếp
      dispatch({ type: 'VERIFY_PIN' });
      // AppNavigator tự chuyển sang Main vì isPinVerified = true
    }
  }

  function handlePin(pin: string) {
    const ok = verifyPin(pin);
    if (ok) return; // AppNavigator tự chuyển
    const next = attempts + 1;
    setAttempts(next);
    if (next >= MAX) {
      setError(`Sai PIN ${MAX} lần. Tài khoản bị khoá!`);
      setTimeout(() => logout(), 1500);
    } else {
      setError(`Mã PIN sai · Còn ${MAX - next} lần thử`);
    }
  }

  function handleForgot() {
    Alert.alert('Quên mã PIN', 'Bạn sẽ được đăng xuất và cần đăng nhập lại.', [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: () => logout() },
    ]);
  }

  return (
    <PinPad
      key="verify"
      title="Nhập mã PIN"
      subtitle={`Xin chào, ${state.user?.name ?? 'bạn'} 👋`}
      onComplete={handlePin}
      errorMessage={error}
      onClearError={() => setError('')}
      onForgot={handleForgot}
      bioInfo={bioInfo}
      onBiometric={() => handleBiometric()}
    />
  );
}

const s = StyleSheet.create({
  screen:   { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, paddingBottom: 48, paddingHorizontal: 24 },
  header:   { alignItems: 'center' },
  badge:    { width: 84, height: 84, borderRadius: 26, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title:    { fontSize: 24, fontWeight: '700', color: COLORS.dark, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
  dots:     { flexDirection: 'row', gap: 18 },
  dot:      { width: 18, height: 18, borderRadius: 9 },
  dotOn:    { backgroundColor: COLORS.primary },
  dotOff:   { backgroundColor: 'transparent', borderWidth: 2, borderColor: '#D0CFEF' },
  errWrap:  { height: 28, alignItems: 'center', justifyContent: 'center' },
  errTxt:   { fontSize: 13, color: COLORS.danger, fontWeight: '500', textAlign: 'center' },
  dialpad:  { flexDirection: 'row', flexWrap: 'wrap', width: 300, justifyContent: 'center', gap: 14 },
  key:      { width: 82, height: 82, borderRadius: 41, backgroundColor: '#F2F2F7', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 3, elevation: 2 },
  keyEmpty: { width: 82, height: 82 },
  keyTxt:   { fontSize: 26, fontWeight: '500', color: COLORS.dark },
  keyBack:  { fontSize: 22, color: COLORS.textSecondary },
  bioBtn:   { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.primaryLight, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 20 },
  bioIcon:  { fontSize: 24 },
  bioTxt:   { fontSize: 15, fontWeight: '600', color: COLORS.primary },
  actions:  { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingHorizontal: 4 },
  actionBtn:{ padding: 8 },
  actionTxt:{ fontSize: 14, color: COLORS.primary, fontWeight: '500' },
});