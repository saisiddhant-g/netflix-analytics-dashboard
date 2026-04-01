/**
 * Reusable data transformation utilities for the Netflix dashboard.
 */

/** Groups an array of items by a key and counts occurrences. */
export function countByKey<T>(data: T[], key: keyof T): Record<string, number> {
  return data.reduce((acc, item) => {
    const val = String(item[key] ?? 'Unknown');
    acc[val] = (acc[val] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

/** Groups an array of items by a key, returning arrays of items per group. */
export function groupByKey<T>(data: T[], key: keyof T): Record<string, T[]> {
  return data.reduce((acc, item) => {
    const val = String(item[key] ?? 'Unknown');
    (acc[val] = acc[val] || []).push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

/** Converts a Record<string, number> to a sorted array of { name, value } objects. */
export function toNameValueArray(counts: Record<string, number>): { name: string; value: number }[] {
  return Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

/** Returns the top N entries from a { name, value }[] array. */
export function topN(data: { name: string; value: number }[], n: number) {
  return data.slice(0, n);
}

/** Calculates percentage of each entry relative to the total. */
export function withPercentages(data: { name: string; value: number }[]) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  return data.map(d => ({ ...d, percentage: total > 0 ? +((d.value / total) * 100).toFixed(1) : 0 }));
}

/** Groups items by year using a numeric year field. */
export function groupByYear<T extends { release_year: number }>(data: T[]): Record<number, T[]> {
  return data.reduce((acc, item) => {
    (acc[item.release_year] = acc[item.release_year] || []).push(item);
    return acc;
  }, {} as Record<number, T[]>);
}
