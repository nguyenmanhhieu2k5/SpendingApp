import React, { ReactNode } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, ViewStyle, TextInput, TextInputProps,
} from 'react-native';
import { COLORS } from '../utils/constants';

export function Button({ label, onPress, variant = 'primary', loading, disabled, style }: {
  label: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean; disabled?: boolean; style?: ViewStyle;
}) {
  const bg = variant === 'primary' ? COLORS.primary : variant === 'danger' ? COLORS.danger : variant === 'secondary' ? COLORS.bg : 'transparent';
  const tc = variant === 'primary' || variant === 'danger' ? '#fff' : COLORS.textPrimary;
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled || loading}
      style={[styles.btn, { backgroundColor: bg }, variant === 'secondary' && styles.btnBorder, style]}>
      {loading
        ? <ActivityIndicator color={variant === 'primary' ? '#fff' : COLORS.primary} />
        : <Text style={[styles.btnTxt, { color: tc }]}>{label}</Text>}
    </TouchableOpacity>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Input({ label, error, containerStyle, ...props }: TextInputProps & { label?: string; error?: string; containerStyle?: ViewStyle }) {
  return (
    <View style={[{ marginBottom: 12 }, containerStyle]}>
      {label ? <Text style={styles.inputLabel}>{label}</Text> : null}
      <TextInput style={[styles.input, error ? styles.inputErr : null]} placeholderTextColor={COLORS.textMuted} {...props} />
      {error ? <Text style={styles.errTxt}>{error}</Text> : null}
    </View>
  );
}

export function SectionHeader({ title, actionLabel, onAction }: { title: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <View style={styles.secHdr}>
      <Text style={styles.secTtl}>{title}</Text>
      {actionLabel ? <TouchableOpacity onPress={onAction}><Text style={styles.secAct}>{actionLabel}</Text></TouchableOpacity> : null}
    </View>
  );
}

export function ProgressBar({ pct, color = COLORS.primary, height = 6 }: { pct: number; color?: string; height?: number }) {
  const w = `${Math.round(Math.min(Math.max(pct, 0), 1) * 100)}%` as any;
  return (
    <View style={[styles.progBg, { height }]}>
      <View style={[styles.progFill, { width: w, backgroundColor: color, height }]} />
    </View>
  );
}

export function EmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <View style={styles.empty}>
      <Text style={{ fontSize: 40, marginBottom: 10 }}>{icon}</Text>
      <Text style={styles.emptyTxt}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  btnBorder: { borderWidth: 1, borderColor: COLORS.border },
  btnTxt: { fontSize: 15, fontWeight: '600' },
  card: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 12 },
  inputLabel: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 6, fontWeight: '500' },
  input: { backgroundColor: COLORS.bg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.textPrimary, borderWidth: 1, borderColor: 'transparent' },
  inputErr: { borderColor: COLORS.danger },
  errTxt: { fontSize: 11, color: COLORS.danger, marginTop: 4 },
  secHdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  secTtl: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  secAct: { fontSize: 13, color: COLORS.primary, fontWeight: '500' },
  progBg: { backgroundColor: '#eee', borderRadius: 4, overflow: 'hidden' },
  progFill: { borderRadius: 4 },
  empty: { alignItems: 'center', paddingVertical: 32 },
  emptyTxt: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center' },
});
