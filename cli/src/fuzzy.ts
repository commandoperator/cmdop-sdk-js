/**
 * Simple case-insensitive fuzzy match.
 * Each character of `needle` must appear in `haystack` in order.
 */
export function fuzzyMatch(needle: string, haystack: string): boolean {
  const n = needle.toLowerCase();
  const h = haystack.toLowerCase();
  let hi = 0;
  for (let ni = 0; ni < n.length; ni++) {
    const idx = h.indexOf(n[ni]!, hi);
    if (idx === -1) return false;
    hi = idx + 1;
  }
  return true;
}
