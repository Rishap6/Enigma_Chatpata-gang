import { apiClient } from './api';
import {
  Receipt,
  ReceiptItem,
  ReceiptListResponse,
  ReceiptAnalysisResponse,
  ReceiptItemUpdateRequest,
  ReceiptManualItemCreateRequest,
} from '../types';

export const receiptService = {
  /**
   * Uploads receipt image file with optional family association.
   */
  async uploadReceipt(file: File, familyId?: string): Promise<Receipt> {
    const formData = new FormData();
    formData.append('file', file);
    if (familyId) {
      formData.append('family_id', familyId);
    }

    const response = await apiClient.post<Receipt>('/receipts', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Triggers OCR, parsing, product normalization, and Phase 3 matching pipeline.
   */
  async processReceipt(receiptId: string): Promise<Receipt> {
    const response = await apiClient.post<Receipt>(`/receipts/${receiptId}/process`);
    return response.data;
  },

  /**
   * Fetches paginated grocery receipt history.
   */
  async getReceipts(params?: { page?: number; page_size?: number }): Promise<ReceiptListResponse> {
    const response = await apiClient.get<ReceiptListResponse>('/receipts', { params });
    return response.data;
  },

  /**
   * Fetches a single receipt with items, events, and coverage metrics.
   */
  async getReceipt(receiptId: string): Promise<Receipt> {
    const response = await apiClient.get<Receipt>(`/receipts/${receiptId}`);
    return response.data;
  },

  /**
   * Fetches items for a specific receipt.
   */
  async getReceiptItems(receiptId: string): Promise<ReceiptItem[]> {
    const response = await apiClient.get<ReceiptItem[]>(`/receipts/${receiptId}/items`);
    return response.data;
  },

  /**
   * Fetches structured grocery purchase intelligence dataset ready for Phase 6.
   */
  async getReceiptAnalysis(receiptId: string): Promise<ReceiptAnalysisResponse> {
    const response = await apiClient.get<ReceiptAnalysisResponse>(`/receipts/${receiptId}/analysis`);
    return response.data;
  },

  /**
   * Updates raw item text, price, or quantity.
   */
  async updateReceiptItem(itemId: string, data: ReceiptItemUpdateRequest): Promise<ReceiptItem> {
    const response = await apiClient.put<ReceiptItem>(`/receipts/items/${itemId}`, data);
    return response.data;
  },

  /**
   * Resolves an ambiguous item by assigning a catalog product.
   */
  async resolveReceiptItemProduct(itemId: string, productId: string): Promise<ReceiptItem> {
    const response = await apiClient.post<ReceiptItem>(`/receipts/items/${itemId}/resolve-product`, {
      product_id: productId,
    });
    return response.data;
  },

  /**
   * Resolves an item via barcode scanner or manual barcode entry (Phase 4 integration).
   */
  async resolveReceiptItemBarcode(
    itemId: string,
    identifierType: string,
    identifierValue: string
  ): Promise<ReceiptItem> {
    const response = await apiClient.post<ReceiptItem>(`/receipts/items/${itemId}/resolve-barcode`, {
      identifier_type: identifierType,
      identifier_value: identifierValue,
    });
    return response.data;
  },

  /**
   * Adds a grocery item manually and runs Phase 3 matching.
   */
  async addManualItem(
    receiptId: string,
    data: ReceiptManualItemCreateRequest
  ): Promise<ReceiptItem> {
    const response = await apiClient.post<ReceiptItem>(`/receipts/${receiptId}/manual-item`, data);
    return response.data;
  },

  /**
   * Deletes an erroneous OCR line item.
   */
  async deleteReceiptItem(itemId: string): Promise<{ success: boolean; deleted: boolean; message: string }> {
    const response = await apiClient.delete<{ success: boolean; deleted: boolean; message: string }>(
      `/receipts/items/${itemId}`
    );
    return response.data;
  },

  /**
   * Returns authenticated streaming URL for receipt image.
   */
  getImageUrl(receiptId: string): string {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';
    return `${baseUrl}/receipts/${receiptId}/image`;
  },
};
