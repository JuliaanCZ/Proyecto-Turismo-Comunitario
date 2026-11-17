export const PAGE_SIZE = 10;

export function normalizePage(raw, total) {
  const parsed = typeof raw === 'string' && /^\d+$/.test(raw) ? Number(raw) : raw;
  const requested = Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
  return Math.min(requested, Math.max(1, Math.ceil(total / PAGE_SIZE)));
}
