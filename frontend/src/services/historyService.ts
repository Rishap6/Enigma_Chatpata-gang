import { apiClient } from './api';
import {
  FamilyHistoryOverviewResponse,
  HistoricalSummaryResponse,
  RecurringProductsResponse,
  RecurringIngredientsResponse,
  MemberHistoryResponse,
  RecurringFindingsResponse,
  PeriodComparisonResponse,
  MonthlyFamilyReportResponse,
  HistoricalCoverageResponse,
} from '../types/history';

export interface HistoryFilterParams {
  period?: string;
  start_date?: string;
  end_date?: string;
}

export const historyService = {
  /**
   * Fetches unified grocery history overview including summary, patterns, products, and timeline.
   */
  async getOverview(familyId: string, params?: HistoryFilterParams): Promise<FamilyHistoryOverviewResponse> {
    const response = await apiClient.get<FamilyHistoryOverviewResponse>(
      `/history/family/${familyId}`,
      { params }
    );
    return response.data;
  },

  /**
   * Fetches executive grocery summary metrics for a family and period.
   */
  async getSummary(familyId: string, params?: HistoryFilterParams): Promise<HistoricalSummaryResponse> {
    const response = await apiClient.get<HistoricalSummaryResponse>(
      `/history/family/${familyId}/summary`,
      { params }
    );
    return response.data;
  },

  /**
   * Fetches recurring purchased products with price trends and affected family members.
   */
  async getProducts(familyId: string, params?: HistoryFilterParams): Promise<RecurringProductsResponse> {
    const response = await apiClient.get<RecurringProductsResponse>(
      `/history/family/${familyId}/products`,
      { params }
    );
    return response.data;
  },

  /**
   * Fetches observed label ingredients and knowledge-derived ingredients across purchases.
   */
  async getIngredients(familyId: string, params?: HistoryFilterParams): Promise<RecurringIngredientsResponse> {
    const response = await apiClient.get<RecurringIngredientsResponse>(
      `/history/family/${familyId}/ingredients`,
      { params }
    );
    return response.data;
  },

  /**
   * Fetches member-specific historical purchase impacts and recurring requirements.
   */
  async getMembers(familyId: string, params?: HistoryFilterParams): Promise<MemberHistoryResponse> {
    const response = await apiClient.get<MemberHistoryResponse>(
      `/history/family/${familyId}/members`,
      { params }
    );
    return response.data;
  },

  /**
   * Fetches recurring grocery safety patterns detected by the rule engine.
   */
  async getTrends(familyId: string, params?: HistoryFilterParams): Promise<RecurringFindingsResponse> {
    const response = await apiClient.get<RecurringFindingsResponse>(
      `/history/family/${familyId}/trends`,
      { params }
    );
    return response.data;
  },

  /**
   * Compares current period metrics against the previous equivalent period.
   */
  async getComparison(familyId: string, period: string = 'current_month'): Promise<PeriodComparisonResponse> {
    const response = await apiClient.get<PeriodComparisonResponse>(
      `/history/family/${familyId}/comparison`,
      { params: { period } }
    );
    return response.data;
  },

  /**
   * Fetches structured monthly family grocery report.
   */
  async getReport(familyId: string, year?: number, month?: number): Promise<MonthlyFamilyReportResponse> {
    const params: Record<string, number> = {};
    if (year) params.year = year;
    if (month) params.month = month;
    const response = await apiClient.get<MonthlyFamilyReportResponse>(
      `/history/family/${familyId}/report`,
      { params }
    );
    return response.data;
  },

  /**
   * Fetches historical data quality and catalog matching coverage.
   */
  async getCoverage(familyId: string): Promise<HistoricalCoverageResponse> {
    const response = await apiClient.get<HistoricalCoverageResponse>(
      `/history/family/${familyId}/coverage`
    );
    return response.data;
  },

  /**
   * Triggers manual re-synchronization of all receipt purchase history.
   */
  async refresh(familyId: string): Promise<{ status: string; message: string; receipts_synced: number }> {
    const response = await apiClient.post<{ status: string; message: string; receipts_synced: number }>(
      `/history/family/${familyId}/refresh`
    );
    return response.data;
  },
};
