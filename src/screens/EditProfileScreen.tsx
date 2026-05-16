import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../context/AppContext';
import { COLORS } from '../utils/constants';
import { Button, Input, Card } from '../components/UI';
import { RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const AVATARS = ['😊','😎','🦁','🐻','🦊','🐼','🐸','🦋','🌟','🔥','💎','🎯'];

export function EditProfileScreen({ navigation }: { navigation: Nav }) {
  const { state, dispatch } = useApp();
  const user = state.user!;

  const [name, setName] = useState(user.name ?? '');
  const [email] = useState(user.email ?? '');        // email không đổi được (từ Supabase auth)
  const [selectedAvatar, setSelectedAvatar] = useState(user.avatar ?? '😊');
  const [errors, setErrors] = useState<{ name?: string }>({});
  const [saving, setSaving] = useState(false);

  function validate(): boolean {
    const e: typeof errors = {};
    if (!name.trim() || name.trim().length < 2) e.name = 'Tên tối thiểu 2 ký tự';
    setErrors(e);
    return !Object.keys(e).length;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      dispatch({
        type: 'UPDATE_USER',
        payload: { name: name.trim(), avatar: selectedAvatar },
      });
      Alert.alert('✅ Đã lưu', 'Thông tin cá nhân đã được cập nhật.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView style={s.screen} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.hdr}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
            <Text style={s.backTxt}>← Quay lại</Text>
          </TouchableOpacity>
          <Text style={s.hdrTtl}>Chỉnh sửa hồ sơ</Text>
        </View>

        <View style={s.body}>
          {/* Avatar picker */}
          <Card>
            <Text style={s.sectionLbl}>Chọn avatar</Text>
            <View style={s.avatarGrid}>
              {AVATARS.map(av => (
                <TouchableOpacity
                  key={av}
                  style={[s.avatarBtn, selectedAvatar === av && s.avatarBtnOn]}
                  onPress={() => setSelectedAvatar(av)}
                >
                  <Text style={{ fontSize: 28 }}>{av}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {/* Preview */}
            <View style={s.preview}>
              <View style={s.previewCircle}>
                <Text style={{ fontSize: 36 }}>{selectedAvatar}</Text>
              </View>
              <Text style={s.previewName}>{name || 'Tên của bạn'}</Text>
            </View>
          </Card>

          {/* Info fields */}
          <Card>
            <Text style={s.sectionLbl}>Thông tin cá nhân</Text>
            <Input
              label="Họ và tên"
              value={name}
              onChangeText={t => { setName(t); setErrors({}); }}
              placeholder="Nguyễn Văn A"
              autoCapitalize="words"
              error={errors.name}
            />
            <Input
              label="Email (không thể thay đổi)"
              value={email}
              editable={false}
              containerStyle={{ opacity: 0.55 }}
            />
            <View style={s.infoBanner}>
              <Text style={s.infoTxt}>
                💡 Email gắn với tài khoản Supabase. Để đổi email vui lòng liên hệ hỗ trợ.
              </Text>
            </View>
          </Card>

          <Button
            label={saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            onPress={handleSave}
            loading={saving}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  hdr: {
    backgroundColor: COLORS.dark, padding: 20, paddingTop: 56,
    paddingBottom: 24,
  },
  back: { marginBottom: 12 },
  backTxt: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  hdrTtl: { fontSize: 22, fontWeight: '700', color: '#fff' },
  body: { padding: 16 },
  sectionLbl: {
    fontSize: 12, fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginBottom: 14,
  },
  avatarGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
    justifyContent: 'center', marginBottom: 16,
  },
  avatarBtn: {
    width: 56, height: 56, borderRadius: 18,
    backgroundColor: COLORS.bg,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'transparent',
  },
  avatarBtnOn: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  preview: { alignItems: 'center', paddingVertical: 8 },
  previewCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 3, borderColor: COLORS.primary,
  },
  previewName: { fontSize: 16, fontWeight: '600', color: COLORS.dark },
  infoBanner: {
    backgroundColor: '#FFF8E1', borderRadius: 10, padding: 10, marginTop: 4,
  },
  infoTxt: { fontSize: 12, color: '#856404', lineHeight: 18 },
});
