# Changelog - Smartschool Permit System

Semua perubahan penting pada proyek ini akan didokumentasikan di file ini.

## [V3.0.0] - 2026-06-10

### ✨ Fitur Baru (Approval Workflow)
- **Sistem Persetujuan Terpusat**: Semua pengajuan izin (Terlambat & Keluar) kini melalui status `MENUNGGU` (Pending) secara default.
- **Dashboard Admin Piket**: Admin kini bisa menyetujui (ACC) pengajuan langsung dari Dashboard Home melalui tabel "Aktivitas Terbaru".
- **Badge Status**: Penambahan label visual `DISETUJUI` (Hijau) dan `MENUNGGU` (Oranye) pada daftar izin.
- **Integrasi Cetak & Acc**: Tombol cetak surat kini otomatis terkunci (disabled) sebelum pengajuan disetujui oleh Admin.

### 🛡️ Keamanan & Cloud Functions
- **Manajemen Akun Cloud**: Implementasi Firebase Cloud Functions untuk penghapusan akun admin dan reset password secara aman dari sisi server.
- **Role Based Access Control (RBAC)**: Super Admin memiliki kontrol penuh atas manajemen admin, sementara Admin Piket fokus pada operasional harian.

### 🖨️ Pembaruan Template Cetak
- **Logika Tanda Tangan Dinamis**: 
  - Nama Guru Piket hanya muncul jika yang menyetujui adalah **Admin Piket**.
  - Jika disetujui oleh **Super Admin** atau data log lama, nama penyetuju akan dikosongkan (hanya garis tanda tangan).
- **Format Header Baru**: Optimasi layout untuk printer thermal/struk.

### 📊 Laporan & Ekspor
- **Filter Status di Laporan**: Memungkinkan filter data berdasarkan status persetujuan.
- **Optimasi Ekspor**: Perbaikan metadata pada ekspor Excel (XLSX) dan CSV.

### 🐞 Perbaikan Bug
- Perbaikan masalah CORS pada fungsi admin.
- Perbaikan pencarian otomatis (autocomplete) nama siswa yang sebelumnya kurang responsif.
- Perbaikan validasi formulir pada input kelas.

---
*Dikembangkan dengan ❤️ oleh Antigravity & USER*
