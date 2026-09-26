import { apiClient } from './api';

export interface BarcodeScanResult {
  found: boolean;
  barcode: string;
  product_id?: string;
  product_name?: string;
  brand_name?: string;
  category_name?: string;
  ingredients_raw?: string;
  gtin?: string;
  serving_size?: string;
  pack_size?: string;
}

export interface ParsedIngredientItem {
  raw_name: string;
  normalized_name?: string;
  matched: boolean;
  confidence: number;
  match_method?: string;
  allergen_flags: string[];
  dietary_flags: string[];
  source_uncertain: boolean;
  requires_verification: boolean;
}

export interface IngredientScanResult {
  raw_text: string;
  parsed_count: number;
  ingredients: ParsedIngredientItem[];
  allergens_detected: string[];
  dietary_flags: string[];
  verification_required_count: number;
  source_uncertain_count: number;
}

export interface ComparisonItem {
  name: string;
  status: 'matching' | 'additional' | 'missing' | 'uncertain';
  catalog_name?: string;
  ocr_name?: string;
  confidence: number;
}

export interface CompareResult {
  product_id: string;
  product_name: string;
  matching: ComparisonItem[];
  additional: ComparisonItem[];
  missing: ComparisonItem[];
  uncertain: ComparisonItem[];
  match_score: number;
}

export interface CSVSeedResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export const scanService = {
  async scanBarcode(barcode: string): Promise<BarcodeScanResult> {
    const response = await apiClient.post<BarcodeScanResult>('/scan/barcode', { barcode });
    return response.data;
  },

  async scanIngredients(rawText: string, productId?: string): Promise<IngredientScanResult> {
    const response = await apiClient.post<IngredientScanResult>('/scan/ingredients', {
      raw_text: rawText,
      product_id: productId,
    });
    return response.data;
  },

  async compareIngredients(productId: string, ocrIngredients: string[]): Promise<CompareResult> {
    const response = await apiClient.post<CompareResult>('/scan/compare', {
      product_id: productId,
      ocr_ingredients: ocrIngredients,
    });
    return response.data;
  },

  async seedFromCSV(file: File): Promise<CSVSeedResult> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<CSVSeedResult>('/scan/seed-csv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};
