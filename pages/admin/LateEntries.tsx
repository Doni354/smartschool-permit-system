import React, { useState, useMemo, useEffect } from 'react';
import { StudentPermit, PermitType } from '../../types';
import { Search, Printer, Pencil, Trash2, X, Calendar, Filter, AlertCircle, ChevronDown, Download, Clock } from 'lucide-react';
import { getTahunAjaran, getAvailableTahunAjaran, GRADES, GRADE_LETTERS } from '../../utils/school';
import { exportPermitsToXlsx } from '../../utils/xlsx-export';
import { exportPermitsToCsv } from '../../utils/csv-export';
import { Pagination } from '../../components/Pagination';

interface LateEntriesProps {
  permits: StudentPermit[];
  loading: boolean;
  onPrint: (permit: StudentPermit) => void;
  onEdit: (permit: StudentPermit) => void;
  onDelete: (id: string) => void;
}

function getInitials(name: string) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

function resolveTahunAjaran(p: StudentPermit) {
  return p.tahunAjaran || getTahunAjaran(p.timestamp);
}

export const LateEntries: React.FC<LateEntriesProps> = ({ permits, loading, onPrint, onEdit, onDelete }) => {
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [letterFilter, setLetterFilter] = useState('');
  const [selectedTA, setSelectedTA] = useState('');
  const [showFilter, setShowFilter] = useState(false);

  const handleGradeSelect = (g: string) => {
    setGradeFilter(g);
    setLetterFilter(''); // reset huruf saat ganti tingkat
  };

  const latePermits = useMemo(() => permits.filter(p => p.type === PermitType.LATE_ENTRY), [permits]);
  const availableTA = useMemo(() => getAvailableTahunAjaran(latePermits.map(p => p.timestamp)), [latePermits]);

  const filtered = useMemo(() => {
    let data = latePermits;
    if (selectedTA) data = data.filter(p => resolveTahunAjaran(p) === selectedTA);
    // Filter by exact class (grade + letter) or just grade
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
  }, [latePermits, search, dateFrom, dateTo, gradeFilter, letterFilter, selectedTA]);

  const clearFilters = () => { setSearch(''); setDateFrom(''); setDateTo(''); setGradeFilter(''); setLetterFilter(''); setSelectedTA(''); };
  const hasFilter = search || dateFrom || dateTo || gradeFilter || letterFilter || selectedTA;

  // Pagination
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  useEffect(() => { setPage(1); }, [search, dateFrom, dateTo, gradeFilter, letterFilter, selectedTA]);
  const paginated = useMemo(() => filtered.slice((page - 1) * perPage, page * perPage), [filtered, page, perPage]);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        {/* Row 1: Search + expand + clear */}
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
                onClick={() => exportPermitsToXlsx(filtered, `data-terlambat-${new Date().toISOString().slice(0,10)}`)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50 border border-slate-200 rounded-lg transition-all shrink-0"
                title="Ekspor ke Excel"
              >
                <Download size={15} />
                <span className="hidden sm:inline">XLSX</span>
              </button>
              <button
                onClick={() => exportPermitsToCsv(filtered, `data-terlambat-${new Date().toISOString().slice(0,10)}`)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-violet-700 hover:bg-violet-50 border border-slate-200 rounded-lg transition-all shrink-0"
                title="Ekspor ke CSV (untuk R)"
              >
                <Download size={15} />
                <span className="hidden sm:inline">CSV</span>
              </button>
            </>
          )}
        </div>

        {/* Row 2: Tahun Ajaran + Grade quick filters (always visible) */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Tahun Ajaran */}
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
          {/* Grade buttons */}
          <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
            <button onClick={() => handleGradeSelect('')}
              className={`px-2.5 py-1 text-xs rounded-md font-semibold transition-all ${gradeFilter === '' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Semua</button>
            {GRADES.map(g => (
              <button key={g} onClick={() => handleGradeSelect(g)}
                className={`px-2.5 py-1 text-xs rounded-md font-semibold transition-all ${gradeFilter === g ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>{g}</button>
            ))}
          </div>
        </div>

        {/* Letter filter — muncul setelah pilih tingkat */}
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

        {/* Collapsible date range */}
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
          <span><strong className="text-slate-600">{filtered.length}</strong> dari {latePermits.length} data{hasFilter && ' (terfilter)'}</span>
        </div>
      </div>

      {/* === TODAY section === */}
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
                <span className="bg-amber-200 text-amber-800 text-xs font-bold px-2 py-0.5 rounded-full">{todayEntries.length}</span>
              </div>
              <span className="text-xs text-amber-600">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            </div>
            <div className="divide-y divide-amber-100">
              {todayEntries.map(permit => (
                <div key={permit.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-200 flex items-center justify-center text-amber-800 font-bold text-xs shrink-0">{getInitials(permit.studentName)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">{permit.studentName}</p>
                    <p className="text-xs text-slate-500">
                      <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">{permit.className}</span>
                      <span className="ml-2 text-slate-400">{new Date(permit.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => onPrint(permit)} className="p-2 text-amber-600 hover:text-amber-800 hover:bg-amber-200 rounded-lg transition-colors" title="Cetak">
                      <Printer size={17} />
                    </button>
                    <button onClick={() => onEdit(permit)} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-100 rounded-lg transition-colors" title="Edit">
                      <Pencil size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Memuat data...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
          <AlertCircle size={40} className="opacity-20" />
          <p className="font-medium text-sm">Tidak ada data ditemukan</p>
        </div>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="sm:hidden space-y-3">
            {paginated.map(permit => (
              <div key={permit.id} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-sm shrink-0">{getInitials(permit.studentName)}</div>
                    <div>
                      <p className="font-semibold text-slate-800">{permit.studentName}</p>
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{permit.className}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => onPrint(permit)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Printer size={16} /></button>
                    <button onClick={() => onEdit(permit)} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"><Pencil size={16} /></button>
                    <button onClick={() => onDelete(permit.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs text-slate-500">
                  <div>
                    <p className="font-semibold text-slate-400 uppercase tracking-wide text-[10px] mb-0.5">Waktu</p>
                    <p className="font-medium text-slate-700">
                      {new Date(permit.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} — {new Date(permit.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-400 uppercase tracking-wide text-[10px] mb-0.5">Alasan</p>
                    <p className="text-slate-700 truncate">{permit.reason}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-400 uppercase tracking-wide text-[10px] mb-0.5">TA</p>
                    <p className="text-slate-600">{resolveTahunAjaran(permit)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden sm:block bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
                    <th className="p-4 pl-5">Siswa</th>
                    <th className="p-4">Kelas</th>
                    <th className="p-4">Waktu Masuk</th>
                    <th className="p-4">TA</th>
                    <th className="p-4">Alasan</th>
                    <th className="p-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginated.map(permit => (
                    <tr key={permit.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="p-4 pl-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-xs">{getInitials(permit.studentName)}</div>
                          <span className="font-semibold text-slate-800">{permit.studentName}</span>
                        </div>
                      </td>
                      <td className="p-4"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">{permit.className}</span></td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-slate-700">{new Date(permit.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                          <span className="text-xs text-slate-400">{new Date(permit.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>
                      </td>
                      <td className="p-4 text-xs text-slate-500">{resolveTahunAjaran(permit)}</td>
                      <td className="p-4"><p className="text-sm text-slate-600 max-w-xs truncate" title={permit.reason}>{permit.reason}</p></td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-1">
                          <button onClick={() => onPrint(permit)} className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors"><Printer size={17} /></button>
                          <button onClick={() => onEdit(permit)} className="text-slate-400 hover:text-amber-600 hover:bg-amber-50 p-2 rounded-lg transition-colors"><Pencil size={17} /></button>
                          <button onClick={() => onDelete(permit.id)} className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"><Trash2 size={17} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
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
