import React, { useState, useMemo, useEffect } from 'react';
import { StudentPermit, PermitType, PermitStatus, resolvePermitStatus } from '../../types';
import { Search, Printer, Pencil, Trash2, X, Calendar, Filter, AlertCircle, ChevronDown, Download, Clock, CheckCircle } from 'lucide-react';
import { GRADES, GRADE_LETTERS } from '../../utils/school';
import { exportPermitsToXlsx } from '../../utils/xlsx-export';
import { exportPermitsToCsv } from '../../utils/csv-export';
import { Pagination } from '../../components/Pagination';

interface LateEntriesProps {
  permits: StudentPermit[];
  loading: boolean;
  onPrint: (permit: StudentPermit) => void;
  onEdit: (permit: StudentPermit) => void;
  onDelete: (id: string) => void;
  onApprove: (permit: StudentPermit) => void;
}

function getInitials(name: string) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}



export const LateEntries: React.FC<LateEntriesProps> = ({ permits, loading, onPrint, onEdit, onDelete, onApprove }) => {
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [letterFilter, setLetterFilter] = useState('');

  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showFilter, setShowFilter] = useState(false);

  const handleGradeSelect = (g: string) => {
    setGradeFilter(g);
    setLetterFilter(''); 
  };

  const latePermits = useMemo(() => permits.filter(p => p.type === PermitType.LATE_ENTRY), [permits]);

  const filtered = useMemo(() => {
    let data = latePermits;
    if (statusFilter) data = data.filter(p => resolvePermitStatus(p) === statusFilter);
    if (gradeFilter && letterFilter) data = data.filter(p => p.className === `${gradeFilter}-${letterFilter}`);
    else if (gradeFilter) data = data.filter(p => p.className.startsWith(gradeFilter + '-'));
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(p =>
        p.studentName.toLowerCase().includes(q) ||
        p.className.toLowerCase().includes(q) ||
        p.reason.toLowerCase().includes(q)
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
  }, [latePermits, search, dateFrom, dateTo, gradeFilter, letterFilter, statusFilter]);

  const clearFilters = () => { setSearch(''); setDateFrom(''); setDateTo(''); setGradeFilter(''); setLetterFilter(''); setStatusFilter(''); };
  const hasFilter = search || dateFrom || dateTo || gradeFilter || letterFilter || statusFilter;

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  useEffect(() => { setPage(1); }, [search, dateFrom, dateTo, gradeFilter, letterFilter, statusFilter]);
  const paginated = useMemo(() => filtered.slice((page - 1) * perPage, page * perPage), [filtered, page, perPage]);

  return (
    <div className="space-y-4 animate-fade-in">
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
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <select
              className="appearance-none bg-slate-100 rounded-lg pl-3 pr-7 py-1.5 text-xs font-semibold text-slate-700 outline-none cursor-pointer focus:ring-2 focus:ring-blue-500"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="">Semua Status</option>
              <option value={PermitStatus.PENDING}>Menunggu (Pending)</option>
              <option value={PermitStatus.APPROVED}>Disetujui (Approved)</option>
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
      </div>

      {!loading && (() => {
        const today = new Date().toDateString();
        const todayEntries = latePermits.filter(p => new Date(p.timestamp).toDateString() === today);
        if (todayEntries.length === 0) return null;
        return (
          <div className="bg-amber-50 rounded-2xl border border-amber-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-amber-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-amber-600" />
                <h3 className="font-bold text-amber-800 text-sm">Terlambat Hari Ini</h3>
              </div>
            </div>
            <div className="divide-y divide-amber-100">
              {todayEntries.map(permit => (
                <div key={permit.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-200 flex items-center justify-center text-amber-800 font-bold text-xs shrink-0">{getInitials(permit.studentName)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">{permit.studentName}</p>
                    <p className="text-xs text-slate-500">{permit.className}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 px-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      resolvePermitStatus(permit) === PermitStatus.APPROVED ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {resolvePermitStatus(permit) === PermitStatus.APPROVED ? 'Disetujui' : 'Pending'}
                    </span>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {resolvePermitStatus(permit) === PermitStatus.PENDING && (
                      <button onClick={() => onApprove(permit)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors" title="ACC Kedatangan">
                        <CheckCircle size={17} />
                      </button>
                    )}
                    <button onClick={() => onPrint(permit)} disabled={resolvePermitStatus(permit) === PermitStatus.PENDING} className="p-2 text-amber-600 hover:bg-amber-200 rounded-lg disabled:opacity-30">
                      <Printer size={17} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
                <th className="p-4 pl-5">Siswa</th>
                <th className="p-4">Kelas</th>
                <th className="p-4">Waktu</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginated.map(permit => (
                <tr key={permit.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 pl-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-xs">{getInitials(permit.studentName)}</div>
                      <span className="font-semibold text-slate-800">{permit.studentName}</span>
                    </div>
                  </td>
                  <td className="p-4">{permit.className}</td>
                  <td className="p-4 text-xs text-slate-500">{new Date(permit.timestamp).toLocaleString('id-ID')}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      resolvePermitStatus(permit) === PermitStatus.APPROVED ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {resolvePermitStatus(permit) === PermitStatus.APPROVED ? 'Disetujui' : 'Pending'}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex justify-center gap-1">
                      {resolvePermitStatus(permit) === PermitStatus.PENDING && (
                        <button onClick={() => onApprove(permit)} className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg" title="ACC Kedatangan"><CheckCircle size={17} /></button>
                      )}
                      <button onClick={() => onPrint(permit)} disabled={resolvePermitStatus(permit) === PermitStatus.PENDING} className="text-slate-400 hover:text-blue-600 disabled:opacity-30 p-2"><Printer size={17} /></button>
                      <button onClick={() => onDelete(permit.id)} className="text-slate-400 hover:text-red-600 p-2"><Trash2 size={17} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination total={filtered.length} page={page} perPage={perPage} onPageChange={setPage} onPerPageChange={setPerPage} />
    </div>
  );
};
