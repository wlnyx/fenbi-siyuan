const VOLATILE_PARAM_PATTERNS = [
  /^utm_/i,
  /^spm$/i,
  /^from$/i,
  /^source$/i,
  /^session/i,
  /^token$/i,
  /^timestamp$/i,
  /^ts$/i,
  /^t$/i,
  /^_$/i
];

export function normalizeFenbiUrl(value: string): string {
  const url = new URL(value);

  // Use forEach to collect keys to remove (avoids .keys()/.entries() which don't exist in this TS DOM lib)
  const keysToRemove: string[] = [];
  url.searchParams.forEach((_v, k) => {
    if (VOLATILE_PARAM_PATTERNS.some((pattern) => pattern.test(k))) {
      keysToRemove.push(k);
    }
  });
  for (const key of keysToRemove) {
    url.searchParams.delete(key);
  }

  // Collect and sort remaining entries
  const entries: Array<[string, string]> = [];
  url.searchParams.forEach((v, k) => {
    entries.push([k, v]);
  });
  entries.sort(([a], [b]) => a.localeCompare(b));

  url.search = "";
  for (const [key, paramValue] of entries) {
    url.searchParams.append(key, paramValue);
  }

  url.hash = "";
  return url.toString();
}
