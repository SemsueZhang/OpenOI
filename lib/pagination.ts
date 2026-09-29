export const PAGE_SIZE = 20;

export function normalizePage(value: number): number {
  return Number.isSafeInteger(value) && value > 0 && value <= Math.floor(Number.MAX_SAFE_INTEGER / PAGE_SIZE) ? value : 1;
}

export function pageRange(page: number): [number, number] {
  const start = (normalizePage(page) - 1) * PAGE_SIZE;
  return [start, start + PAGE_SIZE - 1];
}

export function pageForRank(rank: number): number {
  return Math.floor(rank / PAGE_SIZE) + 1;
}
