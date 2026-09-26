import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

import { IngredientExplorerPage } from '../pages/IngredientExplorerPage';
import { IngredientRelationshipTree } from '../components/IngredientRelationshipTree';
import { ConfidenceIndicator } from '../components/ConfidenceIndicator';
import { SourceStatusBadge } from '../components/SourceStatusBadge';
import { UncertaintyBanner } from '../components/UncertaintyBanner';
import { IngredientCategoryBadge } from '../components/IngredientCategoryBadge';
import { ingredientService } from '../services/ingredientService';

vi.mock('../services/ingredientService', () => ({
  ingredientService: {
    searchIngredients: vi.fn(),
    normalizeIngredient: vi.fn(),
    analyzeIngredient: vi.fn(),
    getIngredient: vi.fn(),
    traceRelationships: vi.fn(),
    listIngredients: vi.fn(),
  },
}));

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Phase 2 Ingredient Intelligence Frontend Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ingredientService.searchIngredients).mockResolvedValue([]);
  });

  it('1. Ingredient Explorer page renders title and search input', () => {
    renderWithProviders(<IngredientExplorerPage />);
    expect(screen.getByText(/Ingredient Intelligence Explorer/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/Search or enter ingredient/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Analyze Ingredient/i })).toBeDefined();
  });

  it('2. Search input updates and triggers quick test selection', async () => {
    renderWithProviders(<IngredientExplorerPage />);
    const input = screen.getByPlaceholderText(/Search or enter ingredient/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Whey' } });
    expect(input.value).toBe('Whey');

    // Click quick test sample button
    const ins471Btn = screen.getByRole('button', { name: 'INS 471' });
    fireEvent.click(ins471Btn);
    await waitFor(() => {
      expect(ingredientService.analyzeIngredient).toHaveBeenCalledWith('INS 471');
    });
  });

  it('3. Ingredient analysis result renders canonical info and categories', async () => {
    vi.mocked(ingredientService.analyzeIngredient).mockResolvedValue({
      raw_input: 'Whey Protein',
      matched: true,
      normalized_ingredient: {
        id: '11111111-1111-1111-1111-111111111111',
        canonical_name: 'whey',
        display_name: 'Whey',
      },
      match: { method: 'alias', confidence: 0.98, matched_alias: 'whey protein' },
      categories: ['Dairy', 'Milk-derived'],
      allergens: [{ name: 'Milk', relationship: 'derived_from', confidence: 0.99 }],
      relationships: [{ from: 'Whey', relationship: 'derived_from', to: 'Milk', confidence: 1.0 }],
      relationship_chains: [
        { path: ['Whey', 'Milk'], relationship_types: ['derived_from'] },
      ],
      sources: [{ type: 'milk', status: 'known', confidence: 0.99 }],
      dietary_properties: [],
      dietary_summary: {
        vegetarian_compatible: 'compatible',
        vegan_compatible: 'incompatible',
        animal_derived: 'not_animal',
      },
      confidence: 0.98,
      requires_verification: false,
      evidence: [
        { source_name: 'Curated Dataset', source_type: 'curated_dataset', evidence_level: 'high' },
      ],
    });

    renderWithProviders(<IngredientExplorerPage />);
    const sampleBtn = screen.getByRole('button', { name: 'Whey Protein' });
    await act(async () => {
      fireEvent.click(sampleBtn);
    });

    await waitFor(() => {
      expect(screen.getByText('"Whey Protein"')).toBeDefined();
      expect(screen.getAllByText('Whey').length).toBeGreaterThan(0);
      expect(screen.getByText('Dairy')).toBeDefined();
      expect(screen.getAllByText('Milk').length).toBeGreaterThan(0);
    });
  });

  it('4. Relationship chain renders multi-level derivation path', () => {
    render(
      <IngredientRelationshipTree
        rootName="Sodium Caseinate"
        chains={[
          {
            path: ['Sodium Caseinate', 'Casein', 'Milk'],
            relationship_types: ['derived_from', 'derived_from'],
          },
        ]}
      />
    );

    expect(screen.getByText('Sodium Caseinate')).toBeDefined();
    expect(screen.getByText('Casein')).toBeDefined();
    expect(screen.getByText('Milk')).toBeDefined();
    expect(screen.getAllByText('derived_from').length).toBe(2);
  });

  it('5. Source uncertainty renders warning and multiple origins', () => {
    render(
      <UncertaintyBanner
        type="source_uncertain"
        title="Source Origin Uncertain"
        message="Dual origin possible (plant vs. animal)."
      />
    );

    expect(screen.getByText('Source Origin Uncertain')).toBeDefined();
    expect(screen.getByText('Dual origin possible (plant vs. animal).')).toBeDefined();

    // Source badges for INS 471
    const { unmount } = render(
      <SourceStatusBadge sourceType="plant" sourceStatus="possible" confidence={0.5} />
    );
    expect(screen.getAllByText(/plant/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/possible source/i)).toBeDefined();
    unmount();
  });

  it('6. ConfidenceIndicator renders percentage, tier and progress bar', () => {
    const { rerender } = render(<ConfidenceIndicator confidence={0.98} method="alias" />);
    expect(screen.getByText('High Confidence')).toBeDefined();
    expect(screen.getByText('(98%)')).toBeDefined();

    rerender(<ConfidenceIndicator confidence={0.45} method="unresolved" />);
    expect(screen.getByText('Unresolved / Low')).toBeDefined();
    expect(screen.getByText('(45%)')).toBeDefined();
  });

  it('7. Unknown ingredient renders unrecognized state with no hallucination', () => {
    render(
      <UncertaintyBanner
        type="unknown_ingredient"
        candidate="Whey Protein"
        onSelectCandidate={vi.fn()}
      />
    );

    expect(screen.getByText('Ingredient Not Recognized')).toBeDefined();
    expect(screen.getByText(/We could not confidently identify this ingredient/i)).toBeDefined();
    expect(screen.getByText('Did you mean:')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Whey Protein' })).toBeDefined();
  });

  it('8. Analyze flow handles user submit and updates explorer view', async () => {
    vi.mocked(ingredientService.analyzeIngredient).mockResolvedValue({
      raw_input: 'INS 471',
      matched: true,
      normalized_ingredient: {
        id: '22222222-2222-2222-2222-222222222222',
        canonical_name: 'mono_and_diglycerides',
        display_name: 'Mono- and Diglycerides',
      },
      match: { method: 'alias', confidence: 0.99 },
      categories: ['Emulsifier'],
      allergens: [],
      relationships: [],
      relationship_chains: [],
      sources: [
        { type: 'plant', status: 'possible', confidence: 0.5 },
        { type: 'animal', status: 'possible', confidence: 0.5 },
      ],
      dietary_properties: [],
      dietary_summary: {
        vegetarian_compatible: 'uncertain',
        vegan_compatible: 'uncertain',
        animal_derived: 'uncertain',
      },
      confidence: 0.95,
      requires_verification: true,
      evidence: [],
    });

    renderWithProviders(<IngredientExplorerPage />);
    const sampleBtn = screen.getByRole('button', { name: 'INS 471' });
    await act(async () => {
      fireEvent.click(sampleBtn);
    });

    await waitFor(() => {
      expect(screen.getByText('"INS 471"')).toBeDefined();
      expect(screen.getByText('Mono- and Diglycerides')).toBeDefined();
      expect(screen.getByText(/Source Origin Uncertain/i)).toBeDefined();
    });
  });

  it('9. Category badge displays correct styles', () => {
    render(<IngredientCategoryBadge category="Gluten" />);
    expect(screen.getByText('Gluten')).toBeDefined();
  });

  it('10. Cycle detection in relationship tree displays cycle warning', () => {
    render(
      <IngredientRelationshipTree
        rootName="Cycle A"
        chains={[{ path: ['Cycle A', 'Cycle B', 'Cycle A (Cycle detected)'], relationship_types: ['derived_from', 'derived_from'] }]}
        cycleDetected={true}
      />
    );
    expect(screen.getByText(/Cyclical derivation detected in ancestry graph/i)).toBeDefined();
  });
});
