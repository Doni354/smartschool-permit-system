import * as XLSX from 'xlsx';
import { StudentPermit, PermitType } from '../types';

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
