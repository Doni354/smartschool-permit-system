import React, { useState, useEffect, useMemo } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { SchoolProfile, User, StudentPermit, PermitType } from '../types';
import { Sidebar } from '../components/Sidebar';
import { ClassPicker } from '../components/ClassPicker';
import { NameAutocomplete } from '../components/NameAutocomplete';
import { DashboardHome } from './admin/DashboardHome';
import { LateEntries } from './admin/LateEntries';
import { ExitPermits } from './admin/ExitPermits';
import { Reports } from './admin/Reports';
import { getPermitsBySchool, createPermit, deletePermit, updatePermit } from '../services/permitService';
import { getTahunAjaran } from '../utils/school';
import { CheckCircle, X, Loader2, Menu } from 'lucide-react';

interface AdminDashboardProps {
  user: User;
  school: SchoolProfile;
  onLogout: () => void;
}

// Toast
const Toast = ({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) => (
  <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white animate-fade-in-down ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
    <CheckCircle size={18} />
    <span className="font-medium text-sm">{message}</span>
    <button onClick={onClose} className="ml-2 hover:bg-white/20 rounded-full p-0.5"><X size={15} /></button>
  </div>
);



// Create/Edit Modal (responsive)
const PermitModal = ({ permit, onClose, onSave, isLoading, existingNames }: {
  permit: StudentPermit | null;
  onClose: () => void;
  onSave: (data: any, isEdit: boolean) => void;
  isLoading: boolean;
  existingNames: string[];
}) => {
  const [form, setForm] = useState({
    studentName: permit?.studentName || '',
    className: permit?.className || '',
    reason: permit?.reason || '',
    returnTime: permit?.returnTimestamp
      ? new Date(permit.returnTimestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })
      : '',
  });

  const isEdit = permit !== null;
  const isExit = permit?.type === PermitType.EXIT_PERMIT;
  const [classError, setClassError] = useState(false);

  const toTitleCase = (str: string) =>
    str.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.className) { setClassError(true); return; }
    setClassError(false);
    onSave({ ...form, studentName: form.studentName.trim() }, isEdit);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-fade-in">
      {/* Bottom sheet on mobile, centered modal on sm+ */}
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-5 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-base font-bold text-slate-800">{isEdit ? 'Edit Data Izin' : 'Buat Surat Izin Keluar'}</h2>
            <p className="text-xs text-slate-500">Isi detail dengan benar</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full p-2 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1.5 text-slate-700">Nama Siswa</label>
              <NameAutocomplete
                value={form.studentName}
                onChange={val => setForm({ ...form, studentName: val })}
                onBlur={() => setForm(f => ({ ...f, studentName: toTitleCase(f.studentName.trim()) }))}
                suggestions={existingNames}
                placeholder="Ketik nama lengkap..."
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5 text-slate-700">Kelas</label>
              <ClassPicker
                value={form.className}
                onChange={cls => { setForm({ ...form, className: cls }); setClassError(false); }}
                required
              />
              {classError && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                  <span>⚠</span> Pilih kelas terlebih dahulu.
                </p>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1.5 text-slate-700">Alasan</label>
            <textarea required rows={3} placeholder="Jelaskan alasan izin..."
              className="w-full border border-slate-300 px-3 py-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none text-sm"
              value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
          </div>
          {(!isEdit || isExit) && (
            <div>
              <label className="block text-sm font-semibold mb-1.5 text-slate-700">
                Rencana Kembali <span className="font-normal text-slate-400">(Opsional)</span>
              </label>
              <input type="time"
                className="w-full border border-slate-300 px-3 py-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                value={form.returnTime} onChange={e => setForm({ ...form, returnTime: e.target.value })} />
              <p className="text-xs text-slate-400 mt-1">Biarkan kosong jika tidak berencana kembali.</p>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors text-sm">
              Batal
            </button>
            <button type="submit" disabled={isLoading}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-lg shadow-blue-600/30 flex items-center gap-2 disabled:opacity-60 transition-all text-sm">
              {isLoading && <Loader2 size={16} className="animate-spin" />}
              {isEdit ? 'Simpan Perubahan' : 'Buat Surat'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Page title helper
function getPageInfo(pathname: string) {
  if (pathname.includes('/late')) return { title: 'Siswa Terlambat', subtitle: 'Data keterlambatan siswa' };
  if (pathname.includes('/exit')) return { title: 'Izin Keluar', subtitle: 'Kelola surat izin keluar siswa' };
  if (pathname.includes('/reports')) return { title: 'Laporan & Statistik', subtitle: 'Analisis data izin siswa' };
  return { title: 'Dashboard', subtitle: new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) };
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, school, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [permits, setPermits] = useState<StudentPermit[]>([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [modalPermit, setModalPermit] = useState<StudentPermit | null | 'new'>(null);
  const [saving, setSaving] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getPermitsBySchool(school.id);
      setPermits(data);
    } catch {
      showToast('Gagal mengambil data', 'error');
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [school.id]);

  // Close sidebar on route change (mobile)
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  const existingNames = useMemo(() => {
    const unique = Array.from(new Set(permits.map(p => p.studentName).filter(Boolean)));
    return unique.sort();
  }, [permits]);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handlePrint = (permit: StudentPermit) => {
    localStorage.setItem('printData', JSON.stringify(permit));
    window.open(`/print/${permit.id}`, '_blank');
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Yakin ingin menghapus data ini?')) return;
    try {
      await deletePermit(id);
      showToast('Data dihapus', 'success');
      fetchData();
    } catch {
      showToast('Gagal menghapus', 'error');
    }
  };

  const handleSave = async (form: any, isEdit: boolean) => {
    setSaving(true);
    try {
      const returnTimestamp = form.returnTime
        ? new Date().setHours(parseInt(form.returnTime.split(':')[0]), parseInt(form.returnTime.split(':')[1]), 0, 0)
        : null;

      if (isEdit && modalPermit && modalPermit !== 'new') {
        const updateData: any = {
          studentName: form.studentName,
          className: form.className,
          reason: form.reason,
        };
        if (returnTimestamp !== null) updateData.returnTimestamp = returnTimestamp;
        else updateData.returnTimestamp = null;
        await updatePermit((modalPermit as StudentPermit).id, updateData);
        showToast('Data diperbarui', 'success');
      } else {
        const now = Date.now();
        const createData: any = {
          type: PermitType.EXIT_PERMIT,
          studentName: form.studentName,
          className: form.className,
          reason: form.reason,
          schoolId: school.id,
          timestamp: now,
          tahunAjaran: getTahunAjaran(now),
          approvedBy: user.name,
        };
        if (returnTimestamp !== null) createData.returnTimestamp = returnTimestamp;
        await createPermit(createData);
        showToast('Surat izin dibuat', 'success');
      }
      setModalPermit(null);
      fetchData();
    } catch {
      showToast('Terjadi kesalahan', 'error');
    }
    setSaving(false);
  };

  const { title, subtitle } = getPageInfo(location.pathname);

  return (
    <div className="flex h-screen overflow-hidden font-sans bg-slate-50">
      {notification && <Toast message={notification.msg} type={notification.type} onClose={() => setNotification(null)} />}

      {/* Sidebar — responsive drawer */}
      <Sidebar
        onLogout={onLogout}
        schoolName={school.name}
        adminName={user.email}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar — mobile hamburger + page title */}
        <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 print:hidden shrink-0">
          {/* Hamburger — only on mobile */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors shrink-0"
            aria-label="Buka menu"
          >
            <Menu size={22} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 truncate">{title}</h1>
            <p className="text-xs text-slate-500 truncate hidden sm:block">{subtitle}</p>
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Routes>
            <Route index element={
              <DashboardHome permits={permits} loading={loading} onViewAll={(path) => navigate(path)} />
            } />
            <Route path="late" element={
              <LateEntries
                permits={permits} loading={loading}
                onPrint={handlePrint} onEdit={(p) => setModalPermit(p)} onDelete={handleDelete}
              />
            } />
            <Route path="exit" element={
              <ExitPermits
                permits={permits} loading={loading}
                onPrint={handlePrint} onEdit={(p) => setModalPermit(p)} onDelete={handleDelete}
                onCreateNew={() => setModalPermit('new')}
              />
            } />
            <Route path="reports" element={
              <Reports permits={permits} loading={loading}
                onEdit={(p) => setModalPermit(p)}
                onDelete={handleDelete}
              />
            } />
          </Routes>
        </main>
      </div>

      {/* Modal */}
      {modalPermit !== null && (
        <PermitModal
          permit={modalPermit === 'new' ? null : modalPermit as StudentPermit}
          onClose={() => setModalPermit(null)}
          onSave={handleSave}
          isLoading={saving}
          existingNames={existingNames}
        />
      )}
    </div>
  );
};