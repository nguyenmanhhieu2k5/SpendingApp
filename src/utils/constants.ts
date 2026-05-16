import { CatConfig, Category } from '../types';

export const COLORS = {
  primary:      '#7F77DD',
  primaryDark:  '#534AB7',
  primaryLight: '#EEEDFE',
  dark:         '#1a1a2e',
  success:      '#1D9E75',
  warning:      '#EF9F27',
  danger:       '#E24B4A',
  bg:           '#f2f2f7',
  card:         '#ffffff',
  textPrimary:  '#1a1a2e',
  textSecondary:'#888880',
  textMuted:    '#aaaaaa',
  border:       '#eeeeee',
};

export const CAT_CONFIG: Record<Category, CatConfig> = {
  food:   { label: 'Ăn uống',   icon: '🍜', color: '#7F77DD', bg: '#EEEDFE' },
  move:   { label: 'Di chuyển', icon: '🛵', color: '#EF9F27', bg: '#FAEEDA' },
  shop:   { label: 'Mua sắm',   icon: '🛍', color: '#1D9E75', bg: '#E1F5EE' },
  health: { label: 'Sức khoẻ',  icon: '💊', color: '#D4537E', bg: '#FBEAF0' },
  fun:    { label: 'Giải trí',  icon: '🎮', color: '#378ADD', bg: '#E6F1FB' },
  other:  { label: 'Khác',      icon: '📦', color: '#888780', bg: '#F1EFE8' },
};

export const DEFAULT_BUDGET = 5_000_000;

export const QUICK_EXPENSES = [
  { name: 'Tiền điện', amt: 350_000, cat: 'other' as Category, icon: '💡' },
  { name: 'Tiền nước', amt: 120_000, cat: 'other' as Category, icon: '🚿' },
  { name: 'Internet',  amt: 220_000, cat: 'other' as Category, icon: '📡' },
  { name: 'Grab xe',   amt:  45_000, cat: 'move'  as Category, icon: '🛵' },
  { name: 'Cà phê',   amt:  55_000, cat: 'food'  as Category, icon: '☕' },
  { name: 'Netflix',   amt:  99_000, cat: 'fun'   as Category, icon: '🎬' },
];
