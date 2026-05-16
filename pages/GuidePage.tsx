import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Clock, FileText, Users, BarChart2, Printer, Download, Search, LogIn, ChevronDown, ChevronUp } from 'lucide-react';

interface Step {
  icon: React.ReactNode;
  title: string;
  description: string;
  details: string[];
  color: string;
}

const STEPS: Step[] = [
  {
    icon: <Clock size={22} />,
    title: '1. Catat Keterlambatan Siswa',
    description: 'Siswa yang terlambat mengisi form sendiri di halaman utama.',
    details: [
      'Buka halaman utama aplikasi ( / )',
      'Ketik nama lengkap — otomatis ada saran dari data sebelumnya',
      'Pilih kelas (X/XI/XII + huruf kelas)',
      'Isi alasan keterlambatan',
      'Klik "Lanjut" → cek data → klik "Kirim"',
      'Data otomatis tersimpan, guru piket bisa langsung cetak surat',
    ],
    color: 'amber',
  },
  {
    icon: <FileText size={22} />,
    title: '2. Ajukan Dispensasi / Izin Keluar',
    description: 'Siswa yang perlu izin keluar bisa mengisi form dispensasi.',
    details: [
      'Buka halaman /dispen',
      'Isi nama, kelas, dan alasan dispensasi',
      'Opsional: isi waktu rencana kembali',
      'Klik "Lanjut" → cek data → klik "Kirim"',
      'Data masuk ke sistem, guru piket bisa cetak surat izin keluar',
    ],
    color: 'indigo',
  },
  {
    icon: <Users size={22} />,
    title: '3. Lihat Rekap Data Siswa',
    description: 'Siapa saja bisa melihat rekap keterlambatan & dispensasi.',
    details: [
      'Buka halaman /rekap-siswa',
      'Lihat statistik bulan ini (terlambat, dispen, total siswa)',
      'Cari nama siswa atau filter per kelas',
      'Siswa dengan ≥5 kali tercatat akan diberi peringatan merah',
    ],
    color: 'slate',
  },
  {
    icon: <LogIn size={22} />,
    title: '4. Login Admin (Guru Piket)',
    description: 'Admin/guru piket masuk ke dashboard melalui halaman login.',
    details: [
      'Buka halaman /login',
      'Masukkan email & password admin',
      'Setelah login, otomatis masuk ke Dashboard admin',
      'Akun admin dibuat oleh pengelola sistem',
    ],
    color: 'blue',
  },
  {
    icon: <BarChart2 size={22} />,
    title: '5. Dashboard Admin',
    description: 'Lihat ringkasan data hari ini, tren 7 hari, dan rekap bulan.',
    details: [
      'Kartu statistik: terlambat & izin keluar hari ini',
      'Grafik tren harian 7 hari terakhir (batang kuning & biru)',
      'Rekap bulan ini: total, per kelas (bisa filter X/XI/XII), top siswa',
      'Daftar aktivitas terbaru',
    ],
    color: 'emerald',
  },
  {
    icon: <Printer size={22} />,
    title: '6. Cetak Surat Izin',
    description: 'Cetak surat izin masuk / keluar langsung dari tabel data.',
    details: [
      'Di tab "Siswa Terlambat" atau "Izin Keluar"',
      'Lihat section "Hari Ini" di atas — klik ikon 🖨️ untuk cetak cepat',
      'Atau cari di tabel bawah → klik ikon printer',
      'Surat otomatis ke halaman cetak, tinggal print',
      '⚠️ Format surat sudah dikalibrasi untuk printer mini, JANGAN diubah',
    ],
    color: 'violet',
  },
  {
    icon: <Search size={22} />,
    title: '7. Cari & Filter Data',
    description: 'Filter data berdasarkan nama, kelas, tanggal, dan tahun ajaran.',
    details: [
      'Ketik di kolom pencarian untuk cari nama/kelas/alasan',
      'Filter per tingkat (X/XI/XII) dan per huruf kelas',
      'Filter berdasarkan rentang tanggal',
      'Filter per tahun ajaran',
      'Data otomatis ter-paginasi (10/25/50/100 per halaman)',
    ],
    color: 'orange',
  },
  {
    icon: <Download size={22} />,
    title: '8. Ekspor ke Excel',
    description: 'Download data sebagai file Excel (.xlsx) untuk laporan.',
    details: [
      'Di setiap tabel, klik tombol hijau "Ekspor"',
      'File .xlsx terdownload otomatis berisi data yang sedang ditampilkan',
      'Data yang terfilter saat itu yang akan diekspor',
      'Bisa ekspor dari: Siswa Terlambat, Izin Keluar, Laporan, Rekap Bulanan',
    ],
    color: 'teal',
  },
];

const colorMap: Record<string, { bg: string; text: string; border: string; light: string }> = {
  amber: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', light: 'bg-amber-50' },
  indigo: { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200', light: 'bg-indigo-50' },
  slate: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', light: 'bg-slate-50' },
  blue: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', light: 'bg-blue-50' },
  emerald: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', light: 'bg-emerald-50' },
  violet: { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-200', light: 'bg-violet-50' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', light: 'bg-orange-50' },
  teal: { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-200', light: 'bg-teal-50' },
};

const StepCard: React.FC<{ step: Step; index: number }> = ({ step, index }) => {
  const [open, setOpen] = useState(index === 0);
  const c = colorMap[step.color];

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm transition-all ${open ? 'ring-2 ring-blue-100' : ''}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full p-4 sm:p-5 flex items-center gap-3 text-left hover:bg-slate-50/50 transition-colors"
      >
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${c.bg} ${c.text} ${c.border}`}>
          {step.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-slate-800 text-sm sm:text-base">{step.title}</h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{step.description}</p>
        </div>
        <div className="text-slate-400 shrink-0">
          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>
      {open && (
        <div className={`px-4 sm:px-5 pb-4 sm:pb-5 border-t ${c.border}`}>
          <div className={`${c.light} rounded-xl p-3 sm:p-4 mt-3`}>
            <ul className="space-y-2">
              {step.details.map((d, i) => (
                <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                  <span className={`${c.text} font-bold text-xs mt-0.5 shrink-0`}>{i + 1}.</span>
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export const GuidePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-100">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-4">
            <Link to="/" className="text-white/60 hover:text-white transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Panduan Penggunaan</h1>
              <p className="text-blue-200 text-sm">E-Dispen — Sistem Dispensasi & Pencatatan Keterlambatan</p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur rounded-xl p-4 mt-2">
            <p className="text-sm text-blue-100 leading-relaxed">
              <strong className="text-white">E-Dispen</strong> adalah sistem informasi untuk mencatat keterlambatan siswa
              dan mengelola surat izin masuk/keluar secara digital. Berikut panduan step-by-step penggunaannya.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">
        {/* Quick access */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 mb-3">🔗 Akses Cepat Halaman</h3>
          <div className="grid grid-cols-2 gap-2">
            <Link to="/" className="flex items-center gap-2 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold p-3 rounded-xl border border-amber-200 transition-all">
              <Clock size={16} /> Catat Terlambat
            </Link>
            <Link to="/dispen" className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold p-3 rounded-xl border border-indigo-200 transition-all">
              <FileText size={16} /> Form Dispensasi
            </Link>
            <Link to="/rekap-siswa" className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold p-3 rounded-xl border border-slate-200 transition-all">
              <Users size={16} /> Rekap Siswa
            </Link>
            <Link to="/login" className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold p-3 rounded-xl border border-blue-200 transition-all">
              <LogIn size={16} /> Login Admin
            </Link>
          </div>
        </div>

        {/* Steps */}
        {STEPS.map((step, i) => (
          <StepCard key={i} step={step} index={i} />
        ))}

        {/* Footer links */}
        <div className="flex gap-2 pt-4">
          <Link to="/" className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-sm py-3 rounded-xl transition-all">
            ← Kembali
          </Link>
          <Link to="/changelog" className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-sm py-3 rounded-xl transition-all shadow-sm">
            📋 Changelog
          </Link>
        </div>

        <p className="text-center text-xs text-slate-400 pb-6">E-Dispen v2 &copy; 2026</p>
      </div>
    </div>
  );
};
