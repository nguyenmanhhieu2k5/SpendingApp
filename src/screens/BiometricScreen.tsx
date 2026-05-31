import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../context/AppContext';
import { COLORS } from '../utils/constants';
import { RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface BiometricInfo {
  available: boolean;
  types: LocalAuthentication.AuthenticationType[];
  label: string;
  icon: string;
}

function getLabel(types: LocalAuthentication.AuthenticationType[]): { label: string; icon: string } {
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return { label: 'Face ID', icon: '👁' };
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return { label: 'Vân tay', icon: '👆' };
  }
  return { label: 'Sinh trắc học', icon: '🔏' };
}

export function BiometricScreen({ navigation }: { navigation: Nav }) {
  const { state, dispatch, enableTwoFactor } = useApp();
  const user = state.user!;

  const [info, setInfo]         = useState<BiometricInfo | null>(null);
  const [checking, setChecking] = useState(true);
  const [enabling, setEnabling] = useState(false);
  const [bioEnabled, setBioEnabled] = useState(user.biometricEnabled);
  const [twoFAEnabled, setTwoFAEnabled] = useState(user.twoFactorEnabled);

  useEffect(() => {
    (async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled   = await LocalAuthentication.isEnrolledAsync();
      const types      = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const { label, icon } = getLabel(types);
      setInfo({ available: compatible && enrolled, types, label, icon });
      setChecking(false);
    })();
  }, []);

  // ── Enable biometric ──────────────────────────────────────────────────────
  async function handleEnableBio() {
    if (!info?.available) {
      Alert.alert(
        'Không hỗ trợ',
        'Thiết bị của bạn không hỗ trợ sinh trắc học hoặc chưa thiết lập.\n\nVào Cài đặt → Bảo mật → Vân tay / Face ID để thiết lập trước.',
      );
      return;
    }
    setEnabling(true);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Xác nhận để bật ${info.label}`,
        cancelLabel: 'Huỷ',
        fallbackLabel: '',
      disableDeviceFallback: false,
      });
      if (result.success) {
        dispatch({ type: 'UPDATE_USER', payload: { biometricEnabled: true } });
        setBioEnabled(true);
        Alert.alert('✅ Đã bật', `${info.label} sẽ dùng để xác thực khi đăng nhập.`);
      } else {
        Alert.alert('Thất bại', 'Xác thực không thành công. Vui lòng thử lại.');
      }
    } finally {
      setEnabling(false);
    }
  }

  async function handleDisableBio() {
    Alert.alert(`Tắt ${info?.label ?? 'sinh trắc học'}`, 'Bạn sẽ cần mã PIN để đăng nhập.', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Tắt',
        style: 'destructive',
        onPress: () => {
          dispatch({ type: 'UPDATE_USER', payload: { biometricEnabled: false } });
          setBioEnabled(false);
        },
      },
    ]);
  }

  async function handleTest() {
    if (!info?.available) { Alert.alert('Không khả dụng'); return; }
    setEnabling(true);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Thử xác thực sinh trắc học',
        cancelLabel: 'Huỷ',
        fallbackLabel: '',
      disableDeviceFallback: false,
      });
      Alert.alert(
        result.success ? '✅ Thành công' : '❌ Thất bại',
        result.success ? 'Sinh trắc học hoạt động bình thường!' : 'Xác thực không thành công.',
      );
    } finally {
      setEnabling(false);
    }
  }

  // ── 2FA ───────────────────────────────────────────────────────────────────
  function handleToggle2FA() {
    if (!twoFAEnabled) {
      Alert.alert(
        'Bật bảo mật 2 lớp (2FA)',
        `Khi đăng nhập:\n1️⃣ Nhập email + mật khẩu\n2️⃣ Nhập mã PIN 6 số\n3️⃣ Xác nhận OTP qua email: ${user.email}\n\nBạn có muốn bật không?`,
        [
          { text: 'Huỷ', style: 'cancel' },
          {
            text: 'Bật 2FA',
            onPress: async () => {
              await enableTwoFactor(true);
              setTwoFAEnabled(true);
              Alert.alert('✅ 2FA đã bật', 'Từ lần đăng nhập tiếp theo sẽ yêu cầu OTP qua email.');
            },
          },
        ],
      );
    } else {
      Alert.alert('Tắt 2FA', 'Tài khoản sẽ kém bảo mật hơn.', [
        { text: 'Giữ nguyên', style: 'cancel' },
        {
          text: 'Tắt 2FA',
          style: 'destructive',
          onPress: async () => {
            await enableTwoFactor(false);
            setTwoFAEnabled(false);
          },
        },
      ]);
    }
  }

  if (checking) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 12, color: COLORS.textMuted }}>Đang kiểm tra thiết bị...</Text>
      </View>
    );
  }

  return (
    <View style={s.screen}>
      <View style={s.hdr}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
          <Text style={s.backTxt}>←</Text>
        </TouchableOpacity>
        <Text style={s.hdrTtl}>Sinh trắc học & 2FA</Text>
      </View>

      <View style={s.body}>
        {/* Biometric card */}
        <View style={s.card}>
          <View style={s.cardHdr}>
            <Text style={{ fontSize: 32 }}>{info?.icon ?? '🔏'}</Text>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={s.cardTitle}>{info?.label ?? 'Sinh trắc học'}</Text>
              <Text style={s.cardSub}>
                {info?.available
                  ? 'Sẵn sàng trên thiết bị này'
                  : 'Thiết bị không hỗ trợ hoặc chưa thiết lập'}
              </Text>
            </View>
            <View style={[s.dot, { backgroundColor: info?.available ? COLORS.success : '#ccc' }]} />
          </View>

          <View style={s.divider} />

          <View style={s.statusRow}>
            <Text style={s.statusLbl}>Trạng thái:</Text>
            <View style={[s.statusBadge, { backgroundColor: bioEnabled ? '#EDFAF3' : '#FFF0F0' }]}>
              <Text style={[s.statusTxt, { color: bioEnabled ? COLORS.success : COLORS.danger }]}>
                {bioEnabled ? '✅ Đang bật' : '⭕ Đang tắt'}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            {!bioEnabled ? (
              <TouchableOpacity
                style={[s.btn, s.btnPrimary, !info?.available && s.btnDisabled, { flex: 1 }]}
                onPress={handleEnableBio}
                disabled={enabling || !info?.available}
              >
                {enabling
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.btnPrimaryTxt}>Bật {info?.label}</Text>}
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity style={[s.btn, s.btnSecondary, { flex: 1 }]} onPress={handleTest} disabled={enabling}>
                  <Text style={s.btnSecondaryTxt}>🧪 Thử</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.btn, s.btnDanger, { flex: 1 }]} onPress={handleDisableBio}>
                  <Text style={s.btnDangerTxt}>Tắt</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* 2FA card */}
        <View style={s.card}>
          <View style={s.cardHdr}>
            <Text style={{ fontSize: 32 }}>🛡</Text>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={s.cardTitle}>Bảo mật 2 lớp (2FA)</Text>
              <Text style={s.cardSub}>OTP qua email sau mỗi lần đăng nhập</Text>
            </View>
            <View style={[s.dot, { backgroundColor: twoFAEnabled ? COLORS.success : '#ccc' }]} />
          </View>

          <View style={s.divider} />

          <View style={{ gap: 6, marginBottom: 14 }}>
            <Text style={s.step}>1️⃣  Nhập email + mật khẩu</Text>
            <Text style={s.step}>2️⃣  Nhập mã PIN 6 số</Text>
            <Text style={s.step}>3️⃣  Xác nhận OTP gửi về email</Text>
          </View>

          <View style={s.statusRow}>
            <Text style={s.statusLbl}>Trạng thái:</Text>
            <View style={[s.statusBadge, { backgroundColor: twoFAEnabled ? '#EDFAF3' : '#FFF8E1' }]}>
              <Text style={[s.statusTxt, { color: twoFAEnabled ? COLORS.success : '#856404' }]}>
                {twoFAEnabled ? '✅ Đang bật' : '⚠️ Chưa bật'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[s.btn, twoFAEnabled ? s.btnDanger : s.btnPrimary]}
            onPress={handleToggle2FA}
          >
            <Text style={twoFAEnabled ? s.btnDangerTxt : s.btnPrimaryTxt}>
              {twoFAEnabled ? 'Tắt 2FA' : 'Bật bảo mật 2 lớp'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={s.note}>
          <Text style={s.noteTxt}>
            🔒 Thứ tự xác thực: Sinh trắc học → PIN → OTP email{'\n\n'}
            Dữ liệu sinh trắc học không rời khỏi thiết bị của bạn.
          </Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  hdr: { backgroundColor: COLORS.dark, padding: 20, paddingTop: 56, paddingBottom: 20, flexDirection: 'row', alignItems: 'center' },
  back: { marginRight: 12 },
  backTxt: { color: 'rgba(255,255,255,0.7)', fontSize: 20 },
  hdrTtl: { fontSize: 20, fontWeight: '700', color: '#fff' },
  body: { padding: 16, gap: 14 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  cardHdr: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.dark },
  cardSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  divider: { height: 0.5, backgroundColor: '#f0f0f0', marginVertical: 14 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  statusLbl: { fontSize: 13, color: COLORS.textSecondary },
  statusBadge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  statusTxt: { fontSize: 13, fontWeight: '600' },
  btn: { borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  btnPrimary: { backgroundColor: COLORS.primary },
  btnPrimaryTxt: { color: '#fff', fontSize: 14, fontWeight: '600' },
  btnSecondary: { backgroundColor: COLORS.bg, borderWidth: 1, borderColor: '#eee' },
  btnSecondaryTxt: { color: COLORS.dark, fontSize: 13, fontWeight: '500' },
  btnDanger: { backgroundColor: '#FFF0F0', borderWidth: 1, borderColor: '#FFCDD2' },
  btnDangerTxt: { color: COLORS.danger, fontSize: 14, fontWeight: '600' },
  btnDisabled: { opacity: 0.4 },
  step: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
  note: { backgroundColor: '#E8F5E9', borderRadius: 14, padding: 14 },
  noteTxt: { fontSize: 12, color: '#2E7D32', lineHeight: 20 },
});
