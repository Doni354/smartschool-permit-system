import React, { useState, useMemo, useEffect } from 'react';
import { StudentPermit, PermitType, PermitStatus, User, resolvePermitStatus } from '../../types';
import { Search, Printer, Pencil, Trash2, X, Calendar, Filter, FilePlus, AlertCircle, ChevronDown, Download, Clock, CheckCircle2, ShieldCheck } from 'lucide-react';
import { getTahunAjaran, getAvailableTahunAjaran, GRADES, GRADE_LETTERS } from '../../utils/school';
import { exportPermitsToXlsx } from '../../utils/xlsx-export';
import { exportPermitsToCsv } from '../../utils/csv-export';
import { Pagination } from '../../components/Pagination';

interface ExitPermitsProps {
  permits: StudentPermit[];
  loading: boolean;
  onPrint: (permit: StudentPermit) => void;
  onEdit: (permit: StudentPermit) => void;
  onDelete: (id: string) => void;
  onCreateNew: () => void;
  onApprove: (permit: StudentPermit) => void;
  currentUser: User;
}

function getInitials(name: string) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

function resolveTahunAjaran(p: StudentPermit) {
  return p.tahunAjaran || getTahunAjaran(p.timestamp);
}

// Status badge component
const StatusBadge: React.FC<{ status: PermitStatus }> = ({ status }) => {
  if (status === PermitStatus.APPROVED) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">
        <CheckCircle2 size={11} /> Disetujui
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 animate-pulse">
      <Clock size={11} /> Menunggu
    </span>
  );
};

export const ExitPermits: React.FC<ExitPermitsProps> = ({ permits, loading, onPrint, onEdit, onDelete, onCreateNew, onApprove, currentUser }) => {
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [letterFilter, setLetterFilter] = useState('');
  const [selectedTA, setSelectedTA] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'' | 'PENDING' | 'APPROVED'>('');

  const handleGradeSelect = (g: string) => {
    setGradeFilter(g);
    setLetterFilter('');
  };

  const exitPermits = useMemo(() => permits.filter(p => p.type === PermitType.EXIT_PERMIT), [permits]);
  const availableTA = useMemo(() => getAvailableTahunAjaran(exitPermits.map(p => p.timestamp)), [exitPermits]);

  // Count pending
  const pendingCount = useMemo(() => exitPermits.filter(p => resolvePermitStatus(p) === PermitStatus.PENDING).length, [exitPermits]);

  const filtered = useMemo(() => {
    let data = exitPermits;
    if (selectedTA) data = data.filter(p => resolveTahunAjaran(p) === selectedTA);
    if (statusFilter) data = data.filter(p => resolvePermitStatus(p) === statusFilter);
    if (gradeFilter && letterFilter) data = data.filter(p => p.className === `${gradeFilter}-${letterFilter}`);
    else if (gradeFilter) data = data.filter(p => p.className.startsWith(gradeFilter + '-'));
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(p =>
        p.studentName.toLowerCase().includes(q) ||
        p.className.toLowerCase().includes(q) ||
        p.reason.toLowerCase().includes(q) ||
        (p.approvedBy || '').toLowerCase().includes(q)
      );
    }
    if (dateFrom) {
      const from = new Date(dateFrom); from.setHours(0, 0, 0, 0);
      data = data.filter(p => p.timestamp >= from.getTime());
    }
    if (dateTo) {
      const to = new Date(dateTo); to.setHours(23, 59, 59, 999);
      data = data.filter(p => p.timestamp <= to.getTime());
    }
    return data;
  }, [exitPermits, search, dateFrom, dateTo, gradeFilter, letterFilter, selectedTA, statusFilter]);

  const clearFilters = () => { setSearch(''); setDateFrom(''); setDateTo(''); setGradeFilter(''); setLetterFilter(''); setSelectedTA(''); setStatusFilter(''); };
  const hasFilter = search || dateFrom || dateTo || gradeFilter || letterFilter || selectedTA || statusFilter;

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  useEffect(() => { setPage(1); }, [search, dateFrom, dateTo, gradeFilter, letterFilter, selectedTA, statusFilter]);
  const paginated = useMemo(() => filtered.slice((page - 1) * perPage, page * perPage), [filtered, page, perPage]);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Pending Alert */}
      {pendingCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
            <Clock className="text-amber-600" size={20} />
          </div>
          <div>
            <p className="font-semibold text-amber-800 text-sm">{pendingCount} dispensasi menunggu persetujuan</p>
            <p className="text-xs text-amber-600">Klik tombol "Acc" untuk menyetujui</p>
          </div>
          <button
            onClick={() => setStatusFilter('PENDING')}
            className="ml-auto px-3 py-1.5 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700 transition-colors shrink-0"
          >
            Lihat
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input type="text" placeholder="Cari nama, kelas, alasan..."
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button onClick={() => setShowFilter(!showFilter)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-all shrink-0 ${showFilter || dateFrom || dateTo ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
            <Calendar size={15} />
            <span className="hidden sm:inline">Filter</span>
            <ChevronDown size={14} className={`transition-transform ${showFilter ? 'rotate-180' : ''}`} />
          </button>
          {hasFilter && (
            <button onClick={clearFilters} className="flex items-center gap-1 px-3 py-2 text-sm text-red-500 hover:bg-red-50 border border-slate-200 rounded-lg transition-all shrink-0">
              <X size={14} />
            </button>
          )}
          {filtered.length > 0 && (
            <>
              <button
                onClick={() => exportPermitsToXlsx(filtered, `data-izin-keluar-${new Date().toISOString().slice(0,10)}`)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50 border border-slate-200 rounded-lg transition-all shrink-0"
                title="Ekspor ke Excel"
              >
                <Download size={15} />
                <span className="hidden sm:inline">XLSX</span>
              </button>
              <button
                onClick={() => exportPermitsToCsv(filtered, `data-izin-keluar-${new Date().toISOString().slice(0,10)}`)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-violet-700 hover:bg-violet-50 border border-slate-200 rounded-lg transition-all shrink-0"
                title="Ekspor ke CSV (untuk R)"
              >
                <Download size={15} />
                <span className="hidden sm:inline">CSV</span>
              </button>
            </>
          )}
          <button onClick={onCreateNew}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg font-semibold shadow-sm hover:shadow-md transition-all text-sm shrink-0">
            <FilePlus size={16} />
            <span className="hidden sm:inline">Buat Surat</span>
          </button>
        </div>

        {/* Status tabs + TA + Grade quick filters */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Status filter */}
          <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
            <button onClick={() => setStatusFilter('')}
              className={`px-2.5 py-1 text-xs rounded-md font-semibold transition-all ${statusFilter === '' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Semua</button>
            <button onClick={() => setStatusFilter('PENDING')}
              className={`px-2.5 py-1 text-xs rounded-md font-semibold transition-all flex items-center gap-1 ${statusFilter === 'PENDING' ? 'bg-amber-500 shadow text-white' : 'text-amber-600 hover:text-amber-700'}`}>
              <Clock size={11} />Menunggu{pendingCount > 0 && <span className="text-[10px]">({pendingCount})</span>}
            </button>
            <button onClick={() => setStatusFilter('APPROVED')}
              className={`px-2.5 py-1 text-xs rounded-md font-semibold transition-all flex items-center gap-1 ${statusFilter === 'APPROVED' ? 'bg-green-600 shadow text-white' : 'text-green-600 hover:text-green-700'}`}>
              <CheckCircle2 size={11} />Disetujui
            </button>
          </div>

          <div className="w-px h-5 bg-slate-200 hidden sm:block" />

          <div className="relative">
            <select
              className="appearance-none bg-slate-100 rounded-lg pl-3 pr-7 py-1.5 text-xs font-semibold text-slate-700 outline-none cursor-pointer focus:ring-2 focus:ring-blue-500"
              value={selectedTA}
              onChange={e => setSelectedTA(e.target.value)}
            >
              <option value="">Semua TA</option>
              {availableTA.map(ta => <option key={ta} value={ta}>TA {ta}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
          <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
            <button onClick={() => handleGradeSelect('')}
              className={`px-2.5 py-1 text-xs rounded-md font-semibold transition-all ${gradeFilter === '' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Semua</button>
            {GRADES.map(g => (
              <button key={g} onClick={() => handleGradeSelect(g)}
                className={`px-2.5 py-1 text-xs rounded-md font-semibold transition-all ${gradeFilter === g ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>{g}</button>
            ))}
          </div>
        </div>

        {/* Letter filter */}
        {gradeFilter && (
          <div className="flex flex-wrap gap-1 items-center">
            <span className="text-xs text-slate-500 font-semibold mr-1">Kelas:</span>
            <button onClick={() => setLetterFilter('')}
              className={`px-2.5 py-1 text-xs rounded-md font-semibold border transition-all ${letterFilter === '' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300'}`}>
              Semua {gradeFilter}
            </button>
            {GRADE_LETTERS[gradeFilter].map(l => (
              <button key={l} onClick={() => setLetterFilter(l)}
                className={`w-8 h-7 text-xs rounded-md font-bold border transition-all ${letterFilter === l ? 'bg-blue-600 border-blue-600 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600'}`}>
                {l}
              </button>
            ))}
          </div>
        )}

        {showFilter && (
          <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Dari Tanggal</label>
              <input type="date" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Sampai Tanggal</label>
              <input type="date" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          </div>
        )}

        <div className="flex items-center gap-1 text-xs text-slate-400">
          <Filter size={11} />
          <span><strong className="text-slate-600">{filtered.length}</strong> dari {exitPermits.length} data{hasFilter && ' (terfilter)'}</span>
        </div>
      </div>

      {/* === TODAY section === */}
      {!loading && (() => {
        const today = new Date().toDateString();
        const todayEntries = exitPermits.filter(p => new Date(p.timestamp).toDateString() === today);
        if (todayEntries.length === 0) return null;
        return (
          <div className="bg-blue-50 rounded-2xl border border-blue-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-blue-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-blue-600" />
                <h3 className="font-bold text-blue-800 text-sm">Izin Keluar Hari Ini</h3>
                <span className="bg-blue-200 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-full">{todayEntries.length}</span>
              </div>
              <span className="text-xs text-blue-600">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            </div>
            <div className="divide-y divide-blue-100">
              {todayEntries.map(permit => {
                const status = resolvePermitStatus(permit);
                const isPending = status === PermitStatus.PENDING;
                return (
                  <div key={permit.id} className="px-4 py-3 flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${isPending ? 'bg-amber-200 text-amber-800' : 'bg-blue-200 text-blue-800'}`}>{getInitials(permit.studentName)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-800 text-sm truncate">{permit.studentName}</p>
                        <StatusBadge status={status} />
                      </div>
                      <p className="text-xs text-slate-500">
                        <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">{permit.className}</span>
                        <span className="ml-2 text-slate-400">{new Date(permit.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                        {permit.approvedBy && <span className="ml-2 text-slate-400">• Acc: {permit.approvedBy}</span>}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {isPending && (
                        <button onClick={() => onApprove(permit)}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                          title="Setujui Dispensasi">
                          <ShieldCheck size={14} /> Acc
                        </button>
                      )}
                      {!isPending && (
                        <button onClick={() => onPrint(permit)} className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-200 rounded-lg transition-colors" title="Cetak">
                          <Printer size={17} />
                        </button>
                      )}
                      <button onClick={() => onEdit(permit)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-colors" title="Edit">
                        <Pencil size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Memuat data...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
          <AlertCircle size={40} className="opacity-20" />
          <p className="font-medium text-sm">Tidak ada data ditemukan</p>
          {!hasFilter && <button onClick={onCreateNew} className="text-blue-600 text-sm hover:underline">+ Buat surat baru</button>}
        </div>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="sm:hidden space-y-3">
            {paginated.map(permit => {
              const status = resolvePermitStatus(permit);
              const isPending = status === PermitStatus.PENDING;
              return (
                <div key={permit.id} className={`bg-white rounded-xl border p-4 ${isPending ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${isPending ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{getInitials(permit.studentName)}</div>
                      <div>
                        <p className="font-semibold text-slate-800">{permit.studentName}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{permit.className}</span>
                          <StatusBadge status={status} />
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {isPending ? (
                        <button onClick={() => onApprove(permit)} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1">
                          <ShieldCheck size={14} /> Acc
                        </button>
                      ) : (
                        <button onClick={() => onPrint(permit)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Printer size={16} /></button>
                      )}
                      <button onClick={() => onEdit(permit)} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"><Pencil size={16} /></button>
                      <button onClick={() => onDelete(permit.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="font-semibold text-slate-400 uppercase tracking-wide text-[10px] mb-0.5">Waktu Izin</p>
                      <p className="font-medium text-slate-700">{new Date(permit.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} — {new Date(permit.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-400 uppercase tracking-wide text-[10px] mb-0.5">Kembali</p>
                      {permit.returnTimestamp ? (
                        <span className="font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">{new Date(permit.returnTimestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                      ) : <span className="text-slate-400 italic">Tidak ada</span>}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-400 uppercase tracking-wide text-[10px] mb-0.5">Disetujui Oleh</p>
                      <p className="text-slate-600">{permit.approvedBy || <span className="italic text-slate-400">—</span>}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-400 uppercase tracking-wide text-[10px] mb-0.5">Alasan</p>
                      <p className="text-slate-700 truncate">{permit.reason}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table */}
          <div className="hidden sm:block bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
                    <th className="p-4 pl-5">Siswa</th>
                    <th className="p-4">Kelas</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Waktu Izin</th>
                    <th className="p-4">TA</th>
                    <th className="p-4">Alasan</th>
                    <th className="p-4">Disetujui Oleh</th>
                    <th className="p-4">Kembali</th>
                    <th className="p-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginated.map(permit => {
                    const status = resolvePermitStatus(permit);
                    const isPending = status === PermitStatus.PENDING;
                    return (
                      <tr key={permit.id} className={`hover:bg-slate-50 transition-colors group ${isPending ? 'bg-amber-50/40' : ''}`}>
                        <td className="p-4 pl-5">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${isPending ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{getInitials(permit.studentName)}</div>
                            <span className="font-semibold text-slate-800">{permit.studentName}</span>
                          </div>
                        </td>
                        <td className="p-4"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">{permit.className}</span></td>
                        <td className="p-4"><StatusBadge status={status} /></td>
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-slate-700">{new Date(permit.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                            <span className="text-xs text-slate-400">{new Date(permit.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          </div>
                        </td>
                        <td className="p-4 text-xs text-slate-500">{resolveTahunAjaran(permit)}</td>
                        <td className="p-4"><p className="text-sm text-slate-600 max-w-[140px] truncate" title={permit.reason}>{permit.reason}</p></td>
                        <td className="p-4">
                          {permit.approvedBy ? (
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-slate-700">{permit.approvedBy}</span>
                              {permit.approvedAt && <span className="text-xs text-slate-400">{new Date(permit.approvedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>}
                            </div>
                          ) : <span className="text-xs text-slate-400 italic">—</span>}
                        </td>
                        <td className="p-4">
                          {permit.returnTimestamp ? (
                            <span className="text-sm font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">{new Date(permit.returnTimestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                          ) : <span className="text-xs text-slate-400 italic">—</span>}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex justify-center gap-1">
                            {isPending ? (
                              <button onClick={() => onApprove(permit)}
                                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                                title="Setujui Dispensasi">
                                <ShieldCheck size={14} /> Acc
                              </button>
                            ) : (
                              <button onClick={() => onPrint(permit)} className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors"><Printer size={17} /></button>
                            )}
                            <button onClick={() => onEdit(permit)} className="text-slate-400 hover:text-amber-600 hover:bg-amber-50 p-2 rounded-lg transition-colors"><Pencil size={17} /></button>
                            <button onClick={() => onDelete(permit.id)} className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"><Trash2 size={17} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination total={filtered.length} page={page} perPage={perPage} onPageChange={setPage} onPerPageChange={setPerPage} />
        </>
      )}
    </div>
  );
};
