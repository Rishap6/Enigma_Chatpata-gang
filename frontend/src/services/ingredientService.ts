import { apiClient } from './api';
import {
  IngredientDetail,
  IngredientSearchItem,
  NormalizationResponse,
  RelationshipTraceResponse,
  UnifiedIngredientAnalysis,
} from '../types';

export const ingredientService = {
  /**
   * Fast search across canonical ingredients and aliases
   */
  async searchIngredients(query: string): Promise<IngredientSearchItem[]> {
    const response = await apiClient.get<IngredientSearchItem[]>('/ingredients/search', {
      params: { q: query },
    });
    return response.data;
  },

  /**
   * Deterministic & fuzzy normalization
   */
  async normalizeIngredient(text: string): Promise<NormalizationResponse> {
    const response = await apiClient.post<NormalizationResponse>('/ingredients/normalize', {
      text,
    });
    return response.data;
  },

  /**
   * Unified end-to-end ingredient intelligence analysis
   */
  async analyzeIngredient(text: string): Promise<UnifiedIngredientAnalysis> {
    const response = await apiClient.post<UnifiedIngredientAnalysis>('/ingredients/analyze', {
      text,
    });
    return response.data;
  },

  /**
   * Get single ingredient details by ID
   */
  async getIngredient(id: string): Promise<IngredientDetail> {
    const response = await apiClient.get<IngredientDetail>(`/ingredients/${id}`);
    return response.data;
  },

  /**
   * Trace multi-level relationship derivation chain
   */
  async traceRelationships(id: string, maxDepth = 5): Promise<RelationshipTraceResponse> {
    const response = await apiClient.get<RelationshipTraceResponse>(`/ingredients/${id}/trace`, {
      params: { max_depth: maxDepth },
    });
    return response.data;
  },

  /**
   * List known ingredients
   */
  async listIngredients(skip = 0, limit = 50): Promise<IngredientDetail[]> {
    const response = await apiClient.get<IngredientDetail[]>('/ingredients', {
      params: { skip, limit },
    });
    return response.data;
  },
};
