export type Category = 'food' | 'move' | 'shop' | 'health' | 'fun' | 'other';
export type TxnType = 'exp' | 'inc';

export interface Transaction {
  id: string;
  name: string;
  amt: number;
  cat: Category;
  type: TxnType;
  date: string;
  timestamp: number;
}

export interface Goal {
  id: string;
  name: string;
  target: number;
  saved: number;
  emoji: string;
  createdAt: number;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  time: string;
  color: string;
  read: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  pin?: string;
  biometricEnabled: boolean;
  twoFactorEnabled: boolean;
  createdAt: number;
}

export interface BudgetSettings {
  total: number;
  categoryLimits: Record<Category, number>;
}

export interface CatConfig {
  label: string;
  icon: string;
  color: string;
  bg: string;
}

export type MainTabParamList = {
  Home: undefined;
  Stats: undefined;
  Add: undefined;
  Budget: undefined;
  Profile: undefined;
  Goals: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  PinSetup: undefined;
  PinVerify: undefined;
  Main: undefined;
  EditProfile: undefined;
  Notifications: undefined;
  Currency: undefined;
  Biometric: undefined;
};
