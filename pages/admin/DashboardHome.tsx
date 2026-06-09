import React, { useMemo, useState } from 'react';
import { Clock, LogOut, FileText, LayoutDashboard, AlertCircle, TrendingUp, Users, ChevronDown, ShieldCheck } from 'lucide-react';
import { StudentPermit, PermitType, PermitStatus, resolvePermitStatus } from '../../types';
import { GRADES, GRADE_LETTERS } from '../../utils/school';

interface DashboardHomeProps {
  permits: StudentPermit[];
  loading: boolean;
  user?: any;
  onViewAll: (path: string) => void;
  onApprove?: (permit: StudentPermit) => void;
}

function getTimeAgo(timestamp: number) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'Baru saja';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  return new Date(timestamp).toLocaleDateString('id-ID');
}

function getInitials(name: string) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

const DAYS_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

const StatCard = ({ title, value, icon: Icon, colorClass, subtitle, onClick }: any) => (
  <div
    onClick={onClick}
    className={`p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden bg-white group transition-all cursor-pointer hover:shadow-md hover:-translate-y-0.5`}
  >
    <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${colorClass}`}>
      <Icon size={64} />
    </div>
    <div className="relative z-10">
      <p className="text-slate-500 font-medium text-xs sm:text-sm mb-1">{title}</p>
      <h3 className="text-2xl sm:text-3xl font-bold text-slate-800">{value}</h3>
      {subtitle && <p className="text-xs text-slate-400 mt-2">{subtitle}</p>}
    </div>
  </div>
);

export const DashboardHome: React.FC<DashboardHomeProps> = ({ permits, loading, onViewAll, onApprove, user }) => {
  const today = new Date().toDateString();
  const todayLate = permits.filter(p => p.type === PermitType.LATE_ENTRY && new Date(p.timestamp).toDateString() === today).length;
  const todayExit = permits.filter(p => p.type === PermitType.EXIT_PERMIT && new Date(p.timestamp).toDateString() === today).length;
  const totalEntries = permits.length;
  const pendingCount = permits.filter(p => resolvePermitStatus(p) === PermitStatus.PENDING).length;

  const recent = [...permits].sort((a, b) => b.timestamp - a.timestamp).slice(0, 7);

  // --- Daily trend (last 7 days) ---
  const dailyTrend = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - i));
      const dateStr = d.toDateString();
      const dayName = DAYS_ID[d.getDay()];
      const dayPermits = permits.filter(p => new Date(p.timestamp).toDateString() === dateStr);
      return {
        dayName,
        dateLabel: `${d.getDate()}/${d.getMonth() + 1}`,
        late: dayPermits.filter(p => p.type === PermitType.LATE_ENTRY).length,
        exit: dayPermits.filter(p => p.type === PermitType.EXIT_PERMIT).length,
        total: dayPermits.length
      };
    });
  }, [permits]);

  const maxDaily = Math.max(...dailyTrend.map(d => d.total), 1);

  // --- Month Recap ---
  const [monthGradeFilter, setMonthGradeFilter] = useState('');
  const now = new Date();
  const thisMonthPermits = useMemo(() => {
    return permits.filter(p => {
      const d = new Date(p.timestamp);
      const isThisMonth = d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      if (!isThisMonth) return false;
      if (monthGradeFilter && !p.className.startsWith(monthGradeFilter)) return false;
      return true;
    });
  }, [permits, monthGradeFilter]);

  const monthLate = thisMonthPermits.filter(p => p.type === PermitType.LATE_ENTRY).length;
  const monthExit = thisMonthPermits.filter(p => p.type === PermitType.EXIT_PERMIT).length;

  const classBreakdownMonth = useMemo(() => {
    const map: Record<string, { late: number; exit: number }> = {};
    for (const p of thisMonthPermits) {
      if (!map[p.className]) map[p.className] = { late: 0, exit: 0 };
      if (p.type === PermitType.LATE_ENTRY) map[p.className].late++;
      else map[p.className].exit++;
    }
    return Object.entries(map)
      .map(([cls, v]) => ({ cls, ...v, total: v.late + v.exit }))
      .sort((a, b) => b.total - a.total);
  }, [thisMonthPermits, monthGradeFilter]);

  const topStudentsMonth = useMemo(() => {
    const map: Record<string, { name: string; className: string; count: number; late: number; exit: number }> = {};
    for (const p of thisMonthPermits) {
      const key = p.studentName.toLowerCase().trim();
      if (!map[key]) map[key] = { name: p.studentName, className: p.className, count: 0, late: 0, exit: 0 };
      map[key].count++;
      if (p.type === PermitType.LATE_ENTRY) map[key].late++;
      else map[key].exit++;
    }
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [thisMonthPermits]);

  const maxClassMonth = Math.max(...classBreakdownMonth.map(c => c.total), 1);
  const monthName = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
        <StatCard title="Terlambat Hari Ini" value={loading ? '...' : todayLate} icon={Clock} colorClass="text-amber-500" subtitle="Siswa terlambat" onClick={() => onViewAll('/admin/late')} />
        <StatCard title="Izin Keluar Hari Ini" value={loading ? '...' : todayExit} icon={LogOut} colorClass="text-blue-500" subtitle="Surat diterbitkan" onClick={() => onViewAll('/admin/exit')} />
        <StatCard title="Menunggu Acc" value={loading ? '...' : pendingCount} icon={ShieldCheck} colorClass="text-orange-500" subtitle="Perlu persetujuan" onClick={() => onViewAll('/admin/exit')} />
        <StatCard title="Total Riwayat" value={loading ? '...' : totalEntries} icon={FileText} colorClass="text-indigo-500" subtitle="Semua data" onClick={() => onViewAll('/admin/reports')} />
      </div>

      {/* Daily Trend Chart */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center gap-2">
          <TrendingUp size={18} className="text-indigo-500" />
          <h3 className="font-bold text-slate-800">Tren 7 Hari Terakhir</h3>
        </div>
        <div className="p-4 sm:p-5">
          <div className="flex items-end gap-1.5 sm:gap-3 h-36 sm:h-44 mb-2">
            {dailyTrend.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                {d.total > 0 && <span className="text-xs font-bold text-slate-600">{d.total}</span>}
                <div className="w-full flex flex-col justify-end rounded-t-lg overflow-hidden" style={{ height: '120px' }}>
                  {d.exit > 0 && (
                    <div
                      style={{ height: `${(d.exit / maxDaily) * 100}%` }}
                      className="w-full bg-blue-400 transition-all duration-500"
                      title={`${d.exit} izin keluar`}
                    />
                  )}
                  {d.late > 0 && (
                    <div
                      style={{ height: `${(d.late / maxDaily) * 100}%` }}
                      className="w-full bg-amber-400 transition-all duration-500"
                      title={`${d.late} terlambat`}
                    />
                  )}
                  {d.total === 0 && (
                    <div className="w-full bg-slate-100 h-1 rounded-full mt-auto" />
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-1.5 sm:gap-3">
            {dailyTrend.map((d, i) => (
              <div key={i} className="flex-1 text-center">
                <p className="text-xs font-semibold text-slate-600">{d.dayName}</p>
                <p className="text-[10px] text-slate-400">{d.dateLabel}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* This Month Recap */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-emerald-500" />
            <h3 className="font-bold text-slate-800">Rekap Bulan Ini</h3>
            <span className="text-xs text-slate-400">— {monthName}</span>
          </div>
        </div>

        {/* Summary numbers */}
        <div className="grid grid-cols-3 gap-3 p-4 sm:p-5 border-b border-slate-100">
          <div className="bg-amber-50 rounded-xl p-3 text-center">
            <p className="text-xs text-amber-600 font-medium mb-1">Terlambat</p>
            <p className="text-xl sm:text-2xl font-bold text-amber-700">{loading ? '...' : monthLate}</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <p className="text-xs text-blue-600 font-medium mb-1">Dispen</p>
            <p className="text-xl sm:text-2xl font-bold text-blue-700">{loading ? '...' : monthExit}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 text-center">
            <p className="text-xs text-slate-500 font-medium mb-1">Total</p>
            <p className="text-xl sm:text-2xl font-bold text-slate-800">{loading ? '...' : monthLate + monthExit}</p>
          </div>
        </div>

        {/* Per class with grade filter */}
        <div className="p-4 sm:p-5 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-slate-700">Per Kelas:</span>
            <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
              <button onClick={() => setMonthGradeFilter('')}
                className={`px-2.5 py-1 text-xs rounded-md font-semibold transition-all ${monthGradeFilter === '' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Semua</button>
              {GRADES.map(g => (
                <button key={g} onClick={() => setMonthGradeFilter(g)}
                  className={`px-2.5 py-1 text-xs rounded-md font-semibold transition-all ${monthGradeFilter === g ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>{g}</button>
              ))}
            </div>
          </div>

          {classBreakdownMonth.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-4">Tidak ada data bulan ini.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {classBreakdownMonth.map(c => (
                <div key={c.cls}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-bold text-slate-700">{c.cls}</span>
                    <span className="text-xs text-slate-400">{c.total}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex">
                    <div style={{ width: `${(c.late / maxClassMonth) * 100}%` }} className="h-full bg-amber-400 transition-all" />
                    <div style={{ width: `${(c.exit / maxClassMonth) * 100}%` }} className="h-full bg-blue-400 transition-all" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <LayoutDashboard size={18} className="text-slate-400" />
            <h3 className="font-bold text-slate-800">Aktivitas Terbaru</h3>
          </div>
          <button onClick={() => onViewAll('/admin/late')} className="text-sm text-blue-600 hover:underline font-medium">
            Lihat Semua →
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p>Memuat data...</p>
          </div>
        ) : recent.length === 0 ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
            <AlertCircle size={40} className="opacity-20" />
            <p className="font-medium">Belum ada aktivitas.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {recent.map(permit => (
              <div key={permit.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0 ${permit.type === PermitType.LATE_ENTRY ? 'bg-amber-400' : 'bg-blue-500'}`}>
                  {getInitials(permit.studentName)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-slate-900 truncate">{permit.studentName}</h4>
                  <p className="text-xs text-slate-500 truncate">{permit.className} • <span className="italic">{permit.reason}</span></p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      resolvePermitStatus(permit) === PermitStatus.APPROVED 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-orange-100 text-orange-700'
                    }`}>
                      {resolvePermitStatus(permit) === PermitStatus.APPROVED ? 'Disetujui' : 'Menunggu'}
                    </span>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${permit.type === PermitType.LATE_ENTRY ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                      {permit.type === PermitType.LATE_ENTRY ? 'Terlambat' : 'Izin Keluar'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-slate-400">{getTimeAgo(permit.timestamp)}</p>
                    {resolvePermitStatus(permit) === PermitStatus.PENDING && onApprove && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onApprove(permit); }}
                        className="px-3 py-1 bg-blue-600 text-white text-[10px] font-bold rounded-lg hover:bg-blue-700 shadow-md shadow-blue-600/20 transition-all"
                      >
                        ACC
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
