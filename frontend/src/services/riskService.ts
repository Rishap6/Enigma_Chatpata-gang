import { apiClient } from './api';
import {
  RiskAnalysisResponse,
  MemberRiskResponse,
  ProductRiskResponse,
  FamilyRiskMatrixCell,
  RiskExplainability,
} from '../types';

export const riskService = {
  /**
   * Triggers family risk analysis for a receipt against all family members.
   */
  async analyzeReceiptRisk(receiptId: string, familyId?: string): Promise<RiskAnalysisResponse> {
    const params = familyId ? { family_id: familyId } : {};
    const response = await apiClient.post<RiskAnalysisResponse>(
      `/risk/receipts/${receiptId}/analyze`,
      null,
      { params }
    );
    return response.data;
  },

  /**
   * Fetches latest family risk analysis for a receipt.
   */
  async getLatestReceiptRisk(receiptId: string): Promise<RiskAnalysisResponse> {
    const response = await apiClient.get<RiskAnalysisResponse>(`/risk/receipts/${receiptId}`);
    return response.data;
  },

  /**
   * Fetches specific risk analysis run by its ID.
   */
  async getRiskAnalysis(analysisId: string): Promise<RiskAnalysisResponse> {
    const response = await apiClient.get<RiskAnalysisResponse>(`/risk/analyses/${analysisId}`);
    return response.data;
  },

  /**
   * Fetches findings specifically for one family member.
   */
  async getReceiptMemberRisk(receiptId: string, memberId: string): Promise<MemberRiskResponse> {
    const response = await apiClient.get<MemberRiskResponse>(
      `/risk/receipts/${receiptId}/members/${memberId}`
    );
    return response.data;
  },

  /**
   * Fetches impact breakdown across all family members for a single purchased product.
   */
  async getReceiptProductRisk(receiptId: string, productId: string): Promise<ProductRiskResponse> {
    const response = await apiClient.get<ProductRiskResponse>(
      `/risk/receipts/${receiptId}/products/${productId}`
    );
    return response.data;
  },

  /**
   * Fetches the 2D Family x Product risk matrix.
   */
  async getReceiptMatrix(receiptId: string): Promise<FamilyRiskMatrixCell[]> {
    const response = await apiClient.get<FamilyRiskMatrixCell[]>(
      `/risk/receipts/${receiptId}/matrix`
    );
    return response.data;
  },

  /**
   * Fetches full Phase 7 explainability object for a specific risk finding.
   */
  async getFindingExplanation(findingId: string): Promise<RiskExplainability> {
    const response = await apiClient.get<RiskExplainability>(
      `/risk/findings/${findingId}/explanation`
    );
    return response.data;
  },
};
