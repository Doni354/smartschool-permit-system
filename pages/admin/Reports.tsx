import React, { useMemo, useState, useEffect } from 'react';
import { StudentPermit, PermitType } from '../../types';
import { Award, Users, BarChart2, TrendingUp, AlertCircle, ChevronDown, Search, AlertTriangle, Download, Calendar } from 'lucide-react';
import { getTahunAjaran, getAvailableTahunAjaran, ALL_CLASSES, GRADES, GRADE_LETTERS } from '../../utils/school';
import { exportPermitsToXlsx, exportSummaryToXlsx } from '../../utils/xlsx-export';
import { Pagination } from '../../components/Pagination';

interface ReportsProps {
  permits: StudentPermit[];
  loading: boolean;
  onEdit: (permit: StudentPermit) => void;
  onDelete: (id: string) => void;
}

const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

// Normalize tahun ajaran: use stored field or derive from timestamp
function resolveTahunAjaran(p: StudentPermit) {
  return p.tahunAjaran || getTahunAjaran(p.timestamp);
}

// --- Monthly Rekapitulasi Sub-Component ---
const MonthlyRecap: React.FC<{ permits: StudentPermit[]; selectedTA: string }> = ({ permits, selectedTA }) => {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [recapGrade, setRecapGrade] = useState('');
  const [recapLetter, setRecapLetter] = useState('');

  const handleRecapGrade = (g: string) => { setRecapGrade(g); setRecapLetter(''); };

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    set.add(`${now.getFullYear()}-${now.getMonth()}`);
    permits.forEach(p => {
      const d = new Date(p.timestamp);
      set.add(`${d.getFullYear()}-${d.getMonth()}`);
    });
    return Array.from(set)
      .map(s => { const [y, m] = s.split('-').map(Number); return { year: y, month: m }; })
      .sort((a, b) => b.year - a.year || b.month - a.month);
  }, [permits]);

  const monthPermits = useMemo(() =>
    permits.filter(p => {
      const d = new Date(p.timestamp);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    }), [permits, selectedMonth, selectedYear]);

  // Apply class filter to month permits
  const filteredMonthPermits = useMemo(() => {
    let data = monthPermits;
    if (recapGrade && recapLetter) data = data.filter(p => p.className === `${recapGrade}-${recapLetter}`);
    else if (recapGrade) data = data.filter(p => p.className?.startsWith(recapGrade + '-'));
    return data;
  }, [monthPermits, recapGrade, recapLetter]);

  const monthLate = filteredMonthPermits.filter(p => p.type === PermitType.LATE_ENTRY).length;
  const monthExit = filteredMonthPermits.filter(p => p.type === PermitType.EXIT_PERMIT).length;

  const classData = useMemo(() => {
    const map: Record<string, { late: number; exit: number }> = {};
    for (const p of filteredMonthPermits) {
      const cls = p.className?.trim();
      if (!cls) continue;
      if (!map[cls]) map[cls] = { late: 0, exit: 0 };
      if (p.type === PermitType.LATE_ENTRY) map[cls].late++;
      else map[cls].exit++;
    }
    return Object.entries(map)
      .map(([cls, v]) => ({ cls, ...v, total: v.late + v.exit }))
      .sort((a, b) => b.total - a.total);
  }, [filteredMonthPermits]);

  const studentData = useMemo(() => {
    const map: Record<string, { name: string; className: string; late: number; exit: number }> = {};
    for (const p of filteredMonthPermits) {
      const key = p.studentName.toLowerCase().trim();
      if (!map[key]) map[key] = { name: p.studentName, className: p.className, late: 0, exit: 0 };
      if (p.type === PermitType.LATE_ENTRY) map[key].late++;
      else map[key].exit++;
    }
    return Object.values(map)
      .map(s => ({ ...s, total: s.late + s.exit }))
      .sort((a, b) => b.total - a.total);
  }, [filteredMonthPermits]);

  const maxClass = Math.max(...classData.map(c => c.total), 1);
  const monthLabel = new Date(selectedYear, selectedMonth).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-emerald-500" />
          <h3 className="font-bold text-slate-800">Rekapitulasi Per Bulan</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              className="appearance-none bg-slate-100 rounded-lg pl-3 pr-8 py-2 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
              value={`${selectedYear}-${selectedMonth}`}
              onChange={e => {
                const [y, m] = e.target.value.split('-').map(Number);
                setSelectedYear(y);
                setSelectedMonth(m);
              }}
            >
              {availableMonths.map(m => (
                <option key={`${m.year}-${m.month}`} value={`${m.year}-${m.month}`}>
                  {new Date(m.year, m.month).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
          {filteredMonthPermits.length > 0 && (
            <button
              onClick={() => exportPermitsToXlsx(filteredMonthPermits, `rekap-${monthLabel.replace(' ', '-')}`)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs text-emerald-700 hover:bg-emerald-50 border border-slate-200 rounded-lg transition-all"
            >
              <Download size={13} />
              <span className="hidden sm:inline">Ekspor</span>
            </button>
          )}
        </div>
      </div>

      {/* Grade filter for recap */}
      <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-slate-500">Kelas:</span>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
          <button onClick={() => handleRecapGrade('')}
            className={`px-2.5 py-1 text-xs rounded-md font-semibold transition-all ${recapGrade === '' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Semua</button>
          {GRADES.map(g => (
            <button key={g} onClick={() => handleRecapGrade(g)}
              className={`px-2.5 py-1 text-xs rounded-md font-semibold transition-all ${recapGrade === g ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>{g}</button>
          ))}
        </div>
        {recapGrade && (
          <>
            <span className="text-slate-300">|</span>
            <button onClick={() => setRecapLetter('')}
              className={`px-2.5 py-1 text-xs rounded-md font-semibold border transition-all ${recapLetter === '' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-500'}`}>
              Semua {recapGrade}
            </button>
            {GRADE_LETTERS[recapGrade].map(l => (
              <button key={l} onClick={() => setRecapLetter(l)}
                className={`w-7 h-7 text-xs rounded-md font-bold border transition-all ${recapLetter === l ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'}`}>{l}</button>
            ))}
          </>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 p-4 border-b border-slate-100">
        <div className="bg-amber-50 rounded-xl p-3 text-center">
          <p className="text-xs text-amber-600 font-medium mb-1">Terlambat</p>
          <p className="text-xl font-bold text-amber-700">{monthLate}</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-3 text-center">
          <p className="text-xs text-blue-600 font-medium mb-1">Dispen</p>
          <p className="text-xl font-bold text-blue-700">{monthExit}</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 text-center">
          <p className="text-xs text-slate-500 font-medium mb-1">Total</p>
          <p className="text-xl font-bold text-slate-800">{monthLate + monthExit}</p>
        </div>
      </div>

      {filteredMonthPermits.length === 0 ? (
        <div className="p-8 text-center text-slate-400 text-sm">Tidak ada data untuk bulan ini{recapGrade ? ` kelas ${recapGrade}${recapLetter ? `-${recapLetter}` : ''}` : ''}.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
          {/* Per Class */}
          <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
            <h4 className="text-sm font-bold text-slate-700 mb-2">Per Kelas</h4>
            {classData.map(c => (
              <div key={c.cls}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-bold text-slate-700">{c.cls}</span>
                  <span className="text-xs text-slate-400">{c.total}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex">
                  <div style={{ width: `${(c.late / maxClass) * 100}%` }} className="h-full bg-amber-400" />
                  <div style={{ width: `${(c.exit / maxClass) * 100}%` }} className="h-full bg-blue-400" />
                </div>
                <div className="flex gap-3 mt-0.5">
                  <span className="text-xs text-amber-600">{c.late} telat</span>
                  <span className="text-xs text-blue-600">{c.exit} dispen</span>
                </div>
              </div>
            ))}
          </div>

          {/* Per Student */}
          <div className="p-4 max-h-80 overflow-y-auto">
            <h4 className="text-sm font-bold text-slate-700 mb-2">Per Siswa</h4>
            <div className="space-y-2">
              {studentData.slice(0, 15).map((s, i) => (
                <div key={s.name + i} className="flex items-center gap-2">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-slate-300 text-slate-700' : i === 2 ? 'bg-orange-300 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{s.name}</p>
                    <p className="text-xs text-slate-400">{s.className}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs shrink-0">
                    <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold">{s.late}T</span>
                    <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold">{s.exit}K</span>
                    <span className="font-bold text-slate-700">{s.total}×</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const Reports: React.FC<ReportsProps> = ({ permits, loading }) => {
  const currentTA = getTahunAjaran(Date.now());
  const [selectedTA, setSelectedTA] = useState(currentTA);
  const [topType, setTopType] = useState<'all' | 'late' | 'exit'>('all');
  const [gradeFilter, setGradeFilter] = useState<string>('');
  const [letterFilter, setLetterFilter] = useState<string>('');

  const handleGradeSelect = (g: string) => {
    setGradeFilter(g);
    setLetterFilter('');
  };

  // Exact class or grade prefix
  const classMatch = (cls: string) => {
    if (gradeFilter && letterFilter) return cls === `${gradeFilter}-${letterFilter}`;
    if (gradeFilter) return cls.startsWith(gradeFilter + '-');
    return true;
  };

  const availableTA = useMemo(() => getAvailableTahunAjaran(permits.map(p => p.timestamp)), [permits]);

  // --- Permits filtered by tahun ajaran ---
  const taPermits = useMemo(() => permits.filter(p => resolveTahunAjaran(p) === selectedTA), [permits, selectedTA]);

  // --- Top Students (filtered by TA + gradeFilter + topType) ---
  const studentFrequency = useMemo(() => {
    let data = taPermits;
    if (topType === 'late') data = data.filter(p => p.type === PermitType.LATE_ENTRY);
    else if (topType === 'exit') data = data.filter(p => p.type === PermitType.EXIT_PERMIT);
    data = data.filter(p => classMatch(p.className));

    const map: Record<string, { name: string; className: string; count: number; late: number; exit: number }> = {};
    for (const p of data) {
      const key = p.studentName.toLowerCase().trim();
      if (!map[key]) map[key] = { name: p.studentName, className: p.className, count: 0, late: 0, exit: 0 };
      map[key].count++;
      if (p.type === PermitType.LATE_ENTRY) map[key].late++;
      else map[key].exit++;
    }
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [taPermits, topType, gradeFilter, letterFilter]);

  // --- Per Class Breakdown (TA filtered, sorted by class order X-A..XII-K) ---
  const classBreakdown = useMemo(() => {
    const data = taPermits.filter(p => classMatch(p.className));
    const map: Record<string, { late: number; exit: number }> = {};
    for (const p of data) {
      const cls = p.className.trim();
      if (!map[cls]) map[cls] = { late: 0, exit: 0 };
      if (p.type === PermitType.LATE_ENTRY) map[cls].late++;
      else map[cls].exit++;
    }
    return ALL_CLASSES.filter(cls => map[cls] && classMatch(cls))
      .map(cls => ({ cls, ...map[cls], total: map[cls].late + map[cls].exit }));
  }, [taPermits, gradeFilter, letterFilter]);

  const maxClassTotal = Math.max(...classBreakdown.map(c => c.total), 1);

  // --- Monthly Trend (last 6 months, TA-filtered) ---
  const monthlyTrend = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const month = d.getMonth();
      const year = d.getFullYear();
      const late = taPermits.filter(p => {
        const pd = new Date(p.timestamp);
        return p.type === PermitType.LATE_ENTRY && pd.getMonth() === month && pd.getFullYear() === year;
      }).length;
      const exit = taPermits.filter(p => {
        const pd = new Date(p.timestamp);
        return p.type === PermitType.EXIT_PERMIT && pd.getMonth() === month && pd.getFullYear() === year;
      }).length;
      return { label: `${MONTHS_ID[month]} ${year}`, late, exit, total: late + exit };
    });
  }, [taPermits]);

  const maxMonthly = Math.max(...monthlyTrend.map(m => m.total), 1);

  // --- All Students Table (ALL permits, NOT TA filtered — surface missing class etc) ---
  const [nameSearch, setNameSearch] = useState('');
  const [sortKey, setSortKey] = useState<'total' | 'late' | 'exit' | 'name'>('total');
  const [sortAsc, setSortAsc] = useState(false);

  const allStudents = useMemo(() => {
    // Use ALL permits regardless of TA so missing-class entries still show
    const data = permits;
    const map: Record<string, { name: string; className: string; late: number; exit: number; lastSeen: number }> = {};
    for (const p of data) {
      const key = p.studentName.toLowerCase().trim() + '||' + (p.className || '');
      if (!map[key]) map[key] = { name: p.studentName, className: p.className || '', late: 0, exit: 0, lastSeen: 0 };
      if (p.type === PermitType.LATE_ENTRY) map[key].late++;
      else map[key].exit++;
      if (p.timestamp > map[key].lastSeen) map[key].lastSeen = p.timestamp;
    }
    const rows = Object.values(map).map(r => ({ ...r, total: r.late + r.exit }));
    if (nameSearch) {
      const q = nameSearch.toLowerCase();
      return rows.filter(r => r.name.toLowerCase().includes(q) || r.className.toLowerCase().includes(q));
    }
    return rows.sort((a, b) => {
      const v = sortKey === 'name'
        ? a.name.localeCompare(b.name)
        : (a as any)[sortKey] - (b as any)[sortKey];
      return sortAsc ? v : -v;
    });
  }, [permits, nameSearch, sortKey, sortAsc]);

  const noClassCount = useMemo(() => permits.filter(p => !p.className).length, [permits]);

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortAsc(v => !v);
    else { setSortKey(key); setSortAsc(false); }
  };

  // Pagination for student table
  const [studentPage, setStudentPage] = useState(1);
  const [studentPerPage, setStudentPerPage] = useState(10);
  useEffect(() => { setStudentPage(1); }, [nameSearch, sortKey, sortAsc]);
  const paginatedStudents = useMemo(() => allStudents.slice((studentPage - 1) * studentPerPage, studentPage * studentPerPage), [allStudents, studentPage, studentPerPage]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 flex-col gap-3">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p>Memuat laporan...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Global filter bar: Tahun Ajaran + Grade */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center gap-3">
        <BarChart2 size={16} className="text-slate-400 shrink-0" />
        <span className="text-sm font-semibold text-slate-700 shrink-0">Filter:</span>

        {/* Tahun Ajaran */}
        <div className="relative">
          <select
            className="appearance-none bg-slate-100 border-0 rounded-lg pl-3 pr-8 py-2 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
            value={selectedTA}
            onChange={e => setSelectedTA(e.target.value)}
          >
            {availableTA.map(ta => (
              <option key={ta} value={ta}>TA {ta}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        {/* Grade filter */}
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => handleGradeSelect('')}
            className={`px-3 py-1 text-xs rounded-md font-semibold transition-all ${gradeFilter === '' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
          >Semua</button>
          {GRADES.map(g => (
            <button key={g}
              onClick={() => handleGradeSelect(g)}
              className={`px-3 py-1 text-xs rounded-md font-semibold transition-all ${gradeFilter === g ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
            >{g}</button>
          ))}
        </div>

        {/* Letter filter row */}
        {gradeFilter && (
          <div className="flex flex-wrap gap-1 items-center w-full">
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

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">{taPermits.length} data di TA {selectedTA}</span>
          {taPermits.length > 0 && (
            <button
              onClick={() => exportPermitsToXlsx(taPermits, `laporan-TA-${selectedTA.replace('/', '-')}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-emerald-700 hover:bg-emerald-50 border border-slate-200 rounded-lg transition-all"
              title="Ekspor ke Excel"
            >
              <Download size={13} />
              <span className="hidden sm:inline">Ekspor XLSX</span>
            </button>
          )}
        </div>
      </div>

      {taPermits.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-slate-400 flex-col gap-3">
          <AlertCircle size={40} className="opacity-20" />
          <p className="font-medium">Tidak ada data untuk tahun ajaran ini.</p>
        </div>
      ) : (
        <>
          {/* Top Students */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Award size={18} className="text-amber-500" />
                <h3 className="font-bold text-slate-800">Siswa Paling Sering Izin</h3>
              </div>
              <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
                {([['all', 'Semua'], ['late', 'Terlambat'], ['exit', 'Izin Keluar']] as const).map(([val, label]) => (
                  <button key={val} onClick={() => setTopType(val)}
                    className={`px-3 py-1 text-xs rounded-md font-semibold transition-all ${topType === val ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="divide-y divide-slate-50">
              {studentFrequency.length === 0 ? (
                <p className="p-8 text-center text-slate-400 text-sm">Tidak ada data.</p>
              ) : studentFrequency.map((s, i) => (
                <div key={s.name + i} className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3 hover:bg-slate-50 transition-colors">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                    ${i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-slate-300 text-slate-700' : i === 2 ? 'bg-orange-300 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{s.name}</p>
                    <p className="text-xs text-slate-400">{s.className}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs shrink-0">
                    <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold hidden sm:inline">{s.late}× Terlambat</span>
                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold hidden sm:inline">{s.exit}× Keluar</span>
                    <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold sm:hidden">{s.late}T</span>
                    <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold sm:hidden">{s.exit}K</span>
                    <span className="font-bold text-slate-800 text-sm w-7 text-right">{s.count}×</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Class Breakdown + Monthly Trend */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Per-class breakdown */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center gap-2">
                <Users size={18} className="text-blue-500" />
                <h3 className="font-bold text-slate-800">Rekap Per Kelas</h3>
                <span className="ml-auto text-xs text-slate-400">TA {selectedTA}{gradeFilter ? ` • Kelas ${gradeFilter}` : ''}</span>
              </div>
              <div className="p-4 space-y-2.5 max-h-96 overflow-y-auto">
                {classBreakdown.length === 0 ? (
                  <p className="text-center text-slate-400 text-sm py-4">Tidak ada data.</p>
                ) : classBreakdown.map(c => (
                  <div key={c.cls}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-bold text-slate-700">{c.cls}</span>
                      <span className="text-xs text-slate-400">{c.total} kejadian</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex">
                      <div style={{ width: `${(c.late / maxClassTotal) * 100}%` }} className="h-full bg-amber-400 transition-all" />
                      <div style={{ width: `${(c.exit / maxClassTotal) * 100}%` }} className="h-full bg-blue-400 transition-all" />
                    </div>
                    <div className="flex gap-3 mt-0.5">
                      <span className="text-xs text-amber-600">{c.late} terlambat</span>
                      <span className="text-xs text-blue-600">{c.exit} keluar</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-5 pb-4 flex gap-4 text-xs text-slate-500 border-t border-slate-100 pt-3">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" /> Terlambat</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-400 inline-block" /> Izin Keluar</span>
              </div>
            </div>

            {/* Monthly Trend */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center gap-2">
                <TrendingUp size={18} className="text-indigo-500" />
                <h3 className="font-bold text-slate-800">Tren Bulanan</h3>
                <span className="ml-auto text-xs text-slate-400">TA {selectedTA}</span>
              </div>
              <div className="p-4 sm:p-5">
                <div className="flex items-end gap-1 sm:gap-2 h-32 mb-2">
                  {monthlyTrend.map(m => (
                    <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs font-bold text-slate-600">{m.total || ''}</span>
                      <div className="w-full flex flex-col justify-end" style={{ height: '90px' }}>
                        <div style={{ height: `${(m.exit / maxMonthly) * 100}%` }} className="w-full bg-blue-400 transition-all" />
                        <div style={{ height: `${(m.late / maxMonthly) * 100}%` }} className="w-full bg-amber-400 transition-all" />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-1 sm:gap-2 mb-3">
                  {monthlyTrend.map(m => (
                    <div key={m.label} className="flex-1 text-center text-xs text-slate-400 leading-tight">{m.label.split(' ')[0]}<br /><span className="text-[10px]">{m.label.split(' ')[1]}</span></div>
                  ))}
                </div>
                <table className="w-full text-xs text-slate-600 border-t border-slate-100 pt-2">
                  <thead>
                    <tr className="text-slate-400 uppercase text-[10px]">
                      <th className="text-left py-1.5">Bulan</th>
                      <th className="text-right py-1.5 text-amber-600">Terlambat</th>
                      <th className="text-right py-1.5 text-blue-600">Keluar</th>
                      <th className="text-right py-1.5">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {monthlyTrend.map(m => (
                      <tr key={m.label} className="hover:bg-slate-50">
                        <td className="py-1.5 font-medium">{m.label}</td>
                        <td className="text-right py-1.5">{m.late}</td>
                        <td className="text-right py-1.5">{m.exit}</td>
                        <td className="text-right py-1.5 font-bold text-slate-800">{m.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            </div>
        </>
      )}

      {/* ===== Monthly Rekapitulasi Section ===== */}
      <MonthlyRecap permits={taPermits} selectedTA={selectedTA} />

      {/* ===== Full Student Data Table (always visible, ALL permits) ===== */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Users size={18} className="text-slate-500" />
            <h3 className="font-bold text-slate-800">Semua Data Siswa</h3>
            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{allStudents.length} siswa</span>
            {noClassCount > 0 && (
              <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                <AlertTriangle size={10} /> {noClassCount} tanpa kelas
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input type="text" placeholder="Cari nama atau kelas..."
                value={nameSearch} onChange={e => setNameSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            {allStudents.length > 0 && (
              <button
                onClick={() => exportSummaryToXlsx(allStudents, `rekap-semua-siswa-${new Date().toISOString().slice(0,10)}`)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50 border border-slate-200 rounded-lg transition-all shrink-0"
                title="Ekspor ke Excel"
              >
                <Download size={15} />
                <span className="hidden sm:inline">Ekspor</span>
              </button>
            )}
          </div>
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                <th className="p-3 pl-5">#</th>
                <th className="p-3 cursor-pointer hover:text-slate-800 select-none" onClick={() => toggleSort('name')}>
                  Nama {sortKey === 'name' ? (sortAsc ? '↑' : '↓') : <span className="text-slate-300">↕</span>}
                </th>
                <th className="p-3">Kelas</th>
                <th className="p-3 text-right cursor-pointer hover:text-slate-800 select-none" onClick={() => toggleSort('late')}>
                  Terlambat {sortKey === 'late' ? (sortAsc ? '↑' : '↓') : <span className="text-slate-300">↕</span>}
                </th>
                <th className="p-3 text-right cursor-pointer hover:text-slate-800 select-none" onClick={() => toggleSort('exit')}>
                  Izin Keluar {sortKey === 'exit' ? (sortAsc ? '↑' : '↓') : <span className="text-slate-300">↕</span>}
                </th>
                <th className="p-3 text-right cursor-pointer hover:text-slate-800 select-none" onClick={() => toggleSort('total')}>
                  Total {sortKey === 'total' ? (sortAsc ? '↑' : '↓') : <span className="text-slate-300">↕</span>}
                </th>
                <th className="p-3 text-right">Terakhir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {allStudents.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-400 text-sm">Tidak ada data.</td></tr>
              ) : paginatedStudents.map((s, i) => (
                <tr key={s.name + s.className + i} className={`hover:bg-slate-50 transition-colors ${!s.className ? 'bg-red-50/60 hover:bg-red-50' : ''}`}>
                  <td className="p-3 pl-5 text-slate-400 text-xs">{(studentPage - 1) * studentPerPage + i + 1}</td>
                  <td className="p-3 font-semibold text-slate-800">{s.name}</td>
                  <td className="p-3">
                    {s.className
                      ? <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">{s.className}</span>
                      : <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600 flex items-center gap-1 w-fit"><AlertTriangle size={10} />Tanpa Kelas</span>
                    }
                  </td>
                  <td className="p-3 text-right">
                    {s.late > 0 ? <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">{s.late}×</span> : <span className="text-slate-200">—</span>}
                  </td>
                  <td className="p-3 text-right">
                    {s.exit > 0 ? <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">{s.exit}×</span> : <span className="text-slate-200">—</span>}
                  </td>
                  <td className="p-3 text-right font-bold text-slate-800">{s.total}</td>
                  <td className="p-3 text-right text-xs text-slate-400">
                    {s.lastSeen ? new Date(s.lastSeen).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="sm:hidden divide-y divide-slate-50">
          {allStudents.length === 0 ? (
            <p className="p-8 text-center text-slate-400 text-sm">Tidak ada data.</p>
          ) : paginatedStudents.map((s, i) => (
            <div key={s.name + s.className + i} className={`p-4 ${!s.className ? 'bg-red-50/60' : ''}`}>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="font-semibold text-slate-800 text-sm">{s.name}</span>
                <span className="font-bold text-slate-700 text-sm">{s.total}×</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {s.className
                  ? <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{s.className}</span>
                  : <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full flex items-center gap-1"><AlertTriangle size={9} />Tanpa Kelas</span>
                }
                {s.late > 0 && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{s.late}× Terlambat</span>}
                {s.exit > 0 && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{s.exit}× Keluar</span>}
              </div>
            </div>
          ))}
        </div>

        {noClassCount > 0 && (
          <div className="p-4 border-t border-red-100 bg-red-50 flex items-start gap-2 text-sm text-red-700">
            <AlertTriangle size={16} className="shrink-0 mt-0.5 text-red-500" />
            <span>Ada <strong>{noClassCount} data tanpa kelas</strong> (baris merah di atas).
              Pergi ke <strong>Siswa Terlambat</strong> atau <strong>Izin Keluar</strong> → cari nama → klik ✏️ Edit untuk memperbaiki.</span>
          </div>
        )}
        <Pagination total={allStudents.length} page={studentPage} perPage={studentPerPage} onPageChange={setStudentPage} onPerPageChange={setStudentPerPage} />
      </div>
    </div>
  );
};
