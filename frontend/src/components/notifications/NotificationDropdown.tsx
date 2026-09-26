import React, { useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '../../services/notificationService';
import { NotificationCard } from './NotificationCard';
import { navigateToNotificationAction } from './notificationUtils';
import { HouseholdNotification } from '../../types/notifications';

interface NotificationDropdownProps {
  familyId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  familyId,
  isOpen,
  onClose,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications-recent', familyId],
    queryFn: () => notificationService.listAlerts(familyId, { limit: 5 }),
    enabled: !!familyId && isOpen,
  });

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    if (isOpen) document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleAction = async (notification: HouseholdNotification) => {
    onClose();
    await navigateToNotificationAction(notification, navigate, (id) =>
      notificationService.markRead(id)
    );
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
  };

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 w-[min(100vw-2rem,22rem)] bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden"
    >
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">Recent alerts</span>
        <Link
          to="/notifications"
          onClick={onClose}
          className="text-[11px] font-semibold text-emerald-700 hover:underline"
        >
          View all
        </Link>
      </div>
      <div className="max-h-[24rem] overflow-y-auto p-2 space-y-2">
        {isLoading && <p className="text-xs text-slate-400 p-4 text-center">Loading...</p>}
        {!isLoading && data?.items.length === 0 && (
          <p className="text-xs text-slate-500 p-4 text-center">No alerts yet.</p>
        )}
        {data?.items.map((n) => (
          <NotificationCard key={n.id} notification={n} onAction={handleAction} compact />
        ))}
      </div>
    </div>
  );
};
