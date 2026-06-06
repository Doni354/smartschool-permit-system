import * as XLSX from 'xlsx';
import { StudentPermit, PermitType } from '../types';

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
 * Export filtered permit data to XLSX file.
 */
export function exportPermitsToXlsx(
  permits: StudentPermit[],
  filename: string = 'data-izin-siswa'
) {
  const rows = permits.map((p, i) => ({
    'No': i + 1,
    'Nama Siswa': p.studentName,
    'Kelas': p.className,
    'Tipe': p.type === PermitType.LATE_ENTRY ? 'Terlambat' : 'Izin Keluar',
    'Alasan': p.reason,
    'Tanggal': new Date(p.timestamp).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric'
    }),
    'Waktu': new Date(p.timestamp).toLocaleTimeString('id-ID', {
      hour: '2-digit', minute: '2-digit'
    }),
    'Kembali': p.returnTimestamp
      ? new Date(p.returnTimestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      : '-',
    'Durasi (menit)': calculateDurationMinutes(p),
    'Tahun Ajaran': p.tahunAjaran || '-',
  }));

  const ws = XLSX.utils.json_to_sheet(rows);

  // Auto-width columns
  const colWidths = Object.keys(rows[0] || {}).map(key => ({
    wch: Math.max(
      key.length,
      ...rows.map(r => String((r as any)[key] || '').length)
    ) + 2
  }));
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data Izin');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

/**
 * Export class/student summary data to XLSX.
 */
export function exportSummaryToXlsx(
  data: { name: string; className: string; late: number; exit: number; total: number }[],
  filename: string = 'rekap-siswa'
) {
  const rows = data.map((d, i) => ({
    'No': i + 1,
    'Nama Siswa': d.name,
    'Kelas': d.className,
    'Terlambat': d.late,
    'Izin Keluar': d.exit,
    'Total': d.total,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const colWidths = Object.keys(rows[0] || {}).map(key => ({
    wch: Math.max(key.length, ...rows.map(r => String((r as any)[key] || '').length)) + 2
  }));
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Rekap');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
