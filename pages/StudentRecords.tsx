import React, { useState, useEffect, useMemo } from 'react';
import { SchoolProfile, StudentPermit, PermitType } from '../types';
import { getPermitsBySchoolTA } from '../services/permitService';
import { GRADES, GRADE_LETTERS, getTahunAjaran } from '../utils/school';
import { Search, Users, Clock, AlertCircle, ChevronDown, FileText, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Pagination } from '../components/Pagination';
import { VersionFooter } from '../components/VersionFooter';

interface StudentRecordsProps {
  schools: SchoolProfile[];
}

function getInitials(name: string) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

export const StudentRecords: React.FC<StudentRecordsProps> = ({ schools }) => {
  const school = schools[0];
  const [permits, setPermits] = useState<StudentPermit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [letterFilter, setLetterFilter] = useState('');

  // TA selector
  const currentTA = getTahunAjaran(Date.now());
  const [selectedTA, setSelectedTA] = useState(currentTA);
  const taOptions = (() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const startYear = month >= 6 ? year : year - 1;
    return [
      `${startYear}/${startYear + 1}`,
      `${startYear - 1}/${startYear}`,
      `${startYear - 2}/${startYear - 1}`,
    ];
  })();

  // Fetch permits for selected Tahun Ajaran
  useEffect(() => {
    setLoading(true);
    getPermitsBySchoolTA(school.id, selectedTA)
      .then(data => setPermits(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [school.id, selectedTA]);

  const handleGradeSelect = (g: string) => { setGradeFilter(g); setLetterFilter(''); };

  const students = useMemo(() => {
    const map: Record<string, { name: string; className: string; late: number; exit: number; lastSeen: number }> = {};
    for (const p of permits) {
      const key = p.studentName.toLowerCase().trim() + '||' + (p.className || '');
      if (!map[key]) map[key] = { name: p.studentName, className: p.className || '', late: 0, exit: 0, lastSeen: 0 };
      if (p.type === PermitType.LATE_ENTRY) map[key].late++;
      else map[key].exit++;
      if (p.timestamp > map[key].lastSeen) map[key].lastSeen = p.timestamp;
    }
    let rows = Object.values(map).map(r => ({ ...r, total: r.late + r.exit }));
    rows.sort((a, b) => b.total - a.total);

    // Filters
    if (gradeFilter && letterFilter) {
      rows = rows.filter(r => r.className === `${gradeFilter}-${letterFilter}`);
    } else if (gradeFilter) {
      rows = rows.filter(r => r.className.startsWith(gradeFilter + '-'));
    }
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(r => r.name.toLowerCase().includes(q) || r.className.toLowerCase().includes(q));
    }
    return rows;
  }, [permits, search, gradeFilter, letterFilter]);

  // Pagination
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  useEffect(() => { setPage(1); }, [search, gradeFilter, letterFilter]);
  const paginated = useMemo(() => students.slice((page - 1) * perPage, page * perPage), [students, page, perPage]);

  // Current month stats
  const now = new Date();
  const thisMonthPermits = useMemo(() =>
    permits.filter(p => {
      const d = new Date(p.timestamp);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }), [permits]);

  const monthLate = thisMonthPermits.filter(p => p.type === PermitType.LATE_ENTRY).length;
  const monthExit = thisMonthPermits.filter(p => p.type === PermitType.EXIT_PERMIT).length;

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-4">
            <Link to="/" className="text-slate-400 hover:text-white transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-xl font-bold">Rekap Data Siswa</h1>
              <p className="text-slate-400 text-sm">{school.name}</p>
            </div>
            <div className="ml-auto relative">
              <select
                className="appearance-none bg-white/10 backdrop-blur border-0 rounded-lg pl-3 pr-8 py-2 text-sm font-semibold text-white focus:ring-2 focus:ring-blue-400 outline-none cursor-pointer"
                value={selectedTA}
                onChange={e => setSelectedTA(e.target.value)}
              >
                {taOptions.map(ta => (
                  <option key={ta} value={ta} className="text-slate-800">TA {ta}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
            </div>
          </div>

          {/* Month summary cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
              <p className="text-xs text-slate-300 mb-1">Terlambat Bulan Ini</p>
              <p className="text-2xl font-bold text-amber-400">{loading ? '...' : monthLate}</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
              <p className="text-xs text-slate-300 mb-1">Dispen Bulan Ini</p>
              <p className="text-2xl font-bold text-blue-400">{loading ? '...' : monthExit}</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
              <p className="text-xs text-slate-300 mb-1">Total Siswa</p>
              <p className="text-2xl font-bold text-white">{loading ? '...' : students.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-4xl mx-auto px-4 py-4 space-y-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text" placeholder="Cari nama atau kelas..."
              className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
              <button onClick={() => handleGradeSelect('')}
                className={`px-2.5 py-1 text-xs rounded-md font-semibold transition-all ${gradeFilter === '' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Semua</button>
              {GRADES.map(g => (
                <button key={g} onClick={() => handleGradeSelect(g)}
                  className={`px-2.5 py-1 text-xs rounded-md font-semibold transition-all ${gradeFilter === g ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>{g}</button>
              ))}
            </div>
            <span className="text-xs text-slate-400">
              <strong className="text-slate-600">{students.length}</strong> siswa ditemukan
            </span>
          </div>

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
        </div>

        {/* Student List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">Memuat data...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
            <AlertCircle size={40} className="opacity-20" />
            <p className="font-medium text-sm">Tidak ada data ditemukan</p>
          </div>
        ) : (
          <>
          <div className="space-y-2">
            {paginated.map((s, i) => (
              <div key={s.name + s.className + i} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                    s.total >= 5 ? 'bg-red-100 text-red-700' : s.total >= 3 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {getInitials(s.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{s.name}</p>
                    <p className="text-xs text-slate-400">{s.className || 'Tanpa Kelas'}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs shrink-0">
                    {s.late > 0 && (
                      <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">
                        {s.late}× Telat
                      </span>
                    )}
                    {s.exit > 0 && (
                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                        {s.exit}× Dispen
                      </span>
                    )}
                    <span className={`font-bold text-sm ${s.total >= 5 ? 'text-red-600' : 'text-slate-700'}`}>{s.total}×</span>
                  </div>
                </div>
                {s.total >= 5 && (
                  <div className="mt-2 pt-2 border-t border-red-100 flex items-center gap-1.5 text-xs text-red-600">
                    <AlertCircle size={12} />
                    <span>Perlu perhatian — sudah {s.total} kali tercatat</span>
                  </div>
                )}
              </div>
            ))}
          </div>
          <Pagination total={students.length} page={page} perPage={perPage} onPageChange={setPage} onPerPageChange={setPerPage} />
          </>
        )}
      </div>

      {/* Footer */}
      <div className="max-w-4xl mx-auto px-4 pb-8 pt-4 space-y-3">
        <div className="flex gap-2">
          <Link to="/" className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-amber-50 text-amber-700 border border-amber-200 font-semibold text-xs py-2.5 rounded-lg transition-all">
            <Clock size={14} /> Catat Terlambat
          </Link>
          <Link to="/dispen" className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold text-xs py-2.5 rounded-lg transition-all">
            <FileText size={14} /> Form Dispensasi
          </Link>
        </div>
        <VersionFooter schoolName={school.name} />
      </div>
    </div>
  );
};
