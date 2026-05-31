import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, Switch, Alert, Platform,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../context/AppContext';
import { COLORS } from '../utils/constants';
import { generateId } from '../utils/helpers';
import { RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// ─── Expo Notifications config ────────────────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,  // ← thêm
    shouldShowList: true,    // ← thêm
  }),
});

async function requestPermission(): Promise<boolean> {
  if (!Device.isDevice) return false; // Expo Go on simulator won't get push
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

async function scheduleDaily(hour: number, minute: number = 0): Promise<string | null> {
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '💰 Nhắc nhở chi tiêu',
        body: 'Đừng quên ghi nhận chi tiêu hôm nay!',
        sound: true,
        data: { type: 'daily_reminder' },
      },
      trigger: {
  type: 'daily',  // ← thêm
  hour,
  minute,
  repeats: true,
} as Notifications.DailyTriggerInput,
    });
    return id;
  } catch {
    return null;
  }
}

async function cancelAllScheduled() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

async function sendTestNotification() {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🧪 Thông báo thử nghiệm',
      body: 'Hệ thống thông báo SpendingApp hoạt động bình thường!',
      sound: true,
    },
    trigger: { seconds: 2 } as Notifications.TimeIntervalTriggerInput,
  });
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export function NotificationsScreen({ navigation }: { navigation: Nav }) {
  const { state, dispatch } = useApp();

  const [permGranted,   setPermGranted]   = useState(false);
  const [dailyEnabled,  setDailyEnabled]  = useState(true);
  const [budgetEnabled, setBudgetEnabled] = useState(true);
  const [goalEnabled,   setGoalEnabled]   = useState(true);
  const [reminderHour,  setReminderHour]  = useState(20);
  const scheduledId = useRef<string | null>(null);

  // Request permission on mount
  useEffect(() => {
    requestPermission().then(setPermGranted);

    // Listen for foreground notifications → add to in-app list
    const sub = Notifications.addNotificationReceivedListener(notif => {
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          id: generateId(),
          title: notif.request.content.title ?? 'Thông báo',
          body:  notif.request.content.body  ?? '',
          time:  new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          color: COLORS.primary,
          read:  false,
        },
      });
    });
    return () => sub.remove();
  }, []);

  // Re-schedule when daily settings change
  useEffect(() => {
    (async () => {
      await cancelAllScheduled();
      if (dailyEnabled && permGranted) {
        scheduledId.current = await scheduleDaily(reminderHour);
      }
    })();
  }, [dailyEnabled, reminderHour, permGranted]);

  const unread = state.notifications.filter(n => !n.read).length;

  function markRead(id: string) {
    dispatch({ type: 'MARK_NOTIF_READ', payload: id });
  }

  function markAllRead() {
    state.notifications.forEach(n => {
      if (!n.read) dispatch({ type: 'MARK_NOTIF_READ', payload: n.id });
    });
  }

  async function handleTest() {
    if (!permGranted) {
      Alert.alert('Cần quyền thông báo', 'Vui lòng cấp quyền thông báo trong Cài đặt.');
      return;
    }
    await sendTestNotification();
    Alert.alert('Đã gửi', 'Thông báo thử sẽ xuất hiện sau 2 giây.');
  }

  async function handleToggleDaily(val: boolean) {
    if (val && !permGranted) {
      const ok = await requestPermission();
      if (!ok) {
        Alert.alert('Bị từ chối', 'Vui lòng bật quyền thông báo trong Cài đặt điện thoại.');
        return;
      }
      setPermGranted(true);
    }
    setDailyEnabled(val);
  }

  const HOURS = [6, 7, 8, 9, 18, 19, 20, 21, 22];

  const listData = [
    { type: 'settings' as const },
    ...state.notifications.map(n => ({ type: 'notif' as const, data: n })),
  ];

  return (
    <View style={s.screen}>
      {/* Header */}
      <View style={s.hdr}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
          <Text style={s.backTxt}>←</Text>
        </TouchableOpacity>
        <Text style={s.hdrTtl}>Thông báo</Text>
        {unread > 0 && (
          <TouchableOpacity onPress={markAllRead} style={s.markAllBtn}>
            <Text style={s.markAllTxt}>Đọc hết ({unread})</Text>
          </TouchableOpacity>
        )}
      </View>

      {!permGranted && (
        <View style={s.permBanner}>
          <Text style={s.permTxt}>
            ⚠️ Chưa cấp quyền thông báo. Một số tính năng sẽ không hoạt động.
          </Text>
          <TouchableOpacity onPress={() => requestPermission().then(setPermGranted)}>
            <Text style={s.permBtn}>Cấp quyền →</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={listData}
        keyExtractor={(item) =>
  item.type === 'settings' ? 'settings-block' : item.data.id
}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        renderItem={({ item }) => {
          if (item.type === 'settings') {
            return (
              <View style={s.settCard}>
                <Text style={s.settTitle}>Cài đặt thông báo</Text>

                {/* Daily reminder */}
                <View style={s.settRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.settLbl}>Nhắc ghi chi tiêu hàng ngày</Text>
                    <Text style={s.settSub}>Tự động nhắc vào giờ bạn chọn</Text>
                  </View>
                  <Switch
                    value={dailyEnabled}
                    onValueChange={handleToggleDaily}
                    trackColor={{ false: '#ddd', true: COLORS.primary }}
                    thumbColor="#fff"
                  />
                </View>

                {/* Hour picker */}
                {dailyEnabled && (
                  <View style={s.hourWrap}>
                    <Text style={s.hourLbl}>Giờ nhắc nhở:</Text>
                    <View style={s.hourRow}>
                      {HOURS.map(h => (
                        <TouchableOpacity
                          key={h}
                          style={[s.hourBtn, reminderHour === h && s.hourBtnOn]}
                          onPress={() => setReminderHour(h)}
                        >
                          <Text style={[s.hourTxt, reminderHour === h && s.hourTxtOn]}>
                            {h}:00
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Budget alert */}
                <View style={s.settRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.settLbl}>Cảnh báo ngân sách</Text>
                    <Text style={s.settSub}>Khi chi tiêu vượt 90% hạn mức</Text>
                  </View>
                  <Switch
                    value={budgetEnabled}
                    onValueChange={setBudgetEnabled}
                    trackColor={{ false: '#ddd', true: COLORS.warning }}
                    thumbColor="#fff"
                  />
                </View>

                {/* Goal alert */}
                <View style={s.settRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.settLbl}>Cập nhật mục tiêu</Text>
                    <Text style={s.settSub}>Khi mục tiêu đạt mốc quan trọng</Text>
                  </View>
                  <Switch
                    value={goalEnabled}
                    onValueChange={setGoalEnabled}
                    trackColor={{ false: '#ddd', true: COLORS.success }}
                    thumbColor="#fff"
                  />
                </View>

                {/* Test button */}
                <TouchableOpacity style={s.testBtn} onPress={handleTest}>
                  <Text style={s.testTxt}>🧪 Gửi thông báo thử nghiệm</Text>
                </TouchableOpacity>

                {state.notifications.length > 0 && (
                  <Text style={[s.settTitle, { marginTop: 20 }]}>Lịch sử thông báo</Text>
                )}
              </View>
            );
          }

          const n = item.data;
          return (
            <TouchableOpacity
              style={[s.notifItem, !n.read && s.notifUnread]}
              onPress={() => markRead(n.id)}
              activeOpacity={0.75}
            >
              <View style={[s.notifDot, { backgroundColor: n.color }]} />
              <View style={{ flex: 1 }}>
                <View style={s.notifHdr}>
                  <Text style={s.notifTitle}>{n.title}</Text>
                  {!n.read && <View style={s.unreadDot} />}
                </View>
                <Text style={s.notifBody}>{n.body}</Text>
                <Text style={s.notifTime}>{n.time}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
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
  markAllBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16, paddingHorizontal: 12, paddingVertical: 5,
  },
  markAllTxt: { fontSize: 12, color: '#fff', fontWeight: '500' },
  permBanner: {
    backgroundColor: '#FFF3CD', padding: 12, margin: 16,
    borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  permTxt: { flex: 1, fontSize: 12, color: '#856404' },
  permBtn: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  settCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 4 },
  settTitle: {
    fontSize: 12, fontWeight: '700', color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14,
  },
  settRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: 0.5, borderColor: '#f0f0f0',
  },
  settLbl: { fontSize: 14, fontWeight: '500', color: COLORS.dark },
  settSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  hourWrap: { paddingVertical: 12, borderBottomWidth: 0.5, borderColor: '#f0f0f0' },
  hourLbl: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 10 },
  hourRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hourBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: COLORS.bg, borderWidth: 1.5, borderColor: '#eee',
  },
  hourBtnOn: { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary },
  hourTxt: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
  hourTxtOn: { color: COLORS.primary },
  testBtn: {
    marginTop: 14, backgroundColor: COLORS.bg, borderRadius: 12,
    padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#eee',
  },
  testTxt: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  notifItem: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
  },
  notifUnread: { backgroundColor: COLORS.primaryLight },
  notifDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4, flexShrink: 0 },
  notifHdr: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  notifTitle: { fontSize: 14, fontWeight: '600', color: COLORS.dark, flex: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
  notifBody: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  notifTime: { fontSize: 11, color: COLORS.textMuted, marginTop: 5 },
});
