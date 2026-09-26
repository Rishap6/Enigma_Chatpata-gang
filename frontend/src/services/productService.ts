import { apiClient } from './api';
import {
  ProductListResponse,
  ProductDetail,
  ProductMatchRequest,
  ProductMatchResponse,
  ProductAnalysis,
  ProductIngredient,
  ProductDataSource,
  Brand,
  ProductCategory,
} from '../types';

export const productService = {
  /**
   * Search and filter products with pagination
   */
  async getProducts(params?: {
    page?: number;
    page_size?: number;
    search?: string;
    brand?: string;
    category?: string;
  }): Promise<ProductListResponse> {
    const response = await apiClient.get<ProductListResponse>('/products', {
      params,
    });
    return response.data;
  },

  /**
   * Match product by label name / OCR text, brand hint, or barcode
   */
  async matchProduct(request: ProductMatchRequest): Promise<ProductMatchResponse> {
    const response = await apiClient.post<ProductMatchResponse>('/products/match', request);
    return response.data;
  },

  /**
   * Get single product details by ID
   */
  async getProduct(productId: string): Promise<ProductDetail> {
    const response = await apiClient.get<ProductDetail>(`/products/${productId}`);
    return response.data;
  },

  /**
   * Generate unified product intelligence profile (Phase 6 contract)
   */
  async getProductAnalysis(productId: string): Promise<ProductAnalysis> {
    const response = await apiClient.get<ProductAnalysis>(`/products/${productId}/analysis`);
    return response.data;
  },

  /**
   * Lookup product by standardized identifier (GTIN, EAN13, etc.) - Phase 4 integration point
   */
  async lookupProductByIdentifier(
    identifierType: string,
    identifierValue: string
  ): Promise<ProductDetail> {
    const response = await apiClient.get<ProductDetail>(
      `/products/identifier/${encodeURIComponent(identifierType)}/${encodeURIComponent(identifierValue)}`
    );
    return response.data;
  },

  /**
   * Get ordered product ingredients
   */
  async getProductIngredients(productId: string): Promise<ProductIngredient[]> {
    const response = await apiClient.get<ProductIngredient[]>(`/products/${productId}/ingredients`);
    return response.data;
  },

  /**
   * Get product data sources / provenance metadata
   */
  async getProductSources(productId: string): Promise<ProductDataSource[]> {
    const response = await apiClient.get<ProductDataSource[]>(`/products/${productId}/sources`);
    return response.data;
  },

  /**
   * List all brands for filtering
   */
  async getBrands(): Promise<Brand[]> {
    const response = await apiClient.get<Brand[]>('/products/meta/brands');
    return response.data;
  },

  /**
   * List all product categories for filtering
   */
  async getCategories(): Promise<ProductCategory[]> {
    const response = await apiClient.get<ProductCategory[]>('/products/meta/categories');
    return response.data;
  },

  /**
   * Get safe alternatives and allergen substitutions for a product (e.g. Lactose-Free, Peanut-Free)
   */
  async getProductAlternatives(productId: string) {
    const response = await apiClient.get(`/products/${productId}/alternatives`);
    return response.data;
  },
};
