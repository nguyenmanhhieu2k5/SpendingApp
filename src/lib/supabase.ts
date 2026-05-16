import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Transaction, Goal, User, BudgetSettings, Category } from '../types';

// ─── Config — replace with your values ───────────────────────────────────────
const SUPABASE_URL  = 'eror';
const SUPABASE_ANON = 'eror';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const AuthService = {
  async signUp(email: string, password: string, name: string) {
    const { data, error } = await supabase.auth.signUp({
      email, password, options: { data: { name } },
    });
    if (error) throw error;
    return data;
  },
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },
  async getSession() {
    const { data } = await supabase.auth.getSession();
    return data.session;
  },
};

// ─── DB row types (matches migration.sql) ────────────────────────────────────
interface DbProfile {
  id: string; name: string; email: string; avatar: string;
  pin_hash: string | null; biometric_enabled: boolean;
  two_factor_enabled: boolean; created_at: string;
}

// NOTE: uses txn_type, display_date, txn_timestamp — all safe names
interface DbTransaction {
  id: string; user_id: string; name: string; amt: number;
  cat: Category; txn_type: 'exp' | 'inc';
  display_date: string; txn_timestamp: number; created_at: string;
}

interface DbGoal {
  id: string; user_id: string; name: string;
  target_amt: number; saved_amt: number; emoji: string; created_at: string;
}

interface DbBudget {
  id: string; user_id: string; total_amt: number;
  category_limits: Record<Category, number>; updated_at: string;
}

// ─── Profile ──────────────────────────────────────────────────────────────────
export const ProfileService = {
  async get(userId: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('profiles').select('*').eq('id', userId).single();
    if (error) return null;
    const r = data as DbProfile;
    return {
      id: r.id, name: r.name, email: r.email, avatar: r.avatar,
      pin: r.pin_hash || undefined,
      biometricEnabled: r.biometric_enabled,
      twoFactorEnabled: r.two_factor_enabled,
      createdAt: new Date(r.created_at).getTime(),
    };
  },
  async upsert(user: User): Promise<void> {
    const { error } = await supabase.from('profiles').upsert({
      id: user.id, name: user.name, email: user.email, avatar: user.avatar,
      biometric_enabled: user.biometricEnabled,
      two_factor_enabled: user.twoFactorEnabled,
    });
    if (error) throw error;
  },
  async updateSecurity(userId: string, opts: { biometricEnabled?: boolean; twoFactorEnabled?: boolean }) {
    const patch: Record<string, boolean> = {};
    if (opts.biometricEnabled  !== undefined) patch.biometric_enabled  = opts.biometricEnabled;
    if (opts.twoFactorEnabled  !== undefined) patch.two_factor_enabled = opts.twoFactorEnabled;
    const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
    if (error) throw error;
  },
  async updatePin(userId: string, pin: string): Promise<void> {
    const { error } = await supabase.from('profiles').update({ pin_hash: pin }).eq('id', userId);
    if (error) throw error;
  },
};

// ─── Transactions ─────────────────────────────────────────────────────────────
export const TransactionService = {
  async getAll(userId: string): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions').select('*')
      .eq('user_id', userId).order('txn_timestamp', { ascending: false });
    if (error) throw error;
    return (data as DbTransaction[]).map(r => ({
      id: r.id, name: r.name, amt: r.amt,
      cat: r.cat, type: r.txn_type,
      date: r.display_date, timestamp: r.txn_timestamp,
    }));
  },
  async insert(userId: string, txn: Transaction): Promise<void> {
    const { error } = await supabase.from('transactions').insert({
      id: txn.id, user_id: userId, name: txn.name, amt: txn.amt,
      cat: txn.cat, txn_type: txn.type,
      display_date: txn.date, txn_timestamp: txn.timestamp,
    });
    if (error) throw error;
  },
  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) throw error;
  },
  subscribe(
    userId: string,
    onInsert: (t: Transaction) => void,
    onDelete: (id: string) => void,
  ) {
    return supabase.channel(`txns:${userId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'transactions', filter: `user_id=eq.${userId}` },
        payload => {
          const r = payload.new as DbTransaction;
          onInsert({ id: r.id, name: r.name, amt: r.amt, cat: r.cat,
            type: r.txn_type, date: r.display_date, timestamp: r.txn_timestamp });
        })
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'transactions', filter: `user_id=eq.${userId}` },
        payload => onDelete((payload.old as DbTransaction).id))
      .subscribe();
  },
};

// ─── Goals ────────────────────────────────────────────────────────────────────
export const GoalService = {
  async getAll(userId: string): Promise<Goal[]> {
    const { data, error } = await supabase
      .from('goals').select('*').eq('user_id', userId).order('created_at');
    if (error) throw error;
    return (data as DbGoal[]).map(r => ({
      id: r.id, name: r.name, target: r.target_amt,
      saved: r.saved_amt, emoji: r.emoji,
      createdAt: new Date(r.created_at).getTime(),
    }));
  },
  async insert(userId: string, goal: Goal): Promise<void> {
    const { error } = await supabase.from('goals').insert({
      id: goal.id, user_id: userId, name: goal.name,
      target_amt: goal.target, saved_amt: goal.saved, emoji: goal.emoji,
    });
    if (error) throw error;
  },
  async updateSaved(id: string, saved: number): Promise<void> {
    const { error } = await supabase.from('goals').update({ saved_amt: saved }).eq('id', id);
    if (error) throw error;
  },
  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('goals').delete().eq('id', id);
    if (error) throw error;
  },
};

// ─── Budget ───────────────────────────────────────────────────────────────────
export const BudgetService = {
  async get(userId: string): Promise<BudgetSettings | null> {
    const { data, error } = await supabase
      .from('budgets').select('*').eq('user_id', userId).single();
    if (error) return null;
    const r = data as DbBudget;
    return { total: r.total_amt, categoryLimits: r.category_limits };
  },
  async upsert(userId: string, budget: BudgetSettings): Promise<void> {
    const { error } = await supabase.from('budgets').upsert({
      user_id: userId, total_amt: budget.total,
      category_limits: budget.categoryLimits,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    if (error) throw error;
  },
};

// ─── Sync all ─────────────────────────────────────────────────────────────────
export async function syncFromSupabase(userId: string) {
  const [transactions, goals, budget, profile] = await Promise.all([
    TransactionService.getAll(userId),
    GoalService.getAll(userId),
    BudgetService.get(userId),
    ProfileService.get(userId),
  ]);
  return { transactions, goals, budget, profile };
}
