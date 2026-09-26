import { HouseholdNotification, HouseholdNotificationType } from '../../types/notifications';

export function formatNotificationType(type: HouseholdNotificationType): string {
  switch (type) {
    case 'HIGH_ATTENTION':
      return 'Attention needed';
    case 'VERIFICATION_REQUIRED':
      return 'Verification required';
    case 'RECURRING_PATTERN':
      return 'Recurring pattern';
    case 'SYSTEM_INFO':
      return 'System info';
    default:
      return (type as string).replace(/_/g, ' ');
  }
}

export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diffMs = Date.now() - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString();
}

export function typeBadgeClass(type: HouseholdNotificationType): string {
  switch (type) {
    case 'HIGH_ATTENTION':
      return 'bg-rose-100 text-rose-800 border-rose-200';
    case 'VERIFICATION_REQUIRED':
      return 'bg-amber-100 text-amber-900 border-amber-200';
    case 'RECURRING_PATTERN':
      return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

export async function navigateToNotificationAction(
  notification: HouseholdNotification,
  navigate: (path: string) => void,
  markRead: (id: string) => Promise<unknown>
): Promise<void> {
  if (notification.status === 'unread') {
    await markRead(notification.id);
  }
  navigate(notification.action_path);
}
