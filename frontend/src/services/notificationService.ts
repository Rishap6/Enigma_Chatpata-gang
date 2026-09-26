import { apiClient } from './api';
import { NotificationPreference, NotificationPreferenceUpdate } from '../types';
import {
  HouseholdNotification,
  HouseholdNotificationListResponse,
  UnreadCountResponse,
} from '../types/notifications';

export const notificationService = {
  async getPreferences(memberId: string): Promise<NotificationPreference> {
    const response = await apiClient.get<NotificationPreference>(`/members/${memberId}/notification-preferences`);
    return response.data;
  },

  async updatePreferences(memberId: string, data: NotificationPreferenceUpdate): Promise<NotificationPreference> {
    const response = await apiClient.put<NotificationPreference>(`/members/${memberId}/notification-preferences`, data);
    return response.data;
  },

  async listAlerts(
    familyId: string,
    params?: { status?: string; type?: string; limit?: number; offset?: number }
  ): Promise<HouseholdNotificationListResponse> {
    const response = await apiClient.get<HouseholdNotificationListResponse>('/notifications', {
      params: { family_id: familyId, ...params },
    });
    return response.data;
  },

  async getUnreadCount(familyId: string): Promise<number> {
    const response = await apiClient.get<UnreadCountResponse>('/notifications/unread-count', {
      params: { family_id: familyId },
    });
    return response.data.unread_count;
  },

  async getAlert(notificationId: string): Promise<HouseholdNotification> {
    const response = await apiClient.get<HouseholdNotification>(`/notifications/${notificationId}`);
    return response.data;
  },

  async markRead(notificationId: string): Promise<HouseholdNotification> {
    const response = await apiClient.put<HouseholdNotification>(`/notifications/${notificationId}/read`);
    return response.data;
  },

  async markAllRead(familyId: string): Promise<number> {
    const response = await apiClient.put<{ marked_read: number }>('/notifications/read-all', null, {
      params: { family_id: familyId },
    });
    return response.data.marked_read;
  },

  async generateAlerts(familyId: string): Promise<number> {
    const response = await apiClient.post<{ created_count: number }>('/notifications/generate', null, {
      params: { family_id: familyId },
    });
    return response.data.created_count;
  },
};
