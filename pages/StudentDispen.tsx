import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SchoolProfile, PermitType, PermitStatus } from '../types';
import { ClassPicker } from '../components/ClassPicker';
import { NameAutocomplete } from '../components/NameAutocomplete';
import { getTahunAjaran } from '../utils/school';
import { createPermit, getStudentNamesBySchool } from '../services/permitService';
import { FileText, CheckCircle, AlertCircle, ArrowLeft, Send, Clock, Users } from 'lucide-react';
import { VersionFooter } from '../components/VersionFooter';

interface StudentDispenProps {
  schools: SchoolProfile[];
}

function toTitleCase(str: string) {
  return str.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

export const StudentDispen: React.FC<StudentDispenProps> = ({ schools }) => {
  const selectedSchoolId = schools[0].id;
  const schoolName = schools[0].name;

  const [formData, setFormData] = useState({ studentName: '', className: '', reason: '', returnTime: '' });
  const [step, setStep] = useState<'form' | 'confirm' | 'submitting' | 'success' | 'error'>('form');
  const [classError, setClassError] = useState(false);
  const [existingNames, setExistingNames] = useState<string[]>([]);

  // Optimized: fetch only names, capped at 200 docs
  useEffect(() => {
    getStudentNamesBySchool(selectedSchoolId)
      .then(names => setExistingNames(names))
      .catch(() => {});
  }, [selectedSchoolId]);

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.className) {
      setClassError(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setClassError(false);
    setStep('confirm');
  };

  const handleFinalSubmit = async () => {
    setStep('submitting');
    try {
      const now = Date.now();
      const returnTimestamp = formData.returnTime
        ? new Date().setHours(parseInt(formData.returnTime.split(':')[0]), parseInt(formData.returnTime.split(':')[1]), 0, 0)
        : undefined;

      const createData: any = {
        type: PermitType.EXIT_PERMIT,
        studentName: formData.studentName.trim(),
        className: formData.className,
        reason: formData.reason.trim(),
        schoolId: selectedSchoolId,
        timestamp: now,
        tahunAjaran: getTahunAjaran(now),
        status: PermitStatus.PENDING,
      };
      if (returnTimestamp) createData.returnTimestamp = returnTimestamp;

      await createPermit(createData);
      setStep('success');
    } catch (err) {
      console.error(err);
      setStep('error');
    }
  };

  const handleReset = () => {
    setFormData({ studentName: '', className: '', reason: '', returnTime: '' });
    setClassError(false);
    setStep('form');
  };

  const handleNameBlur = () => {
    const normalized = toTitleCase(formData.studentName.trim());
    if (normalized) setFormData(f => ({ ...f, studentName: normalized }));
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-indigo-600 p-6 text-white text-center">
          <FileText className="w-12 h-12 mx-auto mb-2 opacity-80" />
          <h1 className="text-2xl font-bold">Form Dispensasi</h1>
          <p className="text-indigo-200 font-medium mt-1">{schoolName}</p>
        </div>

        <div className="p-6">
          {step === 'success' ? (
            <div className="text-center py-8 animate-fade-in">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-slate-800">Pengajuan Terkirim!</h2>
              <p className="text-slate-600 mb-8">Dispensasi Anda telah tercatat dan menunggu persetujuan dari guru piket. Silakan hubungi guru piket untuk proses persetujuan.</p>
              <button onClick={handleReset} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition-all">
                Ajukan Lagi
              </button>
            </div>
          ) : step === 'confirm' ? (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-700">Mohon periksa kembali data Anda. Apakah sudah sesuai?</p>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                {[
                  { label: 'Nama Lengkap', value: formData.studentName },
                  { label: 'Kelas', value: formData.className },
                  { label: 'Alasan', value: formData.reason },
                  { label: 'Rencana Kembali', value: formData.returnTime || 'Tidak ditentukan' },
                ].map(row => (
                  <div key={row.label}>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">{row.label}</span>
                    <p className="font-semibold text-slate-900 mt-0.5">{row.value}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep('form')}
                  className="flex-1 flex items-center justify-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-3 rounded-lg transition-all">
                  <ArrowLeft size={18} /> Kembali
                </button>
                <button onClick={handleFinalSubmit} disabled={step === 'submitting' as any}
                  className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition-all">
                  Kirim <Send size={18} />
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleInitialSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Nama Lengkap <span className="text-red-500">*</span>
                </label>
                <NameAutocomplete
                  value={formData.studentName}
                  onChange={val => setFormData({ ...formData, studentName: val })}
                  onBlur={handleNameBlur}
                  suggestions={existingNames}
                  placeholder="Ketik nama lengkap..."
                  required
                />
                <p className="text-xs text-slate-400 mt-1.5">Nama otomatis diformat Huruf Besar di Awal saat selesai mengetik.</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Kelas <span className="text-red-500">*</span>
                </label>
                <ClassPicker
                  value={formData.className}
                  onChange={cls => { setFormData({ ...formData, className: cls }); setClassError(false); }}
                  required
                />
                {classError && (
                  <div className="mt-2 flex items-center gap-1.5 text-red-600 bg-red-50 px-3 py-2 rounded-lg text-sm">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>Pilih kelas terlebih dahulu sebelum melanjutkan.</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Alasan Dispensasi <span className="text-red-500">*</span>
                </label>
                <textarea
                  required rows={3}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900 resize-none transition-all"
                  placeholder="Contoh: Sakit perlu pulang, Acara keluarga, dll..."
                  value={formData.reason}
                  onChange={e => setFormData({ ...formData, reason: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Rencana Kembali <span className="font-normal text-slate-400">(Opsional)</span>
                </label>
                <input
                  type="time"
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900 transition-all"
                  value={formData.returnTime}
                  onChange={e => setFormData({ ...formData, returnTime: e.target.value })}
                />
                <p className="text-xs text-slate-400 mt-1">Biarkan kosong jika tidak berencana kembali hari ini.</p>
              </div>

              {step === 'error' && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
                  <AlertCircle size={18} />
                  <span>Gagal mengirim data. Coba lagi.</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-indigo-600/30"
              >
                Lanjut →
              </button>
            </form>
          )}
        </div>
        <div className="bg-slate-50 p-4 space-y-3">
          <div className="flex gap-2">
            <Link to="/" className="flex-1 flex items-center justify-center gap-2 bg-amber-100 hover:bg-amber-200 text-amber-700 font-semibold text-xs py-2.5 rounded-lg transition-all">
              <Clock size={14} /> Catat Terlambat
            </Link>
            <Link to="/rekap-siswa" className="flex-1 flex items-center justify-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs py-2.5 rounded-lg transition-all">
              <Users size={14} /> Rekap Siswa
            </Link>
          </div>
          <VersionFooter />
        </div>
      </div>
    </div>
  );
};
