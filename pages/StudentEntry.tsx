import React, { useState, useEffect } from 'react';
import { SchoolProfile, PermitType } from '../types';
import { ClassPicker } from '../components/ClassPicker';
import { NameAutocomplete } from '../components/NameAutocomplete';
import { getTahunAjaran } from '../utils/school';
import { createPermit, getPermitsBySchool } from '../services/permitService';
import { Clock, CheckCircle, AlertCircle, ArrowLeft, Send } from 'lucide-react';

interface StudentEntryProps {
  schools: SchoolProfile[];
}

/** Title Case: "budi santoso" → "Budi Santoso" */
function toTitleCase(str: string) {
  return str.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

export const StudentEntry: React.FC<StudentEntryProps> = ({ schools }) => {
  const selectedSchoolId = schools[0].id;
  const schoolName = schools[0].name;

  const [formData, setFormData] = useState({ studentName: '', className: '', reason: '' });
  const [step, setStep] = useState<'form' | 'confirm' | 'submitting' | 'success' | 'error'>('form');
  const [classError, setClassError] = useState(false);
  const [existingNames, setExistingNames] = useState<string[]>([]);

  // Load existing student names for autocomplete
  useEffect(() => {
    getPermitsBySchool(selectedSchoolId)
      .then(permits => {
        const unique = Array.from(new Set(permits.map(p => p.studentName).filter(Boolean)));
        setExistingNames(unique.sort());
      })
      .catch(() => {}); // silently fail if no access
  }, [selectedSchoolId]);

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Explicit class validation (hidden input required doesn't always fire)
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
      await createPermit({
        type: PermitType.LATE_ENTRY,
        studentName: formData.studentName.trim(),
        className: formData.className,
        reason: formData.reason.trim(),
        schoolId: selectedSchoolId,
        timestamp: now,
        tahunAjaran: getTahunAjaran(now),
        arrivalTimestamp: now,
      });
      setStep('success');
    } catch (err) {
      console.error(err);
      setStep('error');
    }
  };

  const handleReset = () => {
    setFormData({ studentName: '', className: '', reason: '' });
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
        <div className="bg-blue-600 p-6 text-white text-center">
          <Clock className="w-12 h-12 mx-auto mb-2 opacity-80" />
          <h1 className="text-2xl font-bold">Catat Keterlambatan</h1>
          <p className="text-blue-100 font-medium mt-1">{schoolName}</p>
        </div>

        <div className="p-6">
          {step === 'success' ? (
            <div className="text-center py-8 animate-fade-in">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-slate-800">Data Tersimpan!</h2>
              <p className="text-slate-600 mb-8">Silakan lapor ke guru piket untuk cetak surat.</p>
              <button onClick={handleReset} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all">
                Isi Form Lagi
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
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all">
                  Sesuai, Kirim <Send size={18} />
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleInitialSubmit} className="space-y-5">

              {/* Name input with autocomplete + auto-capitalize */}
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

              {/* Class picker with validation */}
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

              {/* Reason */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Alasan Terlambat <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-slate-900 resize-none transition-all"
                  placeholder="Contoh: Ban bocor, Bangun kesiangan, Macet..."
                  value={formData.reason}
                  onChange={e => setFormData({ ...formData, reason: e.target.value })}
                />
              </div>

              {step === 'error' && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
                  <AlertCircle size={18} />
                  <span>Gagal menyimpan data. Coba lagi.</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-blue-600/30"
              >
                Lanjut →
              </button>
            </form>
          )}
        </div>
        <div className="bg-slate-50 p-4 text-center text-xs text-slate-500">
          SmartSchool System v1.0 &copy; 2026
        </div>
      </div>
    </div>
  );
};