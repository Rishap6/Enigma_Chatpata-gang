export type HouseholdNotificationType =
  | 'HIGH_ATTENTION'
  | 'VERIFICATION_REQUIRED'
  | 'RECURRING_PATTERN'
  | 'SYSTEM_INFO';

export type HouseholdNotificationStatus = 'unread' | 'read';

export interface HouseholdNotification {
  id: string;
  family_id: string;
  recipient_member_id?: string | null;
  type: HouseholdNotificationType;
  title: string;
  message: string;
  status: HouseholdNotificationStatus;
  source_type: string;
  source_id?: string | null;
  product_id?: string | null;
  receipt_id?: string | null;
  finding_id?: string | null;
  created_at: string;
  read_at?: string | null;
  product_name?: string | null;
  member_name?: string | null;
  action_label: string;
  action_path: string;
  whatsapp_demo_preview?: {
    channel: string;
    label: string;
    to: string;
    message: string;
  } | null;
}

export interface HouseholdNotificationListResponse {
  items: HouseholdNotification[];
  total: number;
}

export interface UnreadCountResponse {
  family_id: string;
  unread_count: number;
}
