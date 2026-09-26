import React from 'react';
import { HouseholdNotification } from '../../types/notifications';
import {
  formatNotificationType,
  formatRelativeTime,
  typeBadgeClass,
} from './notificationUtils';

interface NotificationCardProps {
  notification: HouseholdNotification;
  onAction: (notification: HouseholdNotification) => void;
  compact?: boolean;
}

export const NotificationCard: React.FC<NotificationCardProps> = ({
  notification,
  onAction,
  compact = false,
}) => {
  const isUnread = notification.status === 'unread';

  return (
    <article
      className={`rounded-xl border p-4 transition-all ${
        isUnread
          ? 'bg-emerald-50/60 border-emerald-200/80 shadow-xs'
          : 'bg-white border-slate-200'
      } ${compact ? 'p-3' : ''}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span
          className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${typeBadgeClass(
            notification.type
          )}`}
        >
          {formatNotificationType(notification.type)}
        </span>
        {isUnread && (
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1" aria-label="Unread" />
        )}
      </div>

      <h3 className={`font-bold text-slate-900 ${compact ? 'text-sm' : 'text-base'} leading-snug`}>
        {notification.product_name || notification.title}
      </h3>
      {notification.product_name && (
        <p className="text-xs text-slate-500 mt-0.5">{notification.title}</p>
      )}

      <p className={`text-slate-600 mt-2 ${compact ? 'text-xs line-clamp-2' : 'text-sm line-clamp-3'}`}>
        {notification.message}
      </p>

      {notification.member_name && (
        <p className="text-xs font-medium text-slate-700 mt-2">Member: {notification.member_name}</p>
      )}

      <div className="flex items-center justify-between mt-3 gap-2">
        <button
          type="button"
          onClick={() => onAction(notification)}
          className="text-xs font-bold text-emerald-700 hover:text-emerald-900 underline-offset-2 hover:underline"
        >
          {notification.action_label}
        </button>
        <time className="text-[10px] text-slate-400 shrink-0">
          {formatRelativeTime(notification.created_at)}
        </time>
      </div>

      {notification.whatsapp_demo_preview && (
        <p className="mt-2 text-[10px] text-slate-400 italic border-t border-slate-100 pt-2">
          {notification.whatsapp_demo_preview.label}
        </p>
      )}
    </article>
  );
};
