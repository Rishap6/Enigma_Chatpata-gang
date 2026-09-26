import { apiClient } from './api';
import { IngredientExclusion, IngredientExclusionCreate } from '../types';

export const ingredientExclusionService = {
  async addExclusion(memberId: string, data: IngredientExclusionCreate): Promise<IngredientExclusion> {
    const response = await apiClient.post<IngredientExclusion>(`/members/${memberId}/ingredient-exclusions`, data);
    return response.data;
  },

  async listExclusions(memberId: string): Promise<IngredientExclusion[]> {
    const response = await apiClient.get<IngredientExclusion[]>(`/members/${memberId}/ingredient-exclusions`);
    return response.data;
  },

  async deleteExclusion(exclusionId: string): Promise<void> {
    await apiClient.delete(`/ingredient-exclusions/${exclusionId}`);
  },
};
