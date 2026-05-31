import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { Button, Input } from '../components/UI';
import { useApp } from '../context/AppContext';
import { COLORS } from '../utils/constants';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// ─── Helpers ──────────────────────────────────────────────────────────────────
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
      promptMessage: `Đăng nhập bằng ${label}`,
      cancelLabel: 'Huỷ',
      fallbackLabel: '',
      disableDeviceFallback: false,
    });
    return r.success;
  } catch { return false; }
}

// ─── LoginScreen ──────────────────────────────────────────────────────────────
export function LoginScreen({ navigation }: { navigation: Nav }) {
  const { state, login, dispatch } = useApp();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [errors, setErrors]     = useState<{ email?: string; password?: string }>({});
  const [bio, setBio]           = useState<{ icon: string; label: string } | null>(null);

  useEffect(() => {
    getBioInfo().then(setBio);
  }, []);

  // Nếu có user cũ đã bật biometric → tự kích hoạt
  useEffect(() => {
    if (bio && state.user?.biometricEnabled) {
      setTimeout(() => handleBiometricLogin(), 500);
    }
  }, [bio]);

  function validate(): boolean {
    const e: typeof errors = {};
    if (!email.includes('@')) e.email    = 'Email không hợp lệ';
    if (password.length < 6)  e.password = 'Mật khẩu tối thiểu 6 ký tự';
    setErrors(e);
    return !Object.keys(e).length;
  }

  async function handleLogin() {
    if (!validate()) return;
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      Alert.alert('Lỗi đăng nhập', err.message ?? 'Email hoặc mật khẩu không đúng');
    } finally {
      setLoading(false);
    }
  }

  async function handleBiometricLogin() {
    if (!bio) return;
    const ok = await promptBio(bio.label);
    if (!ok) return;

    // ✅ Sinh trắc học thành công
    if (state.user) {
      // Có user cũ trong cache → LOGIN + VERIFY_PIN ngay lập tức
      // Dùng 2 dispatch liên tiếp để đảm bảo cả isAuthenticated và isPinVerified đều = true
      dispatch({ type: 'LOGIN', payload: state.user });
      // Đợi 1 tick rồi dispatch VERIFY_PIN để AppNavigator nhận đủ 2 state
      setTimeout(() => {
        dispatch({ type: 'VERIFY_PIN' });
      }, 50);
    } else {
      // Chưa có user → tạo user local rồi vào thẳng
      const localUser = {
        id: 'local-' + Date.now(),
        name: 'Người dùng',
        email: 'user@local.app',
        avatar: '😊',
        biometricEnabled: true,
        twoFactorEnabled: false,
        createdAt: Date.now(),
      };
      dispatch({ type: 'LOGIN', payload: localUser });
      setTimeout(() => {
        dispatch({ type: 'VERIFY_PIN' });
      }, 50);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={s.wrap}>
        {/* Logo */}
        <View style={s.logoWrap}>
          <View style={s.logo}><Text style={{ fontSize: 40 }}>💰</Text></View>
          <Text style={s.appName}>SpendingApp</Text>
          <Text style={s.tagline}>Quản lý chi tiêu thông minh</Text>
        </View>

        {/* Form đăng nhập */}
        <View style={s.form}>
          <Text style={s.formTitle}>Đăng nhập</Text>

          <Input
            label="Email"
            value={email}
            onChangeText={t => { setEmail(t); setErrors({}); }}
            placeholder="your@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
          />
          <Input
            label="Mật khẩu"
            value={password}
            onChangeText={t => { setPassword(t); setErrors({}); }}
            placeholder="••••••••"
            secureTextEntry
            error={errors.password}
          />

          <Button
            label="Đăng nhập"
            onPress={handleLogin}
            loading={loading}
            style={{ marginTop: 4 }}
          />

          {/* ── Nút Face ID / Vân tay ── */}
          {bio && (
            <TouchableOpacity
              style={s.bioBtn}
              onPress={handleBiometricLogin}
              activeOpacity={0.75}
            >
              <Text style={s.bioIcon}>{bio.icon}</Text>
              <Text style={s.bioTxt}>Đăng nhập bằng {bio.label}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={s.link} onPress={() => navigation.navigate('Register')}>
            <Text style={s.linkTxt}>
              Chưa có tài khoản?{' '}
              <Text style={{ color: COLORS.primary, fontWeight: '600' }}>Đăng ký ngay</Text>
            </Text>
          </TouchableOpacity>
        </View>

        <View style={s.secBadge}>
          <Text style={s.secTxt}>
            🔒 PIN · {bio?.label ?? 'Sinh trắc học'} · 2FA · Mã hoá AES-256
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── RegisterScreen ───────────────────────────────────────────────────────────
export function RegisterScreen({ navigation }: { navigation: Nav }) {
  const { register } = useApp();
  const [form, setForm]       = useState({ name: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState<Record<string, string>>({});

  function setF(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (form.name.trim().length < 2)    e.name     = 'Tên tối thiểu 2 ký tự';
    if (!form.email.includes('@'))      e.email    = 'Email không hợp lệ';
    if (form.password.length < 6)       e.password = 'Mật khẩu tối thiểu 6 ký tự';
    if (form.password !== form.confirm) e.confirm  = 'Mật khẩu không khớp';
    setErrors(e);
    return !Object.keys(e).length;
  }

  async function handleRegister() {
    if (!validate()) return;
    setLoading(true);
    try {
      await register(form.name, form.email.trim(), form.password);
    } catch (err: any) {
      Alert.alert('Lỗi', err.message ?? 'Đăng ký thất bại.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={s.wrap}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 16 }}>
          <Text style={{ color: COLORS.primary, fontSize: 15, fontWeight: '500' }}>← Quay lại</Text>
        </TouchableOpacity>

        <View style={s.form}>
          <Text style={s.formTitle}>Tạo tài khoản</Text>
          <Input label="Họ và tên"           value={form.name}     onChangeText={v => setF('name', v)}     placeholder="Nguyễn Văn A"   autoCapitalize="words"       error={errors.name} />
          <Input label="Email"               value={form.email}    onChangeText={v => setF('email', v)}    placeholder="your@email.com"  keyboardType="email-address" autoCapitalize="none" error={errors.email} />
          <Input label="Mật khẩu"           value={form.password} onChangeText={v => setF('password', v)} placeholder="••••••••"        secureTextEntry              error={errors.password} />
          <Input label="Xác nhận mật khẩu" value={form.confirm}  onChangeText={v => setF('confirm', v)}  placeholder="••••••••"        secureTextEntry              error={errors.confirm} />
          <Button label="Đăng ký & Thiết lập PIN" onPress={handleRegister} loading={loading} />
        </View>

        <View style={s.secBadge}>
          <Text style={s.secTxt}>🔒 Dữ liệu được mã hoá · Bảo mật đa lớp</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  wrap:      { flexGrow: 1, backgroundColor: '#fff', padding: 24, justifyContent: 'center' },
  logoWrap:  { alignItems: 'center', marginBottom: 32 },
  logo:      { width: 84, height: 84, borderRadius: 26, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  appName:   { fontSize: 26, fontWeight: '700', color: COLORS.dark, marginBottom: 4 },
  tagline:   { fontSize: 14, color: COLORS.textSecondary },
  form:      { backgroundColor: COLORS.bg, borderRadius: 20, padding: 20, marginBottom: 16 },
  formTitle: { fontSize: 20, fontWeight: '700', color: COLORS.dark, marginBottom: 20 },
  bioBtn:    {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, marginTop: 14,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 14, paddingVertical: 14,
  },
  bioIcon:  { fontSize: 22 },
  bioTxt:   { fontSize: 15, fontWeight: '600', color: COLORS.primary },
  link:     { marginTop: 16, alignItems: 'center' },
  linkTxt:  { fontSize: 14, color: COLORS.textSecondary },
  secBadge: { backgroundColor: '#E1F5EE', borderRadius: 14, padding: 12, alignItems: 'center' },
  secTxt:   { fontSize: 12, color: '#085041', fontWeight: '500' },
});
