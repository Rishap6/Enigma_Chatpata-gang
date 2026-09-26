import { apiClient } from './api';
import { Allergy, AllergyCreate, AllergyUpdate } from '../types';

export const allergyService = {
  async addAllergy(memberId: string, allergyData: AllergyCreate): Promise<Allergy> {
    const response = await apiClient.post<Allergy>(`/members/${memberId}/allergies`, allergyData);
    return response.data;
  },

  async listAllergies(memberId: string): Promise<Allergy[]> {
    const response = await apiClient.get<Allergy[]>(`/members/${memberId}/allergies`);
    return response.data;
  },

  async updateAllergy(allergyId: string, allergyData: AllergyUpdate): Promise<Allergy> {
    const response = await apiClient.put<Allergy>(`/allergies/${allergyId}`, allergyData);
    return response.data;
  },

  async deleteAllergy(allergyId: string): Promise<void> {
    await apiClient.delete(`/allergies/${allergyId}`);
  },
};
