import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ProductExplorerPage } from '../pages/ProductExplorerPage';
import { ProductDetailPage } from '../pages/ProductDetailPage';
import { ProductCard } from '../components/ProductCard';
import { ProductQualityPanel } from '../components/ProductQualityPanel';
import { ProductMatchPanel } from '../components/ProductMatchPanel';
import { ProductIngredientRow } from '../components/ProductIngredientRow';
import { ProductIdentifierCard } from '../components/ProductIdentifierCard';
import { ProductSourceCard } from '../components/ProductSourceCard';
import { ProductAllergenStatement } from '../components/ProductAllergenStatement';
import { productService } from '../services/productService';
import {
  ProductSummary,
  ProductDetail,
  ProductAnalysis,
  AnalyzedProductIngredient,
  ProductQualitySummary,
} from '../types';

vi.mock('../services/productService', () => ({
  productService: {
    getProducts: vi.fn(),
    getProduct: vi.fn(),
    getProductAnalysis: vi.fn(),
    matchProduct: vi.fn(),
    lookupProductByIdentifier: vi.fn(),
    getProductIngredients: vi.fn(),
    getProductSources: vi.fn(),
    getBrands: vi.fn(),
    getCategories: vi.fn(),
  },
}));

const mockProductSummary: ProductSummary = {
  id: 'prod-123',
  name: 'Demo Protein Bar',
  normalized_name: 'demo protein bar',
  brand_id: 'brand-1',
  brand_name: 'Demo Nutrition',
  category_id: 'cat-1',
  category_name: 'Protein Bars',
  barcode: '8901234560010',
  gtin: '08901234560010',
  pack_size: '60',
  unit: 'g',
  country: 'India',
  image_url: null,
  confidence: 0.98,
  is_active: true,
  ingredient_count: 4,
  requires_verification: true,
};

const mockQualitySummary: ProductQualitySummary = {
  identification_confidence: 'High',
  ingredient_coverage_pct: 100.0,
  total_ingredients: 4,
  recognized_ingredients: 4,
  unresolved_ingredients: 0,
  has_allergen_statement: true,
  has_cross_contact_statement: true,
  primary_source: 'curated_dataset',
  overall_status: 'verification_required',
};

const mockIngredient: AnalyzedProductIngredient = {
  raw_name: 'Sodium Caseinate',
  normalized_name: 'Sodium Caseinate',
  ingredient_id: 'ing-1',
  sequence: 1,
  match_method: 'exact',
  confidence: 0.99,
  categories: ['Dairy', 'Milk-derived'],
  allergens: [
    {
      name: 'Milk',
      relationship: 'derived_from',
      confidence: 0.99,
      is_derived: true,
    },
  ],
  relationships: [],
  relationship_chains: [
    {
      path: ['Sodium Caseinate', 'Casein', 'Milk'],
      relationship_types: ['derived_from', 'derived_from'],
    },
  ],
  sources: [{ type: 'milk', status: 'known', confidence: 1.0 }],
  dietary_properties: [],
  dietary_summary: { status: 'known', vegetarian_compatible: 'compatible' },
  requires_verification: false,
};

const mockProductDetail: ProductDetail = {
  id: 'prod-123',
  name: 'Demo Protein Bar',
  normalized_name: 'demo protein bar',
  description: 'High protein nutrition bar.',
  brand_id: 'brand-1',
  brand: {
    id: 'brand-1',
    name: 'Demo Nutrition',
    normalized_name: 'demo nutrition',
    created_at: '2026-01-01',
  },
  category_id: 'cat-1',
  category: { id: 'cat-1', name: 'Protein Bars' },
  barcode: '8901234560010',
  gtin: '08901234560010',
  pack_size: '60',
  unit: 'g',
  serving_size: '60g',
  country: 'India',
  image_url: null,
  ingredients_raw: 'Whey Protein, Soy Lecithin, Cocoa, INS 471',
  allergen_statement_raw: 'Contains milk and soy.',
  cross_contact_statement_raw: 'May contain peanuts.',
  source_name: 'Demo Nutrition Official Specification',
  source_type: 'curated_dataset',
  confidence: 0.98,
  is_active: true,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
  identifiers: [
    {
      id: 'id-1',
      product_id: 'prod-123',
      identifier_type: 'GTIN',
      identifier_value: '08901234560010',
      country: 'India',
      is_primary: true,
      created_at: '2026-01-01',
    },
  ],
  ingredients: [
    {
      id: 'pi-1',
      product_id: 'prod-123',
      raw_name: 'Whey Protein',
      normalized_name: 'Whey',
      sequence: 1,
      match_method: 'alias',
      match_confidence: 0.98,
      requires_verification: false,
      created_at: '2026-01-01',
    },
  ],
  allergen_statements: [
    {
      id: 'as-1',
      product_id: 'prod-123',
      statement_type: 'contains',
      statement_text: 'Contains milk and soy.',
      confidence: 1.0,
      created_at: '2026-01-01',
    },
    {
      id: 'as-2',
      product_id: 'prod-123',
      statement_type: 'may_contain',
      statement_text: 'May contain traces of peanuts.',
      confidence: 1.0,
      created_at: '2026-01-01',
    },
  ],
  data_sources: [
    {
      id: 'ds-1',
      product_id: 'prod-123',
      source_name: 'Demo Nutrition Official Specification',
      source_type: 'curated_dataset',
      reference: 'Seed Dataset v1',
      confidence: 0.98,
      created_at: '2026-01-01',
    },
  ],
};

const mockAnalysis: ProductAnalysis = {
  product: {
    id: 'prod-123',
    name: 'Demo Protein Bar',
    normalized_name: 'demo protein bar',
    brand: 'Demo Nutrition',
    category: 'Protein Bars',
    gtin: '08901234560010',
    pack_size: '60 g',
    country: 'India',
  },
  identification: {
    confidence: 0.98,
    source_name: 'Demo Nutrition Official Specification',
  },
  ingredients: [mockIngredient],
  allergen_statements: mockProductDetail.allergen_statements,
  unresolved_ingredients: [],
  aggregated_allergens: ['Milk'],
  aggregated_categories: ['Dairy', 'Milk-derived'],
  dietary_summary: {
    animal_derived: 'milk',
    vegetarian_compatible: 'compatible',
  },
  product_confidence: 0.96,
  requires_verification: false,
  quality_summary: mockQualitySummary,
  notes: '4 ingredients analyzed',
};

import { MemoryRouter, Routes, Route } from 'react-router-dom';

const renderWithProviders = (ui: React.ReactElement, initialRoute = '/') => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/products/:productId" element={ui} />
          <Route path="*" element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('Phase 3 Product Intelligence Frontend Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(productService.getBrands).mockResolvedValue([
      { id: 'b1', name: 'Britannia', normalized_name: 'britannia', created_at: '' },
      { id: 'b2', name: 'Lay\'s', normalized_name: 'lays', created_at: '' },
    ]);
    vi.mocked(productService.getCategories).mockResolvedValue([
      { id: 'c1', name: 'Biscuits' },
      { id: 'c2', name: 'Chips' },
    ]);
  });

  it('1. Product Explorer renders title, search input, and filter controls', async () => {
    vi.mocked(productService.getProducts).mockResolvedValue({
      items: [mockProductSummary],
      total: 1,
      page: 1,
      page_size: 12,
      pages: 1,
    });

    renderWithProviders(<ProductExplorerPage />);

    expect(screen.getByText(/Product Intelligence Explorer/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/Search products by name or barcode/i)).toBeDefined();
    expect(screen.getByText(/Test Product Match \/ OCR/i)).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('Demo Protein Bar')).toBeDefined();
    });
  });

  it('2. ProductCard displays brand, category, barcode, ingredients count, and verification chip', () => {
    renderWithProviders(<ProductCard product={mockProductSummary} />);

    expect(screen.getByText('Demo Protein Bar')).toBeDefined();
    expect(screen.getByText('Demo Nutrition')).toBeDefined();
    expect(screen.getByText('Protein Bars')).toBeDefined();
    expect(screen.getByText('08901234560010')).toBeDefined();
    expect(screen.getByText('4 ingredients')).toBeDefined();
    expect(screen.getByText('98% conf')).toBeDefined();
    expect(screen.getByText('Verify')).toBeDefined();
  });

  it('3. ProductQualityPanel renders coverage, identification, and overall status', () => {
    renderWithProviders(
      <ProductQualityPanel quality={mockQualitySummary} productConfidence={0.96} />
    );

    expect(screen.getByText(/Product Data Quality/i)).toBeDefined();
    expect(screen.getByText('96%')).toBeDefined();
    expect(screen.getByText('High')).toBeDefined();
    expect(screen.getByText('100%')).toBeDefined();
    expect(screen.getByText('4/4')).toBeDefined();
    expect(screen.getByText(/Verification Required/i)).toBeDefined();
  });

  it('4. ProductIngredientRow displays raw name, normalized name, category, and expands derivation chain', async () => {
    renderWithProviders(<ProductIngredientRow ingredient={mockIngredient} />);

    expect(screen.getByText('Sodium Caseinate')).toBeDefined();
    expect(screen.getByText('Dairy')).toBeDefined();
    expect(screen.getByText('Milk')).toBeDefined();

    // Click derivation expansion button
    const derivationBtn = screen.getByRole('button', { name: /Derivation/i });
    fireEvent.click(derivationBtn);

    // Verify derivation chain is visible
    expect(screen.getByText(/Phase 2 Knowledge Derivation Path/i)).toBeDefined();
    expect(screen.getByText('Casein')).toBeDefined();
  });

  it('5. ProductIdentifierCard preserves leading zeros in GTIN string format', () => {
    renderWithProviders(
      <ProductIdentifierCard identifiers={mockProductDetail.identifiers} />
    );

    expect(screen.getByText('GTIN')).toBeDefined();
    const gtinEl = screen.getByText('08901234560010');
    expect(gtinEl).toBeDefined();
    expect(gtinEl.textContent).toBe('08901234560010');
    expect(screen.getByText('Primary')).toBeDefined();
  });

  it('6. ProductSourceCard renders provenance metadata and confidence', () => {
    renderWithProviders(<ProductSourceCard sources={mockProductDetail.data_sources} />);

    expect(screen.getByText('Demo Nutrition Official Specification')).toBeDefined();
    expect(screen.getByText('curated dataset')).toBeDefined();
    expect(screen.getByText(/98% confidence/i)).toBeDefined();
  });

  it('7. ProductAllergenStatement renders contains and may contain statements', () => {
    renderWithProviders(
      <ProductAllergenStatement
        statements={mockProductDetail.allergen_statements}
        rawCrossContact={mockProductDetail.cross_contact_statement_raw}
      />
    );

    expect(screen.getByText('Contains milk and soy.')).toBeDefined();
    expect(screen.getByText('May contain traces of peanuts.')).toBeDefined();
  });

  it('8. ProductMatchPanel tests OCR matching simulation and triggers matchMutation', async () => {
    vi.mocked(productService.matchProduct).mockResolvedValue({
      matched: true,
      product: mockProductDetail,
      confidence: 0.94,
      match_method: 'brand_name_fuzzy',
      requires_selection: false,
      candidates: [],
    });

    renderWithProviders(<ProductMatchPanel />);

    const nameInput = screen.getByPlaceholderText(/e.g. BRIT NUTR CHC 40G/i);
    const brandInput = screen.getByPlaceholderText(/e.g. Britannia/i);
    const matchBtn = screen.getByRole('button', { name: /Match/i });

    fireEvent.change(nameInput, { target: { value: 'BRIT NUTR CHC 40G' } });
    fireEvent.change(brandInput, { target: { value: 'Britannia' } });
    fireEvent.click(matchBtn);

    await waitFor(() => {
      expect(screen.getByText(/Confident Match Found/i)).toBeDefined();
      expect(screen.getByText('94% Match')).toBeDefined();
    });
  });

  it('9. ProductMatchPanel displays candidate selection list for ambiguous matches', async () => {
    vi.mocked(productService.matchProduct).mockResolvedValue({
      matched: false,
      product: null,
      confidence: 0.72,
      match_method: 'low_confidence',
      requires_selection: true,
      candidates: [
        {
          product: mockProductSummary,
          confidence: 0.72,
          match_method: 'fuzzy_name',
        },
      ],
    });

    renderWithProviders(<ProductMatchPanel />);

    const nameInput = screen.getByPlaceholderText(/e.g. BRIT NUTR CHC 40G/i);
    const matchBtn = screen.getByRole('button', { name: /Match/i });

    fireEvent.change(nameInput, { target: { value: 'Chocolate' } });
    fireEvent.click(matchBtn);

    await waitFor(() => {
      expect(screen.getByText(/Ambiguous Match — User Selection Required/i)).toBeDefined();
      expect(screen.getByText('1 candidates found')).toBeDefined();
      expect(screen.getByText('Select')).toBeDefined();
    });
  });

  it('10. ProductDetailPage loads and renders product specifications and Phase 6 contract button', async () => {
    vi.mocked(productService.getProduct).mockResolvedValue(mockProductDetail);
    vi.mocked(productService.getProductAnalysis).mockResolvedValue(mockAnalysis);

    renderWithProviders(<ProductDetailPage />, '/products/prod-123');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Demo Protein Bar', level: 1 })).toBeDefined();
      expect(screen.getByRole('button', { name: /Inspect Phase 6 Contract/i })).toBeDefined();
      expect(screen.getAllByText('96%').length).toBeGreaterThan(0);
    });

    // Toggle Phase 6 JSON inspector
    const jsonBtn = screen.getByRole('button', { name: /Inspect Phase 6 Contract/i });
    fireEvent.click(jsonBtn);

    expect(screen.getByText(/Phase 6 Family Risk Engine Contract Payload/i)).toBeDefined();
  });

  it('11. ProductExplorerPage shows EmptyState when no products match', async () => {
    vi.mocked(productService.getProducts).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      page_size: 12,
      pages: 1,
    });

    renderWithProviders(<ProductExplorerPage />);

    await waitFor(() => {
      expect(screen.getByText(/No Products Found/i)).toBeDefined();
    });
  });
});
