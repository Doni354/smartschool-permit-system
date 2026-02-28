import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Clock, LogOut, BarChart2, LogOutIcon, X } from 'lucide-react';

interface SidebarProps {
  onLogout: () => void;
  schoolName: string;
  adminName?: string;
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/late', label: 'Siswa Terlambat', icon: Clock, end: false },
  { to: '/admin/exit', label: 'Izin Keluar', icon: LogOut, end: false },
  { to: '/admin/reports', label: 'Laporan', icon: BarChart2, end: false },
];

export const Sidebar: React.FC<SidebarProps> = ({ onLogout, schoolName, adminName, isOpen, onClose }) => {
  return (
    <>
      {/* Mobile backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside className={`
        fixed top-0 left-0 h-full z-40 w-64 bg-slate-900 text-white flex flex-col print:hidden
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0 lg:shrink-0
      `}>
        {/* Brand + mobile close button */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 bg-blue-500 rounded-xl flex items-center justify-center font-black text-lg shrink-0">S</div>
            <div className="min-w-0">
              <h1 className="font-bold text-sm leading-tight truncate" title={schoolName}>{schoolName}</h1>
              <p className="text-xs text-slate-400 mt-0.5">Admin Panel</p>
            </div>
          </div>
          {/* Close button — only visible on mobile */}
          <button
            onClick={onClose}
            className="lg:hidden text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg p-1.5 transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose} // close sidebar on mobile when link clicked
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Admin info + logout */}
        <div className="p-3 border-t border-slate-800">
          {adminName && (
            <div className="px-3 py-2 mb-2">
              <p className="text-xs text-slate-500">Masuk sebagai</p>
              <p className="text-sm text-slate-300 font-medium truncate">{adminName}</p>
            </div>
          )}
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-red-400 hover:bg-slate-800 hover:text-red-300 rounded-xl text-sm font-medium transition-all"
          >
            <LogOutIcon size={18} />
            Keluar
          </button>
        </div>
      </aside>
    </>
  );
};