import React, { createContext, useContext, useReducer, useEffect, useRef, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Transaction, Goal, Notification, User, BudgetSettings, Category } from '../types';
import { DEFAULT_BUDGET, CAT_CONFIG } from '../utils/constants';
import { generateId, formatDateShort } from '../utils/helpers';

// ─── State ────────────────────────────────────────────────────────────────────
interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  isPinVerified: boolean;
  needsPinSetup: boolean;
  isSyncing: boolean;
  currency: string;
  transactions: Transaction[];
  goals: Goal[];
  notifications: Notification[];
  budget: BudgetSettings;
  isLoading: boolean;
}

const defaultBudget: BudgetSettings = {
  total: DEFAULT_BUDGET,
  categoryLimits: {
    food: 1_500_000, move: 500_000, shop: 800_000,
    health: 500_000, fun: 500_000, other: 700_000,
  },
};

const initialState: AppState = {
  user: null, isAuthenticated: false, isPinVerified: false,
  needsPinSetup: false, isSyncing: false, currency: 'VND',
  transactions: [], goals: [],
  notifications: [
    { id: '1', title: 'Chào mừng SpendingApp!', body: 'Bắt đầu theo dõi chi tiêu ngay hôm nay.', time: 'Vừa xong', color: '#7F77DD', read: false },
  ],
  budget: defaultBudget, isLoading: true,
};

// ─── Actions ──────────────────────────────────────────────────────────────────
export type Action =
  | { type: 'HYDRATE'; payload: Partial<AppState> }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SYNCING'; payload: boolean }
  | { type: 'SET_CURRENCY'; payload: string }
  | { type: 'LOGIN'; payload: User }
  | { type: 'REGISTERED'; payload: User }
  | { type: 'VERIFY_PIN' }
  | { type: 'PIN_SETUP_DONE' }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: Partial<User> }
  | { type: 'SET_TRANSACTIONS'; payload: Transaction[] }
  | { type: 'ADD_TRANSACTION'; payload: Transaction }
  | { type: 'DELETE_TRANSACTION'; payload: string }
  | { type: 'SET_GOALS'; payload: Goal[] }
  | { type: 'ADD_GOAL'; payload: Goal }
  | { type: 'UPDATE_GOAL'; payload: { id: string; saved: number } }
  | { type: 'DELETE_GOAL'; payload: string }
  | { type: 'SET_BUDGET'; payload: BudgetSettings }
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'MARK_NOTIF_READ'; payload: string };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'HYDRATE':        return { ...state, ...action.payload, isLoading: false };
    case 'SET_LOADING':    return { ...state, isLoading: action.payload };
    case 'SET_SYNCING':    return { ...state, isSyncing: action.payload };
    case 'SET_CURRENCY':   return { ...state, currency: action.payload };
    case 'LOGIN':          return { ...state, user: action.payload, isAuthenticated: true, needsPinSetup: false, isPinVerified: !action.payload.pin };
    case 'REGISTERED':     return { ...state, user: action.payload, isAuthenticated: true, needsPinSetup: true, isPinVerified: false };
    case 'VERIFY_PIN':     return { ...state, isPinVerified: true };
    case 'PIN_SETUP_DONE': return { ...state, needsPinSetup: false, isPinVerified: true };
    case 'LOGOUT':         return { ...initialState, isLoading: false };
    case 'UPDATE_USER':    return { ...state, user: state.user ? { ...state.user, ...action.payload } : null };
    case 'SET_TRANSACTIONS': return { ...state, transactions: action.payload };
    case 'ADD_TRANSACTION':  if (state.transactions.some(t => t.id === action.payload.id)) return state;
                             return { ...state, transactions: [action.payload, ...state.transactions] };
    case 'DELETE_TRANSACTION': return { ...state, transactions: state.transactions.filter(t => t.id !== action.payload) };
    case 'SET_GOALS':      return { ...state, goals: action.payload };
    case 'ADD_GOAL':       return { ...state, goals: [...state.goals, action.payload] };
    case 'UPDATE_GOAL':    return { ...state, goals: state.goals.map(g => g.id === action.payload.id ? { ...g, saved: action.payload.saved } : g) };
    case 'DELETE_GOAL':    return { ...state, goals: state.goals.filter(g => g.id !== action.payload) };
    case 'SET_BUDGET':     return { ...state, budget: action.payload };
    case 'ADD_NOTIFICATION': return { ...state, notifications: [action.payload, ...state.notifications] };
    case 'MARK_NOTIF_READ':  return { ...state, notifications: state.notifications.map(n => n.id === action.payload ? { ...n, read: true } : n) };
    default: return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────
interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  verifyPin: (pin: string) => boolean;
  logout: () => Promise<void>;
  addTransaction: (data: Omit<Transaction, 'id' | 'timestamp'>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addGoal: (name: string, target: number, saved: number, emoji: string) => Promise<void>;
  updateGoal: (id: string, saved: number) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  setBudget: (budget: BudgetSettings) => Promise<void>;
  setupPin: (pin: string) => Promise<void>;
  enableTwoFactor: (enabled: boolean) => Promise<void>;
  manualSync: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);
const LOCAL_KEY = '@spending_expo_v1';

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const realtimeRef = useRef<any>(null);

  // ── Boot: load local cache ─────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(LOCAL_KEY);
        if (raw) {
          const cached = JSON.parse(raw);
          dispatch({
            type: 'HYDRATE',
            payload: { ...cached, isAuthenticated: false, isPinVerified: false, needsPinSetup: false },
          });
        } else {
          dispatch({ type: 'SET_LOADING', payload: false });
        }

        // Try restore Supabase session if config present
        await tryRestoreSession();
      } catch {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    })();
    return () => { realtimeRef.current?.unsubscribe?.(); };
  }, []);

  // ── Persist local cache ───────────────────────────────────────────────────
  useEffect(() => {
    if (!state.isLoading) {
      AsyncStorage.setItem(LOCAL_KEY, JSON.stringify({
        transactions: state.transactions,
        goals: state.goals,
        budget: state.budget,
        user: state.user,
        notifications: state.notifications,
        currency: state.currency,
      })).catch(() => {});
    }
  }, [state.transactions, state.goals, state.budget, state.user, state.notifications, state.currency]);

  // ── Supabase helpers (only if configured) ────────────────────────────────
  function isSupabaseConfigured(): boolean {
    try {
      const { SUPABASE_URL } = require('../lib/supabase');
      return !!(SUPABASE_URL && !SUPABASE_URL.includes('YOUR_PROJECT'));
    } catch {
      return false;
    }
  }

  async function tryRestoreSession() {
    if (!isSupabaseConfigured()) return;
    try {
      const { AuthService, ProfileService, syncFromSupabase, TransactionService } = require('../lib/supabase');
      const session = await AuthService.getSession();
      if (session?.user) {
        const profile = await ProfileService.get(session.user.id);
        if (profile) {
          dispatch({ type: 'LOGIN', payload: profile });
          await pullFromCloud(session.user.id);
          subscribeRealtime(session.user.id);
        }
      }
    } catch (e) {
      console.warn('Session restore failed:', e);
    }
  }

  async function pullFromCloud(userId: string) {
    if (!isSupabaseConfigured()) return;
    dispatch({ type: 'SET_SYNCING', payload: true });
    try {
      const { syncFromSupabase } = require('../lib/supabase');
      const { transactions, goals, budget, profile } = await syncFromSupabase(userId);
      if (transactions?.length) dispatch({ type: 'SET_TRANSACTIONS', payload: transactions });
      if (goals?.length)        dispatch({ type: 'SET_GOALS',        payload: goals });
      if (budget)               dispatch({ type: 'SET_BUDGET',       payload: budget });
      if (profile)              dispatch({ type: 'UPDATE_USER',      payload: profile });
    } catch (e) {
      console.warn('Cloud sync failed:', e);
    } finally {
      dispatch({ type: 'SET_SYNCING', payload: false });
    }
  }

  function subscribeRealtime(userId: string) {
    if (!isSupabaseConfigured()) return;
    try {
      const { TransactionService } = require('../lib/supabase');
      realtimeRef.current = TransactionService.subscribe(
        userId,
        (txn: Transaction) => dispatch({ type: 'ADD_TRANSACTION', payload: txn }),
        (id: string)       => dispatch({ type: 'DELETE_TRANSACTION', payload: id }),
      );
    } catch {}
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  async function login(email: string, password: string) {
    if (isSupabaseConfigured()) {
      // Real Supabase login
      const { AuthService, ProfileService } = require('../lib/supabase');
      const { user: authUser } = await AuthService.signIn(email, password);
      if (!authUser) throw new Error('Đăng nhập thất bại');
      const profile = await ProfileService.get(authUser.id);
      if (!profile) throw new Error('Không tìm thấy hồ sơ');
      dispatch({ type: 'LOGIN', payload: profile });
      await pullFromCloud(authUser.id);
      subscribeRealtime(authUser.id);
    } else {
      // Offline demo login — accept any email/password
      const name = email.split('@')[0];
      const user: User = {
        id: generateId(),
        name: name.charAt(0).toUpperCase() + name.slice(1),
        email,
        avatar: name.slice(0, 2).toUpperCase(),
        biometricEnabled: false,
        twoFactorEnabled: false,
        createdAt: Date.now(),
      };
      dispatch({ type: 'LOGIN', payload: user });
    }
  }

  async function register(name: string, email: string, password: string) {
    if (isSupabaseConfigured()) {
      const { AuthService, ProfileService } = require('../lib/supabase');
      const { user: authUser } = await AuthService.signUp(email, password, name);
      if (!authUser) throw new Error('Đăng ký thất bại');
      await new Promise(r => setTimeout(r, 800));
      const profile = await ProfileService.get(authUser.id);
      const user: User = profile ?? {
        id: authUser.id, name, email,
        avatar: name.slice(0, 2).toUpperCase(),
        biometricEnabled: false, twoFactorEnabled: false,
        createdAt: Date.now(),
      };
      dispatch({ type: 'REGISTERED', payload: user });
      subscribeRealtime(authUser.id);
    } else {
      // Offline demo register
      const user: User = {
        id: generateId(), name, email,
        avatar: name.slice(0, 2).toUpperCase(),
        biometricEnabled: false, twoFactorEnabled: false,
        createdAt: Date.now(),
      };
      dispatch({ type: 'REGISTERED', payload: user });
    }
  }

  function verifyPin(pin: string): boolean {
    if (!state.user?.pin) { dispatch({ type: 'VERIFY_PIN' }); return true; }
    const ok = state.user.pin === pin;
    if (ok) dispatch({ type: 'VERIFY_PIN' });
    return ok;
  }

  async function logout() {
    realtimeRef.current?.unsubscribe?.();
    if (isSupabaseConfigured()) {
      try {
        const { AuthService } = require('../lib/supabase');
        await AuthService.signOut();
      } catch {}
    }
    await AsyncStorage.removeItem(LOCAL_KEY);
    dispatch({ type: 'LOGOUT' });
  }

  // ── Transactions ──────────────────────────────────────────────────────────
  async function addTransaction(data: Omit<Transaction, 'id' | 'timestamp'>) {
    const now = Date.now();
    const txn: Transaction = {
      ...data, id: generateId(), timestamp: now,
      date: data.date || new Date(now).toLocaleDateString('vi-VN'),
    };
    dispatch({ type: 'ADD_TRANSACTION', payload: txn });
    if (state.user && isSupabaseConfigured()) {
      const { TransactionService } = require('../lib/supabase');
      TransactionService.insert(state.user.id, txn).catch(console.warn);
    }
    // Budget alert
    if (data.type === 'exp') {
      const catSpent = state.transactions
        .filter(t => t.cat === data.cat && t.type === 'exp')
        .reduce((s, t) => s + (t.amt || 0), 0) + (data.amt || 0);
      const limit = state.budget.categoryLimits[data.cat];
      if (limit && catSpent > limit * 0.9) {
        dispatch({
          type: 'ADD_NOTIFICATION',
          payload: {
            id: generateId(),
            title: '⚠️ Cảnh báo ngân sách',
            body: `${CAT_CONFIG[data.cat].label} đã dùng ${Math.round((catSpent / limit) * 100)}% hạn mức.`,
            time: formatDateShort(now),
            color: '#E24B4A',
            read: false,
          },
        });
      }
    }
  }

  async function deleteTransaction(id: string) {
    dispatch({ type: 'DELETE_TRANSACTION', payload: id });
    if (isSupabaseConfigured()) {
      const { TransactionService } = require('../lib/supabase');
      TransactionService.delete(id).catch(console.warn);
    }
  }

  async function addGoal(name: string, target: number, saved: number, emoji: string) {
    const goal: Goal = { id: generateId(), name, target, saved, emoji, createdAt: Date.now() };
    dispatch({ type: 'ADD_GOAL', payload: goal });
    if (state.user && isSupabaseConfigured()) {
      const { GoalService } = require('../lib/supabase');
      GoalService.insert(state.user.id, goal).catch(console.warn);
    }
  }

  async function updateGoal(id: string, saved: number) {
    dispatch({ type: 'UPDATE_GOAL', payload: { id, saved } });
    if (isSupabaseConfigured()) {
      const { GoalService } = require('../lib/supabase');
      GoalService.updateSaved(id, saved).catch(console.warn);
    }
  }

  async function deleteGoal(id: string) {
    dispatch({ type: 'DELETE_GOAL', payload: id });
    if (isSupabaseConfigured()) {
      const { GoalService } = require('../lib/supabase');
      GoalService.delete(id).catch(console.warn);
    }
  }

  async function setBudget(budget: BudgetSettings) {
    dispatch({ type: 'SET_BUDGET', payload: budget });
    if (state.user && isSupabaseConfigured()) {
      const { BudgetService } = require('../lib/supabase');
      BudgetService.upsert(state.user.id, budget).catch(console.warn);
    }
  }

  async function setupPin(pin: string) {
    dispatch({ type: 'UPDATE_USER', payload: { pin } });
    dispatch({ type: 'PIN_SETUP_DONE' });
  }

  async function enableTwoFactor(enabled: boolean) {
    dispatch({ type: 'UPDATE_USER', payload: { twoFactorEnabled: enabled } });
    if (state.user && isSupabaseConfigured()) {
      const { ProfileService } = require('../lib/supabase');
      ProfileService.updateSecurity(state.user.id, { twoFactorEnabled: enabled }).catch(console.warn);
    }
  }

  async function manualSync() {
    if (state.user) await pullFromCloud(state.user.id);
  }

  return (
    <AppContext.Provider value={{
      state, dispatch,
      login, register, verifyPin, logout,
      addTransaction, deleteTransaction,
      addGoal, updateGoal, deleteGoal,
      setBudget, setupPin, enableTwoFactor, manualSync,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}