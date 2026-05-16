import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../context/AppContext';
import { COLORS } from '../utils/constants';
import { RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// ─── react-native-biometrics wrapper ────────────────────────────────────────
// Install: npm install react-native-biometrics
// iOS: add NSFaceIDUsageDescription to Info.plist
// Android: add USE_BIOMETRIC, USE_FINGERPRINT permissions
let ReactNativeBiometrics: any = null;
try {
  ReactNativeBiometrics = require('react-native-biometrics').default;
} catch {
  // Library not installed — will show install guide
}

type BiometryType = 'TouchID' | 'FaceID' | 'Biometrics' | 'none';

interface BiometricInfo {
  available: boolean;
  biometryType: BiometryType;
  label: string;
  icon: string;
}

async function checkBiometricAvailability(): Promise<BiometricInfo> {
  if (!ReactNativeBiometrics) {
    return { available: false, biometryType: 'none', label: 'Chưa cài thư viện', icon: '❌' };
  }
  try {
    const rnBiometrics = new ReactNativeBiometrics({ allowDeviceCredentials: true });
    const { available, biometryType } = await rnBiometrics.isSensorAvailable();
    const labelMap: Record<string, string> = {
      TouchID:    'Touch ID',
      FaceID:     'Face ID',
      Biometrics: 'Sinh trắc học',
    };
    const iconMap: Record<string, string> = {
      TouchID:    '👆',
      FaceID:     '👁',
      Biometrics: '🔏',
    };
    return {
      available,
      biometryType: (biometryType ?? 'none') as BiometryType,
      label: labelMap[biometryType ?? ''] ?? 'Không hỗ trợ',
      icon:  iconMap[biometryType ?? ''] ?? '❌',
    };
  } catch {
    return { available: false, biometryType: 'none', label: 'Lỗi kiểm tra', icon: '❌' };
  }
}

async function promptBiometric(reason: string): Promise<boolean> {
  if (!ReactNativeBiometrics) return false;
  try {
    const rnBiometrics = new ReactNativeBiometrics({ allowDeviceCredentials: true });
    const { success } = await rnBiometrics.simplePrompt({ promptMessage: reason });
    return success;
  } catch {
    return false;
  }
}

// ─── Screen ──────────────────────────────────────────────────────────────────
export function BiometricScreen({ navigation }: { navigation: Nav }) {
  const { state, dispatch, enableTwoFactor } = useApp();
  const user = state.user!;

  const [info, setInfo] = useState<BiometricInfo | null>(null);
  const [checking, setChecking] = useState(true);
  const [enabling, setEnabling] = useState(false);
  const [bioEnabled, setBioEnabled] = useState(user.biometricEnabled);
  const [twoFAEnabled, setTwoFAEnabled] = useState(user.twoFactorEnabled);

  useEffect(() => {
    (async () => {
      const result = await checkBiometricAvailability();
      setInfo(result);
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
      const ok = await promptBiometric(`Xác nhận để bật ${info.label}`);
      if (ok) {
        dispatch({ type: 'UPDATE_USER', payload: { biometricEnabled: true } });
        setBioEnabled(true);
        Alert.alert('✅ Đã bật', `${info.label} sẽ được dùng thay thế mã PIN khi đăng nhập.`);
      } else {
        Alert.alert('Thất bại', 'Xác thực không thành công. Vui lòng thử lại.');
      }
    } finally {
      setEnabling(false);
    }
  }

  async function handleDisableBio() {
    Alert.alert(
      `Tắt ${info?.label ?? 'sinh trắc học'}`,
      'Bạn sẽ cần dùng mã PIN để đăng nhập.',
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Tắt',
          style: 'destructive',
          onPress: () => {
            dispatch({ type: 'UPDATE_USER', payload: { biometricEnabled: false } });
            setBioEnabled(false);
          },
        },
      ],
    );
  }

  // ── 2FA toggle ────────────────────────────────────────────────────────────
  async function handleToggle2FA() {
    if (!twoFAEnabled) {
      Alert.alert(
        'Bật bảo mật 2 lớp (2FA)',
        `Khi đăng nhập:\n1️⃣ Nhập email + mật khẩu\n2️⃣ Nhập mã OTP gửi về ${user.email}\n\nBạn có muốn bật không?`,
        [
          { text: 'Huỷ', style: 'cancel' },
          {
            text: 'Bật 2FA',
            onPress: async () => {
              await enableTwoFactor(true);
              setTwoFAEnabled(true);
              Alert.alert(
                '✅ 2FA đã bật',
                'Từ lần đăng nhập tiếp theo, Supabase Auth sẽ yêu cầu OTP qua email của bạn.',
              );
            },
          },
        ],
      );
    } else {
      Alert.alert('Tắt 2FA', 'Tài khoản sẽ kém bảo mật hơn. Chắc chắn tắt?', [
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

  // ── Test biometric ────────────────────────────────────────────────────────
  async function handleTest() {
    setEnabling(true);
    try {
      const ok = await promptBiometric('Thử xác thực sinh trắc học');
      Alert.alert(ok ? '✅ Thành công' : '❌ Thất bại', ok ? 'Xác thực sinh trắc học hoạt động!' : 'Xác thực không thành công.');
    } finally {
      setEnabling(false);
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

  const libInstalled = !!ReactNativeBiometrics;

  return (
    <View style={s.screen}>
      <View style={s.hdr}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
          <Text style={s.backTxt}>←</Text>
        </TouchableOpacity>
        <Text style={s.hdrTtl}>Sinh trắc học & 2FA</Text>
      </View>

      <View style={s.body}>
        {/* Library install guide if not installed */}
        {!libInstalled && (
          <View style={s.installBanner}>
            <Text style={s.installTitle}>📦 Cần cài thư viện</Text>
            <Text style={s.installCode}>npm install react-native-biometrics</Text>
            <Text style={s.installNote}>
              iOS: thêm NSFaceIDUsageDescription vào Info.plist{'\n'}
              Android: thêm quyền USE_BIOMETRIC trong AndroidManifest.xml
            </Text>
          </View>
        )}

        {/* Biometric card */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={{ fontSize: 32 }}>{info?.icon ?? '🔏'}</Text>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={s.cardTitle}>{info?.label ?? 'Sinh trắc học'}</Text>
              <Text style={s.cardSub}>
                {info?.available
                  ? `${info.biometryType} sẵn sàng trên thiết bị này`
                  : 'Thiết bị không hỗ trợ hoặc chưa thiết lập'}
              </Text>
            </View>
            <View style={[s.statusDot, { backgroundColor: info?.available ? COLORS.success : '#ccc' }]} />
          </View>

          <View style={s.divider} />

          {/* Status */}
          <View style={s.statusRow}>
            <Text style={s.statusLbl}>Trạng thái:</Text>
            <View style={[s.statusBadge, { backgroundColor: bioEnabled ? '#EDFAF3' : '#FFF0F0' }]}>
              <Text style={[s.statusTxt, { color: bioEnabled ? COLORS.success : COLORS.danger }]}>
                {bioEnabled ? '✅ Đang bật' : '⭕ Đang tắt'}
              </Text>
            </View>
          </View>

          {/* Actions */}
          <View style={s.actionRow}>
            {!bioEnabled ? (
              <TouchableOpacity
                style={[s.actionBtn, s.actionBtnPrimary, !info?.available && s.actionBtnDisabled]}
                onPress={handleEnableBio}
                disabled={enabling || !info?.available}
              >
                {enabling
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.actionBtnPrimaryTxt}>Bật {info?.label}</Text>}
              </TouchableOpacity>
            ) : (
              <View style={{ flexDirection: 'row', gap: 10, flex: 1 }}>
                <TouchableOpacity style={[s.actionBtn, s.actionBtnSecondary, { flex: 1 }]} onPress={handleTest} disabled={enabling}>
                  <Text style={s.actionBtnSecondaryTxt}>🧪 Thử nghiệm</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.actionBtn, s.actionBtnDanger, { flex: 1 }]} onPress={handleDisableBio}>
                  <Text style={s.actionBtnDangerTxt}>Tắt</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* 2FA card */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={{ fontSize: 32 }}>🛡</Text>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={s.cardTitle}>Bảo mật 2 lớp (2FA)</Text>
              <Text style={s.cardSub}>OTP qua email sau mỗi lần đăng nhập</Text>
            </View>
            <View style={[s.statusDot, { backgroundColor: twoFAEnabled ? COLORS.success : '#ccc' }]} />
          </View>

          <View style={s.divider} />

          <View style={s.twoFAInfo}>
            <Text style={s.twoFAStep}>1️⃣  Nhập email + mật khẩu</Text>
            <Text style={s.twoFAStep}>2️⃣  Nhập mã PIN 6 số</Text>
            <Text style={s.twoFAStep}>3️⃣  Xác nhận OTP gửi về email</Text>
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
            style={[s.actionBtn, twoFAEnabled ? s.actionBtnDanger : s.actionBtnPrimary]}
            onPress={handleToggle2FA}
          >
            <Text style={twoFAEnabled ? s.actionBtnDangerTxt : s.actionBtnPrimaryTxt}>
              {twoFAEnabled ? 'Tắt 2FA' : 'Bật bảo mật 2 lớp'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Info note */}
        <View style={s.note}>
          <Text style={s.noteTxt}>
            🔒 Khi bật cả hai, thứ tự xác thực là:{'\n'}
            Sinh trắc học → PIN → 2FA (OTP email){'\n\n'}
            Dữ liệu sinh trắc học không rời khỏi thiết bị của bạn.
          </Text>
        </View>
      </View>
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
  hdrTtl: { fontSize: 20, fontWeight: '700', color: '#fff' },
  body: { padding: 16, gap: 14 },
  installBanner: {
    backgroundColor: '#FFF3CD', borderRadius: 14, padding: 14,
    borderLeftWidth: 4, borderLeftColor: '#FFC107',
  },
  installTitle: { fontSize: 14, fontWeight: '700', color: '#856404', marginBottom: 6 },
  installCode: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    backgroundColor: '#FFF8E1', padding: 8, borderRadius: 8,
    fontSize: 13, color: '#5D4037', marginBottom: 8,
  },
  installNote: { fontSize: 12, color: '#856404', lineHeight: 18 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.dark },
  cardSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  divider: { height: 0.5, backgroundColor: '#f0f0f0', marginVertical: 14 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  statusLbl: { fontSize: 13, color: COLORS.textSecondary },
  statusBadge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  statusTxt: { fontSize: 13, fontWeight: '600' },
  actionRow: { flexDirection: 'row' },
  actionBtn: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center' },
  actionBtnPrimary: { backgroundColor: COLORS.primary, flex: 1 },
  actionBtnPrimaryTxt: { color: '#fff', fontSize: 14, fontWeight: '600' },
  actionBtnSecondary: { backgroundColor: COLORS.bg, borderWidth: 1, borderColor: '#eee' },
  actionBtnSecondaryTxt: { color: COLORS.dark, fontSize: 13, fontWeight: '500' },
  actionBtnDanger: { backgroundColor: '#FFF0F0', borderWidth: 1, borderColor: '#FFCDD2', flex: 1 },
  actionBtnDangerTxt: { color: COLORS.danger, fontSize: 14, fontWeight: '600' },
  actionBtnDisabled: { opacity: 0.4 },
  twoFAInfo: { gap: 6, marginBottom: 14 },
  twoFAStep: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
  note: {
    backgroundColor: '#E8F5E9', borderRadius: 14, padding: 14,
  },
  noteTxt: { fontSize: 12, color: '#2E7D32', lineHeight: 20 },
});
