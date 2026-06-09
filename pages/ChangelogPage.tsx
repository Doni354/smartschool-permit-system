import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Rocket, Sparkles, Wrench } from 'lucide-react';

interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  type: 'major' | 'minor' | 'patch';
  changes: string[];
}

const CHANGELOG: ChangelogEntry[] = [
  {
    version: '3.0',
    date: '10 Juni 2026',
    title: 'Sistem Approval & Keamanan Lanjut',
    type: 'major',
    changes: [
      'Sistem persetujuan admin untuk izin masuk & keluar',
      'Integrasi Firebase Cloud Functions untuk manajemen admin yang aman',
      'Dukungan role-based access control (Super Admin vs Admin Piket)',
      'Label status visual (Disetujui/Menunggu) di Dashboard Admin',
      'Format tanda tangan dinamis pada struk PDF sesuai wewenang user',
      'Peningkatan ekspor XLSX dan CSV dengan log approval'
    ],
  },
  {
    version: '2.0',
    date: '14 Mei 2026',
    title: 'Fitur Baru & Enhancement Besar',
    type: 'major',
    changes: [
      'Halaman Form Dispensasi self-service untuk siswa (/dispen)',
      'Halaman Rekap Data Siswa publik (/rekap-siswa)',
      'Ekspor data ke Excel (.xlsx) di semua tabel',
      'Grafik tren harian 7 hari terakhir di Dashboard',
      'Rekap bulan ini di Dashboard (per kelas, top siswa)',
      'Rekapitulasi per bulan dengan month picker & filter kelas di Laporan',
      'Section "Hari Ini" di tab Terlambat & Izin Keluar untuk cetak cepat',
      'Pagination (10/25/50/100) di semua tabel data',
      'NameAutocomplete di modal admin buat surat',
      'Navigasi antar halaman publik',
      'Halaman Panduan penggunaan aplikasi',
      'Changelog versi aplikasi',
    ],
  },
  {
    version: '1.1',
    date: '25 Februari 2026',
    title: 'Perbaikan UX & Responsive',
    type: 'minor',
    changes: [
      'Improved UX form input siswa',
      'Perbaikan UI tampilan dashboard',
      'Peningkatan halaman rekapitulasi',
      'Full responsive design untuk smartphone piket',
    ],
  },
  {
    version: '1.0',
    date: '28 Januari 2026',
    title: 'Rilis Pertama',
    type: 'major',
    changes: [
      'Pencatatan siswa terlambat',
      'Pembuatan surat izin masuk & keluar (PDF)',
      'Login admin dengan Firebase Auth',
      'Dashboard admin dengan statistik',
      'Pencarian & filter data',
      'Rekapitulasi data otomatis',
    ],
  },
];

const typeIcon = { major: Rocket, minor: Sparkles, patch: Wrench };
const typeBg = {
  major: 'bg-blue-100 text-blue-700 border-blue-200',
  minor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  patch: 'bg-slate-100 text-slate-600 border-slate-200',
};

export const ChangelogPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-100">
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-3">
            <Link to="/" className="text-slate-400 hover:text-white transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Changelog</h1>
              <p className="text-slate-400 text-sm">Riwayat perubahan E-Dispen</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {CHANGELOG.map((entry, idx) => {
          const Icon = typeIcon[entry.type];
          return (
            <div key={entry.version} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-5">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${typeBg[entry.type]}`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2 flex-wrap mb-1">
                      <span className="text-lg font-bold text-slate-800">v{entry.version}</span>
                      <span className="text-sm text-slate-400">{entry.date}</span>
                      {idx === 0 && (
                        <span className="text-xs bg-blue-600 text-white px-2.5 py-0.5 rounded-full font-semibold animate-pulse">
                          Terbaru
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-slate-600 mb-3">{entry.title}</p>
                    <ul className="space-y-1.5">
                      {entry.changes.map((c, i) => (
                        <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                          <span className="text-blue-400 mt-1.5 shrink-0">
                            <svg width="6" height="6" viewBox="0 0 6 6" fill="currentColor"><circle cx="3" cy="3" r="3" /></svg>
                          </span>
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        <div className="flex gap-2 pt-4">
          <Link to="/" className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-sm py-3 rounded-xl transition-all">
            ← Kembali ke Beranda
          </Link>
          <Link to="/panduan" className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-3 rounded-xl transition-all shadow-sm">
            📖 Panduan Penggunaan
          </Link>
        </div>

        <p className="text-center text-xs text-slate-400 pb-6">E-Dispen v2 &copy; 2026</p>
      </div>
    </div>
  );
};
