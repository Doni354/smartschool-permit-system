import { StudentPermit, PermitType, resolvePermitStatus, PermitStatus } from '../types';

const SCHOOL_START_HOUR = 7;  // 07:00
const SCHOOL_END_HOUR = 15;   // 15:00

/**
 * Calculate permit duration in minutes.
 * - Terlambat: arrival time - 07:00
 * - Izin Keluar with return: returnTimestamp - timestamp
 * - Izin Keluar without return: 15:00 - timestamp
 */
function calculateDurationMinutes(p: StudentPermit): number {
  const ts = new Date(p.timestamp);

  if (p.type === PermitType.LATE_ENTRY) {
    // Duration = arrival time - 07:00 on the same day
    const schoolStart = new Date(ts);
    schoolStart.setHours(SCHOOL_START_HOUR, 0, 0, 0);
    return Math.max(0, Math.round((ts.getTime() - schoolStart.getTime()) / 60000));
  }

  // EXIT_PERMIT
  if (p.returnTimestamp) {
    return Math.max(0, Math.round((p.returnTimestamp - ts.getTime()) / 60000));
  }

  // No return → duration until 15:00
  const schoolEnd = new Date(ts);
  schoolEnd.setHours(SCHOOL_END_HOUR, 0, 0, 0);
  return Math.max(0, Math.round((schoolEnd.getTime() - ts.getTime()) / 60000));
}

/**
 * Escape a CSV field: wrap in quotes if it contains comma, quote, or newline.
 */
function csvEscape(value: string | number): string {
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Trigger a CSV file download in the browser.
 */
function downloadCsv(csvContent: string, filename: string) {
  // BOM for UTF-8 so Excel/R can detect encoding correctly
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export filtered permit data to CSV file.
 */
export function exportPermitsToCsv(
  permits: StudentPermit[],
  filename: string = 'data-izin-siswa'
) {
  const headers = ['No', 'Nama Siswa', 'Kelas', 'Tipe', 'Alasan', 'Tanggal', 'Waktu', 'Kembali', 'Durasi (menit)', 'Status', 'Disetujui Oleh', 'Tahun Ajaran'];

  const rows = permits.map((p, i) => [
    i + 1,
    p.studentName,
    p.className,
    p.type === PermitType.LATE_ENTRY ? 'Terlambat' : 'Izin Keluar',
    p.reason,
    new Date(p.timestamp).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric'
    }),
    new Date(p.timestamp).toLocaleTimeString('id-ID', {
      hour: '2-digit', minute: '2-digit'
    }),
    p.returnTimestamp
      ? new Date(p.returnTimestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      : '-',
    calculateDurationMinutes(p),
    resolvePermitStatus(p) === PermitStatus.APPROVED ? 'Disetujui' : 'Menunggu',
    p.approvedBy || '-',
    p.tahunAjaran || '-',
  ]);

  const csv = [
    headers.map(csvEscape).join(','),
    ...rows.map(row => row.map(csvEscape).join(','))
  ].join('\n');

  downloadCsv(csv, filename);
}

/**
 * Export class/student summary data to CSV.
 */
export function exportSummaryToCsv(
  data: { name: string; className: string; late: number; exit: number; total: number }[],
  filename: string = 'rekap-siswa'
) {
  const headers = ['No', 'Nama Siswa', 'Kelas', 'Terlambat', 'Izin Keluar', 'Total'];

  const rows = data.map((d, i) => [
    i + 1,
    d.name,
    d.className,
    d.late,
    d.exit,
    d.total,
  ]);

  const csv = [
    headers.map(csvEscape).join(','),
    ...rows.map(row => row.map(csvEscape).join(','))
  ].join('\n');

  downloadCsv(csv, filename);
}
