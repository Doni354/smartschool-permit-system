import { StudentPermit, PermitType } from '../types';

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
  const headers = ['No', 'Nama Siswa', 'Kelas', 'Tipe', 'Alasan', 'Tanggal', 'Waktu', 'Kembali', 'Tahun Ajaran'];

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
