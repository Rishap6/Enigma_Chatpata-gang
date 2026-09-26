import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Settings,
  ShieldCheck,
  HeartHandshake,
  Database,
  PackageSearch,
  ScanLine,
  Receipt,
  History,
} from 'lucide-react';
import { NotificationBell } from './notifications/NotificationBell';

export const Navbar: React.FC = () => {
  const { user, activeFamily } = useAuth();

  const desktopNavItems = [
    { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { to: '/history', label: 'History', icon: <History className="w-5 h-5" /> },
    { to: '/receipts', label: 'Receipts', icon: <Receipt className="w-5 h-5" /> },
    { to: '/scan', label: 'Scan Product', icon: <ScanLine className="w-5 h-5" />, isScan: true },
    { to: '/products', label: 'Products', icon: <PackageSearch className="w-5 h-5" /> },
    { to: '/ingredients', label: 'Ingredients', icon: <Database className="w-5 h-5" /> },
    { to: '/family', label: 'Family', icon: <Users className="w-5 h-5" /> },
    { to: '/settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
  ];

  const mobileNavItems = [
    { to: '/dashboard', label: 'Home', icon: <LayoutDashboard className="w-5 h-5" /> },
    { to: '/history', label: 'History', icon: <History className="w-5 h-5" /> },
    { to: '/scan', label: 'Scan', icon: <ScanLine className="w-6 h-6" />, isScanCenter: true },
    { to: '/receipts', label: 'Receipts', icon: <Receipt className="w-5 h-5" /> },
    { to: '/family', label: 'Family', icon: <Users className="w-5 h-5" /> },
  ];

  return (
    <>
      {/* Desktop & Top Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <Link to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-base leading-tight block tracking-tight">
                FamilyFood <span className="text-emerald-600">Safety</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium block leading-none">
                Intelligence Platform
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1.5">
            {desktopNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                    item.isScan
                      ? isActive
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/80'
                      : isActive
                      ? 'bg-emerald-50 text-emerald-800 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`
                }
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* User / Family status indicator */}
          <div className="flex items-center gap-3">
            <NotificationBell familyId={activeFamily?.id} />
            {activeFamily ? (
              <Link
                to="/family"
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200/70 border border-slate-200 text-xs font-semibold text-slate-700 transition-all"
              >
                <HeartHandshake className="w-3.5 h-3.5 text-emerald-600" />
                <span className="truncate max-w-[130px]">{activeFamily.name}</span>
              </Link>
            ) : null}

            <Link
              to="/settings"
              className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center justify-center text-xs font-bold shadow-2xs"
              title={user?.email || 'User Account'}
            >
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (Fixed for high usability at 360px-430px) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 safe-area-bottom">
        <nav className="flex items-center justify-around h-16 px-2">
          {mobileNavItems.map((item) => {
            if (item.isScanCenter) {
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className="flex flex-col items-center justify-center -mt-5 group"
                >
                  <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 group-active:scale-95 transition-all border-2 border-white">
                    {item.icon}
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 mt-0.5">{item.label}</span>
                </NavLink>
              );
            }

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center w-full h-full text-[11px] font-medium transition-all ${
                    isActive ? 'text-emerald-600 font-semibold' : 'text-slate-500 hover:text-slate-800'
                  }`
                }
              >
                <div className="mb-0.5">{item.icon}</div>
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>
    </>
  );
};
