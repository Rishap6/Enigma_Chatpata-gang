import { apiClient } from './api';
import { Family, FamilyDetail, FamilyDashboardResponse } from '../types';

export const familyService = {
  async listFamilies(): Promise<Family[]> {
    const response = await apiClient.get<Family[]>('/families');
    return response.data;
  },

  async createFamily(name: string): Promise<Family> {
    const response = await apiClient.post<Family>('/families', { name });
    return response.data;
  },

  async getFamily(familyId: string): Promise<FamilyDetail> {
    const response = await apiClient.get<FamilyDetail>(`/families/${familyId}`);
    return response.data;
  },

  async getFamilyDashboard(familyId: string): Promise<FamilyDashboardResponse> {
    const response = await apiClient.get<FamilyDashboardResponse>(`/families/${familyId}/dashboard`);
    return response.data;
  },

  async updateFamily(familyId: string, name: string): Promise<Family> {
    const response = await apiClient.put<Family>(`/families/${familyId}`, { name });
    return response.data;
  },

  async deleteFamily(familyId: string): Promise<void> {
    await apiClient.delete(`/families/${familyId}`);
  },

  async seedDemoData(): Promise<Family> {
    const response = await apiClient.post<Family>('/seed');
    return response.data;
  },
};
