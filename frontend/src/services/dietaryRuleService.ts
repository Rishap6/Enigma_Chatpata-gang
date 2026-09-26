import { apiClient } from './api';
import { DietaryRule, DietaryRuleCreate } from '../types';

export const dietaryRuleService = {
  async addDietaryRule(memberId: string, ruleData: DietaryRuleCreate): Promise<DietaryRule> {
    const response = await apiClient.post<DietaryRule>(`/members/${memberId}/dietary-rules`, ruleData);
    return response.data;
  },

  async listDietaryRules(memberId: string): Promise<DietaryRule[]> {
    const response = await apiClient.get<DietaryRule[]>(`/members/${memberId}/dietary-rules`);
    return response.data;
  },

  async deleteDietaryRule(ruleId: string): Promise<void> {
    await apiClient.delete(`/dietary-rules/${ruleId}`);
  },
};
