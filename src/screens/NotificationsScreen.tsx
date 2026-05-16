import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, Platform, Switch, AppState,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../context/AppContext';
import { COLORS } from '../utils/constants';
import { generateId } from '../utils/helpers';
import { RootStackParamList } from '../types';

// ─── Local Notification helpers (using setTimeout — no extra lib needed) ──────
// For production: swap these with @notifee/react-native calls
let scheduledTimers: ReturnType<typeof setTimeout>[] = [];

function scheduleLocalNotif(title: string, body: string, delayMs: number) {
  const t = setTimeout(() => {
    // In real device with @notifee: notifee.displayNotification(...)
    // Here we dispatch to in-app notification list via the callback
    localNotifCallback?.(title, body);
  }, delayMs);
  scheduledTimers.push(t);
}

function cancelAllScheduled() {
  scheduledTimers.forEach(clearTimeout);
  scheduledTimers = [];
}

let localNotifCallback: ((title: string, body: string) => void) | null = null;

// ─── Reminder schedule ────────────────────────────────────────────────────────
function getMsUntilHour(hour: number): number {
  const now = new Date();
  const target = new Date();
  target.setHours(hour, 0, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  return target.getTime() - now.getTime();
}

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function NotificationsScreen({ navigation }: { navigation: Nav }) {
  const { state, dispatch } = useApp();
  const [dailyReminder, setDailyReminder] = useState(true);
  const [budgetAlert, setBudgetAlert] = useState(true);
  const [goalAlert, setGoalAlert] = useState(true);
  const [reminderHour, setReminderHour] = useState(20); // 8pm default
  const appState = useRef(AppState.currentState);

  // Register callback to push local notifs into app notification list
  useEffect(() => {
    localNotifCallback = (title: string, body: string) => {
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          id: generateId(),
          title,
          body,
          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          color: COLORS.primary,
          read: false,
        },
      });
    };
    return () => { localNotifCallback = null; };
  }, []);

  // Schedule daily reminder when toggled on
  useEffect(() => {
    cancelAllScheduled();
    if (dailyReminder) {
      const delay = getMsUntilHour(reminderHour);
      scheduleLocalNotif(
        '💰 Nhắc nhở chi tiêu',
        'Đừng quên ghi nhận chi tiêu hôm nay!',
        delay,
      );
    }
    return cancelAllScheduled;
  }, [dailyReminder, reminderHour]);

  const unread = state.notifications.filter(n => !n.read).length;

  function markRead(id: string) {
    dispatch({ type: 'MARK_NOTIF_READ', payload: id });
  }

  function markAllRead() {
    state.notifications.forEach(n => {
      if (!n.read) dispatch({ type: 'MARK_NOTIF_READ', payload: n.id });
    });
  }

  function testNotif() {
    scheduleLocalNotif('🧪 Thông báo thử', 'Hệ thống thông báo hoạt động bình thường!', 500);
    Alert.alert('Đã gửi', 'Thông báo thử sẽ xuất hiện sau 0.5 giây.');
  }

  const HOURS = [6, 7, 8, 9, 18, 19, 20, 21, 22];

  function hourLabel(h: number) {
    return h < 12 ? `${h}:00 sáng` : h === 12 ? '12:00 trưa' : `${h - 12}:00 chiều`;
  }

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

      <FlatList
        data={[{ type: 'settings' }, ...state.notifications.map(n => ({ type: 'notif', data: n }))]}
        keyExtractor={(item, i) => String(i)}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={{ fontSize: 40 }}>🔔</Text>
            <Text style={s.emptyTxt}>Chưa có thông báo nào</Text>
          </View>
        }
        renderItem={({ item }: any) => {
          if (item.type === 'settings') {
            return (
              <View style={s.settingsCard}>
                <Text style={s.settingsTitle}>Cài đặt thông báo</Text>

                {/* Daily reminder toggle */}
                <View style={s.settingRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.settingLbl}>Nhắc ghi chi tiêu hàng ngày</Text>
                    <Text style={s.settingSubLbl}>Tự động nhắc vào giờ bạn chọn</Text>
                  </View>
                  <Switch
                    value={dailyReminder}
                    onValueChange={setDailyReminder}
                    trackColor={{ false: '#ddd', true: COLORS.primary }}
                    thumbColor="#fff"
                  />
                </View>

                {/* Hour picker — only show when daily reminder is on */}
                {dailyReminder && (
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

                {/* Budget alert toggle */}
                <View style={s.settingRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.settingLbl}>Cảnh báo ngân sách</Text>
                    <Text style={s.settingSubLbl}>Khi chi tiêu vượt 90% hạn mức</Text>
                  </View>
                  <Switch
                    value={budgetAlert}
                    onValueChange={setBudgetAlert}
                    trackColor={{ false: '#ddd', true: COLORS.warning }}
                    thumbColor="#fff"
                  />
                </View>

                {/* Goal alert toggle */}
                <View style={s.settingRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.settingLbl}>Cập nhật mục tiêu</Text>
                    <Text style={s.settingSubLbl}>Khi mục tiêu đạt mốc quan trọng</Text>
                  </View>
                  <Switch
                    value={goalAlert}
                    onValueChange={setGoalAlert}
                    trackColor={{ false: '#ddd', true: COLORS.success }}
                    thumbColor="#fff"
                  />
                </View>

                {/* Test button */}
                <TouchableOpacity style={s.testBtn} onPress={testNotif}>
                  <Text style={s.testTxt}>🧪 Gửi thông báo thử nghiệm</Text>
                </TouchableOpacity>

                {/* Divider */}
                {state.notifications.length > 0 && (
                  <Text style={[s.settingsTitle, { marginTop: 20 }]}>
                    Lịch sử thông báo
                  </Text>
                )}
              </View>
            );
          }

          // Notification item
          const n = item.data;
          return (
            <TouchableOpacity
              style={[s.notifItem, !n.read && s.notifUnread]}
              onPress={() => markRead(n.id)}
              activeOpacity={0.75}
            >
              <View style={[s.notifDot, { backgroundColor: n.color }]} />
              <View style={{ flex: 1 }}>
                <View style={s.notifHeader}>
                  <Text style={s.notifTitle}>{n.title}</Text>
                  {!n.read && <View style={s.unreadBadge} />}
                </View>
                <Text style={s.notifBody}>{n.body}</Text>
                <Text style={s.notifTime}>{n.time}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={{ padding: 16, gap: 8 }}
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
  settingsCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 4,
  },
  settingsTitle: {
    fontSize: 12, fontWeight: '700', color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14,
  },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: 0.5, borderColor: '#f0f0f0',
  },
  settingLbl: { fontSize: 14, fontWeight: '500', color: COLORS.dark },
  settingSubLbl: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
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
  notifHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  notifTitle: { fontSize: 14, fontWeight: '600', color: COLORS.dark, flex: 1 },
  unreadBadge: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary,
  },
  notifBody: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  notifTime: { fontSize: 11, color: COLORS.textMuted, marginTop: 5 },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyTxt: { fontSize: 14, color: COLORS.textMuted, marginTop: 12 },
});
