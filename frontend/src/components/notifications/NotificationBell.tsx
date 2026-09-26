import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { notificationService } from '../../services/notificationService';
import { NotificationDropdown } from './NotificationDropdown';

interface NotificationBellProps {
  familyId?: string | null;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ familyId }) => {
  const [open, setOpen] = useState(false);

  const { data: unread = 0 } = useQuery({
    queryKey: ['notifications-unread', familyId],
    queryFn: () => notificationService.getUnreadCount(familyId!),
    enabled: !!familyId,
    refetchInterval: 60000,
  });

  if (!familyId) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center transition"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
      >
        <Bell className="w-4 h-4 text-slate-600" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
      <NotificationDropdown familyId={familyId} isOpen={open} onClose={() => setOpen(false)} />
    </div>
  );
};
