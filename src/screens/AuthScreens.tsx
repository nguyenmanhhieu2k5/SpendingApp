import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { COLORS } from '../utils/constants';
import { Button, Input } from '../components/UI';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// ─── Login ────────────────────────────────────────────────────────────────────
export function LoginScreen({ navigation }: { navigation: Nav }) {
  const { login } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  function validate() {
    const e: typeof errors = {};
    if (!email.includes('@')) e.email = 'Email không hợp lệ';
    if (password.length < 6)  e.password = 'Mật khẩu tối thiểu 6 ký tự';
    setErrors(e);
    return !Object.keys(e).length;
  }

  async function handle() {
    if (!validate()) return;
    setLoading(true);
    try {
      await login(email.trim(), password);
      // No navigation.replace() needed — AppNavigator re-renders automatically
      // based on isAuthenticated + isPinVerified state
    } catch (err: any) {
      Alert.alert('Lỗi đăng nhập', err.message ?? 'Vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={s.wrap}>
        <View style={s.logoWrap}>
          <View style={s.logo}><Text style={{ fontSize: 36 }}>💰</Text></View>
          <Text style={s.appName}>SpendingApp</Text>
          <Text style={s.tagline}>Quản lý chi tiêu thông minh</Text>
        </View>
        <View style={s.form}>
          <Text style={s.title}>Đăng nhập</Text>
          <Input
            label="Email" value={email} onChangeText={setEmail}
            placeholder="your@email.com" keyboardType="email-address"
            autoCapitalize="none" error={errors.email}
          />
          <Input
            label="Mật khẩu" value={password} onChangeText={setPassword}
            placeholder="••••••••" secureTextEntry error={errors.password}
          />
          <Button label="Đăng nhập" onPress={handle} loading={loading} style={{ marginTop: 4 }} />
          <TouchableOpacity style={s.link} onPress={() => navigation.navigate('Register')}>
            <Text style={s.linkTxt}>
              Chưa có tài khoản? <Text style={{ color: COLORS.primary, fontWeight: '600' }}>Đăng ký</Text>
            </Text>
          </TouchableOpacity>
        </View>
        <View style={s.badge}>
          <Text style={s.badgeTxt}>🔒 Bảo mật 2 lớp · Mã hoá AES-256</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Register ─────────────────────────────────────────────────────────────────
export function RegisterScreen({ navigation }: { navigation: Nav }) {
  const { register } = useApp();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function setF(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  function validate() {
    const e: Record<string, string> = {};
    if (form.name.trim().length < 2) e.name = 'Tên tối thiểu 2 ký tự';
    if (!form.email.includes('@'))   e.email = 'Email không hợp lệ';
    if (form.password.length < 6)   e.password = 'Mật khẩu tối thiểu 6 ký tự';
    if (form.password !== form.confirm) e.confirm = 'Mật khẩu không khớp';
    setErrors(e);
    return !Object.keys(e).length;
  }

  async function handle() {
    if (!validate()) return;
    setLoading(true);
    try {
      await register(form.name, form.email.trim(), form.password);
      // No navigation needed — state.needsPinSetup = true triggers PinSetup automatically
    } catch (err: any) {
      Alert.alert('Lỗi', err.message ?? 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={s.wrap}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 16 }}>
          <Text style={{ color: COLORS.primary, fontSize: 15, fontWeight: '500' }}>← Quay lại</Text>
        </TouchableOpacity>
        <View style={s.form}>
          <Text style={s.title}>Tạo tài khoản</Text>
          <Input label="Họ và tên" value={form.name} onChangeText={v => setF('name', v)} placeholder="Nguyễn Văn A" error={errors.name} />
          <Input label="Email" value={form.email} onChangeText={v => setF('email', v)} placeholder="your@email.com" keyboardType="email-address" autoCapitalize="none" error={errors.email} />
          <Input label="Mật khẩu" value={form.password} onChangeText={v => setF('password', v)} placeholder="••••••••" secureTextEntry error={errors.password} />
          <Input label="Xác nhận mật khẩu" value={form.confirm} onChangeText={v => setF('confirm', v)} placeholder="••••••••" secureTextEntry error={errors.confirm} />
          <Button label="Đăng ký & Thiết lập PIN" onPress={handle} loading={loading} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  wrap: { flexGrow: 1, backgroundColor: '#fff', padding: 24, justifyContent: 'center' },
  logoWrap: { alignItems: 'center', marginBottom: 36 },
  logo: { width: 72, height: 72, borderRadius: 22, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  appName: { fontSize: 24, fontWeight: '700', color: COLORS.dark, marginBottom: 4 },
  tagline: { fontSize: 14, color: COLORS.textSecondary },
  form: { backgroundColor: COLORS.bg, borderRadius: 20, padding: 20 },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.dark, marginBottom: 20 },
  link: { marginTop: 16, alignItems: 'center' },
  linkTxt: { fontSize: 14, color: COLORS.textSecondary },
  badge: { marginTop: 24, backgroundColor: '#E1F5EE', borderRadius: 12, padding: 10, alignItems: 'center' },
  badgeTxt: { fontSize: 12, color: '#085041', fontWeight: '500' },
});
