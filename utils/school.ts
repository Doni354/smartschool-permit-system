// -- Tahun Ajaran helpers --

/**
 * Hitung tahun ajaran dari timestamp.
 * Tahun ajaran Indonesia: Juli - Juni
 * Contoh: timestamp di Feb 2026 → "2025/2026"
 */
export function getTahunAjaran(timestamp: number): string {
  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = d.getMonth(); // 0-indexed, 0=Jan
  if (month >= 6) {
    // Juli (6) ke atas = awal tahun ajaran baru
    return `${year}/${year + 1}`;
  } else {
    return `${year - 1}/${year}`;
  }
}

/**
 * Generate list tahun ajaran yang tersedia berdasarkan data permit.
 * Plus tahun ajaran saat ini selalu ada.
 */
export function getAvailableTahunAjaran(timestamps: number[]): string[] {
  const current = getTahunAjaran(Date.now());
  const set = new Set<string>([current]);
  timestamps.forEach(ts => set.add(getTahunAjaran(ts)));
  return Array.from(set).sort().reverse();
}

// -- Kelas options --
export const GRADE_LETTERS: Record<string, string[]> = {
  'X':   ['A','B','C','D','E','F','G','H','I','J'],
  'XI':  ['A','B','C','D','E','F','G','H','I','J','K'],
  'XII': ['A','B','C','D','E','F','G','H','I','J','K'],
};
export const GRADES = ['X', 'XI', 'XII'] as const;

export const ALL_CLASSES = [
  ...GRADE_LETTERS['X'].map(l => `X-${l}`),
  ...GRADE_LETTERS['XI'].map(l => `XI-${l}`),
  ...GRADE_LETTERS['XII'].map(l => `XII-${l}`),
];

/**
 * Parse a class string like "X-A" into { grade: "X", letter: "A" }
 */
export function parseClass(cls: string): { grade: string; letter: string } | null {
  const match = cls.match(/^(X{1,2}I?)-([A-K])$/);
  if (!match) return null;
  return { grade: match[1], letter: match[2] };
}
