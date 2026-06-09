import React, { useState, useEffect } from 'react';
import { AdminUser, User, DEMO_SCHOOLS } from '../../types';
import { deleteAdminAccountTotal, resetAdminPasswordManual } from '../../services/cloudAdminService';
import { createAdminPiket, listAdmins, deleteAdminProfile } from '../../services/adminService';
import { Shield, UserPlus, Trash2, Loader2, CheckCircle, AlertCircle, X, Mail, Key, User as UserIcon, RefreshCcw, ShieldAlert } from 'lucide-react';

interface ManageAdminsProps {
  user: User;
}

export const ManageAdmins: React.FC<ManageAdminsProps> = ({ user }) => {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Create form state
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  
  // New Password Modal state
  const [showResetModal, setShowResetModal] = useState<AdminUser | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetting, setResetting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const data = await listAdmins(user.schoolId);
      setAdmins(data);
    } catch {
      showToast('Gagal memuat daftar admin', 'error');
    }
    setLoading(false);
  };

  useEffect(() => { fetchAdmins(); }, []);

  // Guard: Only Super Admin
  if (user.role !== 'SUPER_ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
        <Shield size={48} className="opacity-20" />
        <p className="font-medium text-sm">Hanya Super Admin yang dapat mengakses halaman ini.</p>
      </div>
    );
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await createAdminPiket(newEmail, newPassword, newName, user.schoolId, user.id);
      showToast(`Akun "${newName}" berhasil dibuat`, 'success');
      setNewEmail('');
      setNewPassword('');
      setNewName('');
      setShowCreateForm(false);
      fetchAdmins();
    } catch (err: any) {
      showToast(err.message || 'Gagal membuat akun', 'error');
    }
    setCreating(false);
  };

  const handleResetPassword = (admin: AdminUser) => {
    setResetPassword('');
    setShowResetModal(admin);
  };

  const submitResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showResetModal || !resetPassword) return;
    setResetting(true);
    try {
      await resetAdminPasswordManual(showResetModal.uid, resetPassword);
      showToast(`Password untuk ${showResetModal.name} berhasil diubah`, 'success');
      setShowResetModal(null);
    } catch (err: any) {
      showToast(err.message || 'Gagal mengubah password. Pastikan Cloud Functions sudah ter-deploy.', 'error');
    }
    setResetting(false);
  };

  const handleDelete = async (admin: AdminUser) => {
    if (admin.role === 'SUPER_ADMIN') {
      showToast('Tidak dapat menghapus akun Super Admin', 'error');
      return;
    }
    if (!window.confirm(`Hapus akun admin "${admin.name}" TOTAL? Akun Auth juga akan dihapus dan email bisa digunakan lagi.`)) return;
    
    setDeletingId(admin.uid);
    try {
      // Use Cloud Function for total deletion (Auth + Firestore)
      await deleteAdminAccountTotal(admin.uid);
      showToast(`Akun "${admin.name}" berhasil dihapus secara total`, 'success');
      fetchAdmins();
    } catch (err: any) {
      console.error(err);
      // Fallback: try deleting just Firestore profile if function fails
      try {
        await deleteAdminProfile(admin.uid);
        showToast(`Profil Firestore dihapus (Auth mungkin gagal).`, 'error');
        fetchAdmins();
      } catch {
        showToast('Gagal menghapus akun. Pastikan Cloud Functions sudah ter-deploy.', 'error');
      }
    }
    setDeletingId(null);
  };

  const getRoleBadge = (role: string) => {
    if (role === 'SUPER_ADMIN') {
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800"><Shield size={11} /> Super Admin</span>;
    }
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800"><UserIcon size={11} /> Admin Piket</span>;
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white animate-fade-in-down ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {notification.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span className="font-medium text-sm">{notification.msg}</span>
          <button onClick={() => setNotification(null)} className="ml-2 hover:bg-white/20 rounded-full p-0.5"><X size={15} /></button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Kelola Admin Piket</h2>
          <p className="text-sm text-slate-500">Tambah, reset password, atau hapus akun guru piket</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-semibold shadow-sm hover:shadow-md transition-all text-sm"
        >
          <UserPlus size={16} />
          <span className="hidden sm:inline">Tambah Admin</span>
        </button>
      </div>

      {/* Create Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-fade-in">
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl">
            <div className="flex justify-between items-center p-5 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800">Buat Akun Admin Piket</h3>
                <p className="text-xs text-slate-500">Akun baru akan langsung bisa login</p>
              </div>
              <button onClick={() => setShowCreateForm(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full p-2 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1.5 text-slate-700">
                  <span className="flex items-center gap-1.5"><UserIcon size={14} /> Nama Lengkap</span>
                </label>
                <input
                  type="text" required placeholder="Nama guru piket"
                  className="w-full border border-slate-300 px-3 py-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                  value={newName} onChange={e => setNewName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5 text-slate-700">
                  <span className="flex items-center gap-1.5"><Mail size={14} /> Email</span>
                </label>
                <input
                  type="email" required placeholder="guru@email.com"
                  className="w-full border border-slate-300 px-3 py-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                  value={newEmail} onChange={e => setNewEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5 text-slate-700">
                  <span className="flex items-center gap-1.5"><Key size={14} /> Password</span>
                </label>
                <input
                  type="password" required minLength={6} placeholder="Minimal 6 karakter"
                  className="w-full border border-slate-300 px-3 py-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                  value={newPassword} onChange={e => setNewPassword(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors text-sm">
                  Batal
                </button>
                <button type="submit" disabled={creating}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-lg shadow-blue-600/30 flex items-center gap-2 disabled:opacity-60 transition-all text-sm">
                  {creating && <Loader2 size={16} className="animate-spin" />}
                  Buat Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Reset Password Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[60] p-0 sm:p-4 animate-fade-in">
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl">
            <div className="flex justify-between items-center p-5 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <ShieldAlert className="text-amber-500" size={18} /> Ganti Password Manual
                </h3>
                <p className="text-xs text-slate-500">Ganti password untuk <strong>{showResetModal.name}</strong></p>
              </div>
              <button onClick={() => setShowResetModal(null)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full p-2 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={submitResetPassword} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1.5 text-slate-700">Password Baru</label>
                <input
                  type="text" required minLength={6} placeholder="Ketik password baru..." autoFocus
                  className="w-full border border-slate-300 px-3 py-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm font-mono"
                  value={resetPassword} onChange={e => setResetPassword(e.target.value)}
                />
                <p className="text-[10px] text-slate-400 mt-1">Password baru akan segera aktif tanpa email konfirmasi.</p>
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowResetModal(null)}
                  className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors text-sm">
                  Batal
                </button>
                <button type="submit" disabled={resetting}
                  className="px-5 py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-bold shadow-lg shadow-amber-500/30 flex items-center gap-2 disabled:opacity-60 transition-all text-sm">
                  {resetting && <Loader2 size={16} className="animate-spin" />}
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Memuat data admin...</p>
        </div>
      ) : admins.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
          <Shield size={40} className="opacity-20" />
          <p className="font-medium text-sm">Belum ada admin terdaftar</p>
          <p className="text-xs">Klik "Tambah Admin" untuk membuat akun admin piket baru</p>
        </div>
      ) : (
        <div className="space-y-3">
          {admins.map(admin => (
            <div key={admin.uid} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${admin.role === 'SUPER_ADMIN' ? 'bg-amber-500' : 'bg-blue-500'}`}>
                    {admin.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-800 text-sm truncate">{admin.name}</p>
                      {getRoleBadge(admin.role)}
                    </div>
                    <p className="text-xs text-slate-500 truncate">{admin.email}</p>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  {admin.role !== 'SUPER_ADMIN' && (
                    <>
                      <button
                        onClick={() => handleResetPassword(admin)}
                        disabled={resetting || !!deletingId}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Ganti Password Manual"
                      >
                        <RefreshCcw size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(admin)}
                        disabled={deletingId === admin.uid}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Hapus Akun Total (Auth + Firestore)"
                      >
                        {deletingId === admin.uid ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                      </button>
                    </>
                  )}
                </div>
              </div>
              {admin.createdAt && (
                <div className="mt-2 pt-2 border-t border-slate-100">
                  <p className="text-xs text-slate-400">
                    Dibuat: {new Date(admin.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
