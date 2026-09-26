import { apiClient } from './api';
import {
  NutritionPreference,
  NutritionPreferenceCreate,
  CustomRule,
  CustomRuleCreate,
} from '../types';

export const preferenceService = {
  // Nutrition Preferences
  async addNutritionPreference(memberId: string, data: NutritionPreferenceCreate): Promise<NutritionPreference> {
    const response = await apiClient.post<NutritionPreference>(`/members/${memberId}/nutrition-preferences`, data);
    return response.data;
  },

  async listNutritionPreferences(memberId: string): Promise<NutritionPreference[]> {
    const response = await apiClient.get<NutritionPreference[]>(`/members/${memberId}/nutrition-preferences`);
    return response.data;
  },

  async deleteNutritionPreference(prefId: string): Promise<void> {
    await apiClient.delete(`/nutrition-preferences/${prefId}`);
  },

  // Custom Rules
  async addCustomRule(memberId: string, data: CustomRuleCreate): Promise<CustomRule> {
    const response = await apiClient.post<CustomRule>(`/members/${memberId}/custom-rules`, data);
    return response.data;
  },

  async listCustomRules(memberId: string): Promise<CustomRule[]> {
    const response = await apiClient.get<CustomRule[]>(`/members/${memberId}/custom-rules`);
    return response.data;
  },

  async deleteCustomRule(ruleId: string): Promise<void> {
    await apiClient.delete(`/custom-rules/${ruleId}`);
  },
};
