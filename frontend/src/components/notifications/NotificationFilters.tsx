import React from 'react';

export type NotificationFilterStatus = 'all' | 'unread' | 'read';
export type NotificationFilterType = 'all' | 'HIGH_ATTENTION' | 'VERIFICATION_REQUIRED' | 'RECURRING_PATTERN';

interface NotificationFiltersProps {
  status: NotificationFilterStatus;
  type: NotificationFilterType;
  onStatusChange: (v: NotificationFilterStatus) => void;
  onTypeChange: (v: NotificationFilterType) => void;
}

export const NotificationFilters: React.FC<NotificationFiltersProps> = ({
  status,
  type,
  onStatusChange,
  onTypeChange,
}) => (
  <div className="flex flex-wrap gap-2">
    <select
      value={status}
      onChange={(e) => onStatusChange(e.target.value as NotificationFilterStatus)}
      className="text-xs font-medium border border-slate-200 rounded-lg px-2 py-1.5 bg-white"
      aria-label="Filter by read status"
    >
      <option value="all">All status</option>
      <option value="unread">Unread</option>
      <option value="read">Read</option>
    </select>
    <select
      value={type}
      onChange={(e) => onTypeChange(e.target.value as NotificationFilterType)}
      className="text-xs font-medium border border-slate-200 rounded-lg px-2 py-1.5 bg-white"
      aria-label="Filter by notification type"
    >
      <option value="all">All types</option>
      <option value="HIGH_ATTENTION">Attention needed</option>
      <option value="VERIFICATION_REQUIRED">Verification required</option>
      <option value="RECURRING_PATTERN">Recurring pattern</option>
    </select>
  </div>
);
