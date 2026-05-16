import React from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../context/AppContext';
import { COLORS } from '../utils/constants';
import { formatVND, maskEmail } from '../utils/helpers';
import { Card, SectionHeader } from '../components/UI';
import { RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// ─── Row ──────────────────────────────────────────────────────────────────────
function Row({
  icon, label, sub, badge, onPress, danger, rightIcon,
}: {
  icon: string; label: string; sub?: string;
  badge?: number | string; onPress?: () => void;
  danger?: boolean; rightIcon?: string;
}) {
  return (
    <TouchableOpacity
      style={s.row}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.65}
    >
      <View style={[s.rowIco, danger && { backgroundColor:'#FFF0F0' }]}>
        <Text style={{ fontSize:18 }}>{icon}</Text>
      </View>
      <View style={{ flex:1, marginLeft:12 }}>
        <Text style={[s.rowLbl, danger && { color:COLORS.danger }]}>{label}</Text>
        {sub ? <Text style={s.rowSub}>{sub}</Text> : null}
      </View>
      {badge !== undefined && (
        <View style={s.badge}>
          <Text style={s.badgeTxt}>{badge}</Text>
        </View>
      )}
      <Text style={[s.chev, danger && { color:COLORS.danger }]}>
        {rightIcon ?? '›'}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Profile Screen ───────────────────────────────────────────────────────────
export function ProfileScreen({ navigation }: { navigation: Nav }) {
  const { state, logout, manualSync } = useApp();
  const { user } = state;

  const exps      = state.transactions.filter(t => t.type==='exp');
  const totalSpent = exps.reduce((s,t) => s + (t.amt||0), 0);
  const totalInc   = state.transactions.filter(t=>t.type==='inc').reduce((s,t)=>s+(t.amt||0),0);
  const unread     = state.notifications.filter(n=>!n.read).length;

  // Display avatar — emoji or initials
  const isEmoji = user?.avatar && user.avatar.length <= 2 && /\p{Emoji}/u.test(user.avatar);

  function handleLogout() {
    Alert.alert('Đăng xuất', 'Bạn chắc chắn muốn đăng xuất?', [
      { text:'Huỷ', style:'cancel' },
      { text:'Đăng xuất', style:'destructive', onPress:async () => await logout() },
    ]);
  }

  function handleDeleteAccount() {
    Alert.alert('⚠️ Xoá tài khoản', 'Toàn bộ dữ liệu sẽ bị xoá vĩnh viễn.', [
      { text:'Huỷ', style:'cancel' },
      { text:'Xoá vĩnh viễn', style:'destructive', onPress:async () => await logout() },
    ]);
  }

  return (
    <ScrollView style={s.screen} showsVerticalScrollIndicator={false}>
      {/* ── Header ── */}
      <View style={s.hdr}>
        {/* Edit button */}
        <TouchableOpacity
          style={s.editBtn}
          onPress={() => navigation.navigate('EditProfile')}
        >
          <Text style={s.editBtnTxt}>✏️ Sửa</Text>
        </TouchableOpacity>

        {/* Avatar */}
        <TouchableOpacity
          style={s.avWrap}
          onPress={() => navigation.navigate('EditProfile')}
        >
          <Text style={isEmoji ? s.avEmoji : s.avInitials}>
            {user?.avatar ?? '?'}
          </Text>
        </TouchableOpacity>

        <Text style={s.name}>{user?.name ?? 'Người dùng'}</Text>
        <Text style={s.email}>{maskEmail(user?.email ?? '')}</Text>

        {/* Unread badge */}
        {unread > 0 && (
          <TouchableOpacity
            style={s.notifBadge}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Text style={s.notifBadgeTxt}>🔔 {unread} thông báo chưa đọc</Text>
          </TouchableOpacity>
        )}

        {/* Stats row */}
        <View style={s.statsRow}>
          <View style={s.statItem}>
            <Text style={s.statVal}>{state.transactions.length}</Text>
            <Text style={s.statLbl}>Giao dịch</Text>
          </View>
          <View style={[s.statItem, s.statDiv]}>
            <Text style={[s.statVal, { color:'#F09595' }]}>{formatVND(totalSpent)}</Text>
            <Text style={s.statLbl}>Đã chi</Text>
          </View>
          <View style={[s.statItem, s.statDiv]}>
            <Text style={[s.statVal, { color:'#C0DD97' }]}>{formatVND(totalInc)}</Text>
            <Text style={s.statLbl}>Đã thu</Text>
          </View>
        </View>
      </View>

      <View style={s.body}>
        {/* ── Tài khoản ── */}
        <Card>
          <SectionHeader title="Tài khoản" />
          <Row
            icon="👤"
            label="Chỉnh sửa hồ sơ"
            sub={user?.name}
            onPress={() => navigation.navigate('EditProfile')}
          />
          <Row
            icon="✉️"
            label="Email"
            sub={maskEmail(user?.email ?? '')}
          />
          <Row
            icon="📅"
            label="Ngày tham gia"
            sub={user?.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : '—'}
          />
        </Card>

        {/* ── Bảo mật ── */}
        <Card>
          <SectionHeader title="🔒 Bảo mật" />
          <Row
            icon="🔑"
            label="Đổi mã PIN"
            sub={user?.pin ? 'Đã thiết lập · 6 chữ số' : 'Chưa thiết lập'}
            onPress={() => navigation.navigate('PinSetup')}
          />
          <Row
            icon="👆"
            label="Vân tay / Face ID / 2FA"
            sub={[
              user?.biometricEnabled ? '✅ Sinh trắc học bật' : '⭕ Sinh trắc học tắt',
              user?.twoFactorEnabled ? '✅ 2FA bật' : '⭕ 2FA tắt',
            ].join('  ·  ')}
            onPress={() => navigation.navigate('Biometric')}
          />
        </Card>

        {/* ── Thông báo & Tiền tệ ── */}
        <Card>
          <SectionHeader title="🔔 Thông báo & Tiện ích" />
          <Row
            icon="🔔"
            label="Thông báo"
            sub="Nhắc nhở chi tiêu, cảnh báo ngân sách"
            badge={unread > 0 ? unread : undefined}
            onPress={() => navigation.navigate('Notifications')}
          />
          <Row
            icon="💱"
            label="Đơn vị tiền tệ"
            sub={`Đang dùng: ${state.currency} · Tỷ giá thực từ API`}
            onPress={() => navigation.navigate('Currency')}
          />
        </Card>

        {/* ── Supabase ── */}
        <Card>
          <SectionHeader title="☁️ Dữ liệu & Đồng bộ" />
          <Row
            icon="🔄"
            label="Đồng bộ Supabase"
            sub={state.isSyncing ? '⟳ Đang sync...' : 'Nhấn để sync ngay'}
            onPress={manualSync}
            rightIcon={state.isSyncing ? '⟳' : '›'}
          />
          <Row
            icon="🗄"
            label="Xuất toàn bộ dữ liệu"
            sub="Xuất JSON / CSV"
            onPress={() => Alert.alert('Sắp ra mắt', 'Tính năng xuất dữ liệu sẽ có sớm.')}
          />
        </Card>

        {/* ── Vùng nguy hiểm ── */}
        <Card>
          <SectionHeader title="Vùng nguy hiểm" />
          <Row icon="🚪" label="Đăng xuất" onPress={handleLogout} danger />
          <Row
            icon="🗑"
            label="Xoá tài khoản"
            sub="Xoá toàn bộ dữ liệu vĩnh viễn"
            onPress={handleDeleteAccount}
            danger
          />
        </Card>

        <Text style={s.ver}>SpendingApp v1.0.0 · Made with ❤️ in Việt Nam</Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex:1, backgroundColor:COLORS.bg },
  hdr: {
    backgroundColor: COLORS.dark, padding:24, paddingTop:56,
    alignItems:'center', position:'relative',
  },
  editBtn: {
    position:'absolute', top:56, right:20,
    backgroundColor:'rgba(255,255,255,0.15)',
    borderRadius:20, paddingHorizontal:14, paddingVertical:6,
  },
  editBtnTxt: { fontSize:13, color:'#fff', fontWeight:'500' },
  avWrap: {
    width:84, height:84, borderRadius:42,
    backgroundColor:COLORS.primary,
    alignItems:'center', justifyContent:'center',
    marginBottom:14,
    borderWidth:3, borderColor:'rgba(255,255,255,0.25)',
  },
  avEmoji:    { fontSize:40 },
  avInitials: { fontSize:28, fontWeight:'700', color:'#fff' },
  name:  { fontSize:20, fontWeight:'700', color:'#fff', marginBottom:4 },
  email: { fontSize:13, color:'rgba(255,255,255,0.55)', marginBottom:10 },
  notifBadge: {
    backgroundColor:COLORS.danger, borderRadius:20,
    paddingHorizontal:14, paddingVertical:5, marginBottom:14,
  },
  notifBadgeTxt: { fontSize:12, color:'#fff', fontWeight:'600' },
  statsRow: {
    flexDirection:'row', backgroundColor:'rgba(255,255,255,0.1)',
    borderRadius:16, padding:14, width:'100%',
  },
  statItem:  { flex:1, alignItems:'center' },
  statDiv:   { borderLeftWidth:0.5, borderColor:'rgba(255,255,255,0.2)' },
  statVal:   { fontSize:13, fontWeight:'700', color:'#fff' },
  statLbl:   { fontSize:10, color:'rgba(255,255,255,0.55)', marginTop:3 },
  body: { padding:16 },
  row: {
    flexDirection:'row', alignItems:'center',
    paddingVertical:13, borderBottomWidth:0.5, borderColor:'#f5f5f5',
  },
  rowIco: {
    width:38, height:38, borderRadius:12,
    backgroundColor:COLORS.primaryLight,
    alignItems:'center', justifyContent:'center',
  },
  rowLbl:  { fontSize:14, fontWeight:'500', color:COLORS.dark },
  rowSub:  { fontSize:11, color:COLORS.textMuted, marginTop:2 },
  badge: {
    backgroundColor:COLORS.danger, borderRadius:12,
    minWidth:22, height:22, alignItems:'center', justifyContent:'center',
    paddingHorizontal:6, marginRight:6,
  },
  badgeTxt: { fontSize:11, color:'#fff', fontWeight:'700' },
  chev:  { fontSize:20, color:'#ccc' },
  ver:   { textAlign:'center', fontSize:12, color:COLORS.textMuted, marginVertical:24 },
});
