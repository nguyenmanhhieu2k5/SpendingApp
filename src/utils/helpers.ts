export function formatVND(amount: number | undefined | null): string {
  if (amount == null || isNaN(amount)) return '0đ';
  return Math.round(amount).toLocaleString('vi-VN') + 'đ';
}

export function formatShort(amount: number | undefined | null): string {
  if (amount == null || isNaN(amount)) return '0';
  const n = Math.round(amount);
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'tr';
  if (n >= 1_000) return Math.round(n / 1_000) + 'k';
  return n.toString();
}

export function formatDateShort(timestamp: number | undefined | null): string {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function maskEmail(email: string | undefined | null): string {
  if (!email) return '';
  const [user, domain] = email.split('@');
  if (!user || !domain) return email;
  const masked = user.slice(0, 2) + '***' + user.slice(-1);
  return `${masked}@${domain}`;
}

export function getLast7Days(): string[] {
  const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const result: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    result.push(days[d.getDay()]);
  }
  return result;
}
