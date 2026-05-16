import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Alert, Vibration, Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useApp } from '../context/AppContext';
import { COLORS } from '../utils/constants';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const PIN_LEN = 6;
const DIALPAD = [
  '1', '2', '3',
  '4', '5', '6',
  '7', '8', '9',
  '',  '0', '⌫',
];

// ─── Dot indicator ────────────────────────────────────────────────────────────
function PinDots({ filled, total, shake }: { filled: number; total: number; shake: Animated.Value }) {
  return (
    <Animated.View style={[styles.dots, { transform: [{ translateX: shake }] }]}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i < filled ? styles.dotFilled : styles.dotEmpty,
          ]}
        />
      ))}
    </Animated.View>
  );
}

// ─── Dialpad key ─────────────────────────────────────────────────────────────
function DialKey({ value, onPress }: { value: string; onPress: (v: string) => void }) {
  const scale = useRef(new Animated.Value(1)).current;

  function handlePress() {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.88, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1,    duration: 80, useNativeDriver: true }),
    ]).start();
    onPress(value);
  }

  if (!value) return <View style={styles.keyEmpty} />;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={styles.key}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        {value === '⌫'
          ? <Text style={styles.keyBackspace}>⌫</Text>
          : <Text style={styles.keyText}>{value}</Text>
        }
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Core PIN Pad component ───────────────────────────────────────────────────
interface PinPadProps {
  title: string;
  subtitle: string;
  onComplete: (pin: string) => void;
  errorMessage?: string;
  onClearError?: () => void;
  onForgot?: () => void;
  rightAction?: { label: string; onPress: () => void };
}

function PinPad({
  title, subtitle, onComplete, errorMessage, onClearError, onForgot, rightAction,
}: PinPadProps) {
  const [pin, setPin] = useState<string[]>([]);
  const shake = useRef(new Animated.Value(0)).current;
  const submitted = useRef(false);

  // Shake + reset when error arrives
  useEffect(() => {
    if (errorMessage) {
      submitted.current = false;
      Vibration.vibrate(Platform.OS === 'android' ? [0, 80, 60, 80] : 400);
      Animated.sequence([
        Animated.timing(shake, { toValue: 12,  duration: 55, useNativeDriver: true }),
        Animated.timing(shake, { toValue: -12, duration: 55, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 8,   duration: 55, useNativeDriver: true }),
        Animated.timing(shake, { toValue: -8,  duration: 55, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 0,   duration: 55, useNativeDriver: true }),
      ]).start(() => setPin([]));
    } else if (submitted.current) {
      // Reset submitted flag when error is cleared (e.g., backspace pressed)
      submitted.current = false;
    }
  }, [errorMessage]);

  const handleKey = useCallback((key: string) => {
    if (key === '⌫') {
      onClearError?.();
      setPin(p => p.slice(0, -1));
      return;
    }
    if (submitted.current) return;

    setPin(prev => {
      if (prev.length >= PIN_LEN) return prev;
      const next = [...prev, key];
      if (next.length === PIN_LEN) {
        submitted.current = true;
        // Small delay so user sees last dot fill before callback
        setTimeout(() => {
          onComplete(next.join(''));
          // Reset submitted flag only after parent clears error or navigates away
        }, 120);
      }
      return next;
    });
  }, [onComplete, onClearError]);

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.lockBadge}>
          <Text style={{ fontSize: 36 }}>🔐</Text>
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      {/* Dots */}
      <PinDots filled={pin.length} total={PIN_LEN} shake={shake} />

      {/* Error */}
      <View style={styles.errorWrap}>
        {errorMessage
          ? <Text style={styles.errorText}>{errorMessage}</Text>
          : <Text style={styles.errorText}> </Text>
        }
      </View>

      {/* Dialpad grid */}
      <View style={styles.dialpad}>
        {DIALPAD.map((key, i) => (
          <DialKey key={i} value={key} onPress={handleKey} />
        ))}
      </View>

      {/* Bottom actions */}
      <View style={styles.bottomActions}>
        {onForgot && (
          <TouchableOpacity onPress={onForgot} style={styles.actionBtn}>
            <Text style={styles.actionText}>Quên mã PIN?</Text>
          </TouchableOpacity>
        )}
        {rightAction && (
          <TouchableOpacity onPress={rightAction.onPress} style={styles.actionBtn}>
            <Text style={styles.actionText}>{rightAction.label}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── PinSetupScreen ───────────────────────────────────────────────────────────
export function PinSetupScreen({ navigation }: { navigation: Nav }) {
  const { setupPin } = useApp();
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState('');

  function handleFirst(pin: string) {
    setFirstPin(pin);
    setStep('confirm');
    setError('');
  }

  async function handleConfirm(pin: string) {
    if (pin !== firstPin) {
      setError('Mã PIN không khớp. Vui lòng nhập lại từ đầu.');
      // Reset back to first step after shake animation completes
      setTimeout(() => {
        setStep('enter');
        setFirstPin('');
        setError('');
      }, 1500);
      return;
    }
    await setupPin(pin);
    if (navigation.canGoBack()) navigation.goBack();
  }

  if (step === 'enter') {
    return (
      <PinPad
        title="Thiết lập mã PIN"
        subtitle="Nhập mã PIN 6 chữ số để bảo vệ tài khoản"
        onComplete={handleFirst}
        errorMessage={error}
        onClearError={() => setError('')}
        rightAction={
          navigation.canGoBack()
            ? { label: 'Bỏ qua', onPress: () => navigation.goBack() }
            : undefined
        }
      />
    );
  }

  return (
    <PinPad
      title="Xác nhận mã PIN"
      subtitle="Nhập lại mã PIN vừa tạo để xác nhận"
      onComplete={handleConfirm}
      errorMessage={error}
      onClearError={() => setError('')}
      rightAction={{
        label: '← Nhập lại',
        onPress: () => { setStep('enter'); setFirstPin(''); setError(''); },
      }}
    />
  );
}

// ─── PinVerifyScreen ──────────────────────────────────────────────────────────
export function PinVerifyScreen({ navigation }: { navigation: Nav }) {
  const { state, verifyPin, logout } = useApp();
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const MAX_ATTEMPTS = 5;

  useEffect(() => {
    if (state.user && !state.user.pin) {
      verifyPin('');
    }
  }, []);

  function handlePin(pin: string) {
    const ok = verifyPin(pin);
    if (ok) return;

    const next = attempts + 1;
    setAttempts(next);

    if (next >= MAX_ATTEMPTS) {
      setError(`Sai mã PIN ${MAX_ATTEMPTS} lần. Tài khoản bị khoá!`);
      setTimeout(async () => {
        await logout();
      }, 1500);
    } else {
      setError(`Mã PIN sai · Còn ${MAX_ATTEMPTS - next} lần thử`);
    }
  }

  function handleForgot() {
    Alert.alert(
      'Quên mã PIN',
      'Bạn sẽ được đăng xuất và cần đăng nhập lại bằng email / mật khẩu.',
      [
        { text: 'Huỷ', style: 'cancel' },
        { text: 'Đăng xuất', style: 'destructive', onPress: () => logout() },
      ],
    );
  }

  return (
    <PinPad
      title="Nhập mã PIN"
      subtitle={`Xin chào trở lại, ${state.user?.name ?? 'bạn'} 👋`}
      onComplete={handlePin}
      errorMessage={error}
      onClearError={() => setError('')}
      onForgot={handleForgot}
    />
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  header: { alignItems: 'center', marginTop: 16 },
  lockBadge: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24, fontWeight: '700',
    color: COLORS.dark, marginBottom: 8, textAlign: 'center',
  },
  subtitle: {
    fontSize: 14, color: COLORS.textSecondary,
    textAlign: 'center', lineHeight: 20,
  },
  dots: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  dot: {
    width: 18, height: 18, borderRadius: 9,
  },
  dotFilled: {
    backgroundColor: COLORS.primary,
    // pulse effect via scale could be added here
  },
  dotEmpty: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#D0CFEF',
  },
  errorWrap: {
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 13, color: COLORS.danger,
    fontWeight: '500', textAlign: 'center',
  },
  dialpad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 300,
    justifyContent: 'center',
    gap: 16,
  },
  key: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#F4F4F8',
    alignItems: 'center', justifyContent: 'center',
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  keyEmpty: {
    width: 80, height: 80,
  },
  keyText: {
    fontSize: 26, fontWeight: '500',
    color: COLORS.dark,
  },
  keyBackspace: {
    fontSize: 22, color: COLORS.textSecondary,
  },
  bottomActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 8,
  },
  actionBtn: { padding: 8 },
  actionText: {
    fontSize: 14, color: COLORS.primary, fontWeight: '500',
  },
});
