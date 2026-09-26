import { apiClient } from './api';
import { EmergencyContact, EmergencyContactCreate, EmergencyContactUpdate } from '../types';

export const contactService = {
  async addContact(memberId: string, data: EmergencyContactCreate): Promise<EmergencyContact> {
    const response = await apiClient.post<EmergencyContact>(`/members/${memberId}/emergency-contacts`, data);
    return response.data;
  },

  async listContacts(memberId: string): Promise<EmergencyContact[]> {
    const response = await apiClient.get<EmergencyContact[]>(`/members/${memberId}/emergency-contacts`);
    return response.data;
  },

  async updateContact(contactId: string, data: EmergencyContactUpdate): Promise<EmergencyContact> {
    const response = await apiClient.put<EmergencyContact>(`/emergency-contacts/${contactId}`, data);
    return response.data;
  },

  async deleteContact(contactId: string): Promise<void> {
    await apiClient.delete(`/emergency-contacts/${contactId}`);
  },
};
