import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '../../services/notificationService';
import { HouseholdNotification } from '../../types/notifications';
import { NotificationCard } from './NotificationCard';
import { NotificationEmptyState } from './NotificationEmptyState';
import { NotificationFilters, NotificationFilterStatus, NotificationFilterType } from './NotificationFilters';
import { LoadingState } from '../LoadingState';
import { ErrorState } from '../ErrorState';
import { navigateToNotificationAction } from './notificationUtils';

interface NotificationCenterProps {
  familyId: string;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ familyId }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = React.useState<NotificationFilterStatus>('all');
  const [typeFilter, setTypeFilter] = React.useState<NotificationFilterType>('all');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['notifications', familyId, statusFilter, typeFilter],
    queryFn: () =>
      notificationService.listAlerts(familyId, {
        status: statusFilter === 'all' ? undefined : statusFilter,
        type: typeFilter === 'all' ? undefined : typeFilter,
        limit: 100,
      }),
    enabled: !!familyId,
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationService.markAllRead(familyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  const handleAction = async (notification: HouseholdNotification) => {
    await navigateToNotificationAction(notification, navigate, (id) =>
      notificationService.markRead(id)
    );
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
  };

  if (isLoading) return <LoadingState message="Loading household alerts..." />;
  if (error) {
    return (
      <ErrorState
        message="Could not load notifications."
        onRetry={() => refetch()}
      />
    );
  }

  const items = data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <NotificationFilters
          status={statusFilter}
          type={typeFilter}
          onStatusChange={setStatusFilter}
          onTypeChange={setTypeFilter}
        />
        {items.some((n) => n.status === 'unread') && (
          <button
            type="button"
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 self-start sm:self-auto"
          >
            Mark all as read
          </button>
        )}
      </div>

      <p className="text-[11px] text-slate-500 border-l-2 border-slate-200 pl-3">
        Emergency contacts are stored for household reference only — alerts are never sent
        automatically.{' '}
        <a href="/family" className="text-emerald-700 font-medium hover:underline">
          View emergency contacts
        </a>
      </p>

      {items.length === 0 ? (
        <NotificationEmptyState />
      ) : (
        <div className="grid gap-3">
          {items.map((n) => (
            <NotificationCard key={n.id} notification={n} onAction={handleAction} />
          ))}
        </div>
      )}
    </div>
  );
};
