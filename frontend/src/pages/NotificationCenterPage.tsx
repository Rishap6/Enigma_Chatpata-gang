import React from 'react';
import { useAuth } from '../context/AuthContext';
import { NotificationCenter } from '../components/notifications/NotificationCenter';
import { Bell } from 'lucide-react';

export const NotificationCenterPage: React.FC = () => {
  const { activeFamily } = useAuth();

  if (!activeFamily) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center text-sm text-slate-500">
        Select or create a family to view household alerts.
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 pb-24 md:pb-8">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-emerald-600 mb-1">
          <Bell className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-wider">Household alerts</span>
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Notification Center</h1>
        <p className="text-sm text-slate-500 mt-1">
          Informational purchase findings for {activeFamily.name}. Not medical advice.
        </p>
      </div>
      <NotificationCenter familyId={activeFamily.id} />
    </div>
  );
};
