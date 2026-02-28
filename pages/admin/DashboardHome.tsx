import React from 'react';
import { Clock, LogOut, FileText, LayoutDashboard, AlertCircle } from 'lucide-react';
import { StudentPermit, PermitType } from '../../types';

interface DashboardHomeProps {
  permits: StudentPermit[];
  loading: boolean;
  onViewAll: (path: string) => void;
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

const StatCard = ({ title, value, icon: Icon, colorClass, subtitle, onClick }: any) => (
  <div
    onClick={onClick}
    className={`p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden bg-white group transition-all cursor-pointer hover:shadow-md hover:-translate-y-0.5`}
  >
    <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${colorClass}`}>
      <Icon size={64} />
    </div>
    <div className="relative z-10">
      <p className="text-slate-500 font-medium text-sm mb-1">{title}</p>
      <h3 className="text-3xl font-bold text-slate-800">{value}</h3>
      {subtitle && <p className="text-xs text-slate-400 mt-2">{subtitle}</p>}
    </div>
  </div>
);

export const DashboardHome: React.FC<DashboardHomeProps> = ({ permits, loading, onViewAll }) => {
  const today = new Date().toDateString();
  const todayLate = permits.filter(p => p.type === PermitType.LATE_ENTRY && new Date(p.timestamp).toDateString() === today).length;
  const todayExit = permits.filter(p => p.type === PermitType.EXIT_PERMIT && new Date(p.timestamp).toDateString() === today).length;
  const totalEntries = permits.length;

  const recent = [...permits].sort((a, b) => b.timestamp - a.timestamp).slice(0, 7);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Stat Cards — 2 col mobile, 3 col desktop */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
        <StatCard
          title="Terlambat Hari Ini"
          value={loading ? '...' : todayLate}
          icon={Clock}
          colorClass="text-amber-500"
          subtitle="Siswa terlambat"
          onClick={() => onViewAll('/admin/late')}
        />
        <StatCard
          title="Izin Keluar Hari Ini"
          value={loading ? '...' : todayExit}
          icon={LogOut}
          colorClass="text-blue-500"
          subtitle="Surat diterbitkan"
          onClick={() => onViewAll('/admin/exit')}
        />
        <StatCard
          title="Total Riwayat"
          value={loading ? '...' : totalEntries}
          icon={FileText}
          colorClass="text-indigo-500"
          subtitle="Semua data"
          onClick={() => onViewAll('/admin/reports')}
          className="col-span-2 md:col-span-1"
        />
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
                <div className="text-right shrink-0">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${permit.type === PermitType.LATE_ENTRY ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                    {permit.type === PermitType.LATE_ENTRY ? 'Terlambat' : 'Izin Keluar'}
                  </span>
                  <p className="text-xs text-slate-400 mt-1">{getTimeAgo(permit.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
