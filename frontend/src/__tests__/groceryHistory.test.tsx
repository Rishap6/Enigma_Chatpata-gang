import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';

import {
  HistoricalSummaryCards,
  HistoricalCoverageCard,
  RecurringProductsTable,
  RecurringIngredientsPanel,
  MemberHistoryImpact,
  RecurringFindingsPanel,
  PeriodComparisonCard,
  MonthlyFamilyReport,
  PurchaseHistoryTimeline,
  DateRangeSelector,
} from '../components/history';

import {
  HistoricalSummaryResponse,
  HistoricalCoverageResponse,
  RecurringProductItem,
  RecurringIngredientItem,
  MemberHistoryResponse,
  RecurringPatternItem,
  PeriodComparisonResponse,
  MonthlyFamilyReportResponse,
  TimelineEvent,
} from '../types/history';

// ------------------------------------------------------------------
// Mock Data
// ------------------------------------------------------------------

const mockSummary: HistoricalSummaryResponse = {
  family_id: 'fam-123',
  period_type: 'all',
  total_receipts: 4,
  total_purchased_products: 16,
  total_unique_products: 6,
  recurring_products_count: 3,
  total_spend: 1250.0,
  currency: 'INR',
  high_attention_count: 5,
  potential_conflict_count: 7,
  verification_required_count: 4,
  no_configured_conflict_count: 10,
  insufficient_info_count: 1,
  coverage_percentage: 93.8,
  unresolved_products_count: 1,
  disclaimer: 'A receipt record indicates grocery products purchased, not food ingested or consumed.',
};

const mockCoverage: HistoricalCoverageResponse = {
  family_id: 'fam-123',
  total_receipts_uploaded: 4,
  receipts_successfully_processed: 4,
  total_line_items: 16,
  matched_products: 15,
  ambiguous_products: 0,
  unresolved_products: 1,
  products_with_ingredients: 5,
  products_missing_ingredients: 0,
  risk_analyses_available: 4,
  coverage_percentage: 93.8,
  data_quality_grade: 'High Coverage',
  warning_message: 'Some purchased items remain unanalyzed.',
};

const mockProducts: RecurringProductItem[] = [
  {
    product_id: 'prod-1',
    product_name: 'Demo Protein Bar',
    brand_name: 'Demo Nutrition',
    purchase_count: 4,
    total_quantity: 5.0,
    total_spend: 600.0,
    average_price: 120.0,
    price_change: 5.0,
    number_of_receipts: 4,
    high_attention_events: 4,
    potential_conflict_events: 0,
    verification_required_events: 4,
    no_configured_conflict_events: 0,
    affected_members: [
      {
        member_id: 'mem-1',
        member_name: 'Father',
        conflict_types: ['direct_allergen'],
        status_counts: { high_attention: 4 },
        sample_finding_id: 'finding-peanut-1',
      },
      {
        member_id: 'mem-3',
        member_name: 'Child',
        conflict_types: ['derived_allergen'],
        status_counts: { potential_conflict: 4 },
        sample_finding_id: 'finding-dairy-1',
      },
    ],
    recurring_conflict_types: ['direct_allergen', 'derived_allergen'],
    sample_finding_id: 'finding-peanut-1',
  },
];

const mockDirectIngredients: RecurringIngredientItem[] = [
  {
    ingredient_id: 'ing-1',
    ingredient_name: 'Maida',
    is_derived: false,
    number_of_products_containing: 3,
    purchase_events_count: 7,
    affected_members: ['Mother'],
    relevant_conflict_types: ['dietary_conflict'],
    source_uncertainty: false,
    source_uncertainty_count: 0,
  },
  {
    ingredient_id: 'ing-2',
    ingredient_name: 'INS 471',
    is_derived: false,
    number_of_products_containing: 2,
    purchase_events_count: 4,
    affected_members: ['Father', 'Mother'],
    relevant_conflict_types: ['source_uncertainty'],
    source_uncertainty: true,
    source_uncertainty_count: 4,
  },
];

const mockDerivedIngredients: RecurringIngredientItem[] = [
  {
    ingredient_id: 'ing-3',
    ingredient_name: 'Gluten',
    is_derived: true,
    derivation_path: 'Maida → Wheat → Gluten',
    number_of_products_containing: 3,
    purchase_events_count: 7,
    affected_members: ['Mother'],
    relevant_conflict_types: ['dietary_conflict'],
    confidence: 0.98,
    source_uncertainty: false,
    source_uncertainty_count: 0,
  },
];

const mockMemberHistory: MemberHistoryResponse = {
  family_id: 'fam-123',
  disclaimer: 'Member purchase trend findings reflect purchased grocery records matching configured profile criteria.',
  members: [
    {
      member_id: 'mem-1',
      member_name: 'Father',
      relationship: 'Parent',
      total_purchases_analyzed: 4,
      products_requiring_attention: 4,
      potential_conflicts: 0,
      verification_required_products: 4,
      recurring_allergens: [
        {
          requirement_name: 'Peanut',
          requirement_type: 'allergen',
          occurrences: 4,
          associated_products: ['Demo Protein Bar'],
          sample_finding_id: 'finding-peanut-1',
        },
      ],
      recurring_dietary_conflicts: [],
      recurring_ingredient_exclusions: [],
      recurring_source_uncertainty: [
        {
          requirement_name: 'INS 471',
          requirement_type: 'source_uncertainty',
          occurrences: 4,
          associated_products: ['Demo Protein Bar'],
        },
      ],
      recurring_nutrition_preferences: [],
    },
  ],
};

const mockPatterns: RecurringPatternItem[] = [
  {
    pattern_type: 'recurring_product_conflict',
    title: "Recurring Conflict on 'Demo Protein Bar'",
    description: "'Demo Protein Bar' was purchased across 4 receipts and generated configured requirements.",
    supporting_purchase_count: 4,
    supporting_product_count: 1,
    affected_members: ['Father', 'Child'],
    supporting_receipt_ids: ['rcpt-1', 'rcpt-2', 'rcpt-3', 'rcpt-4'],
    supporting_product_names: ['Demo Protein Bar'],
    confidence: 0.98,
    evidence_references: [],
    sample_finding_id: 'finding-peanut-1',
    actionable_review: 'Review whether Demo Protein Bar is suitable for the entire household.',
  },
];

const mockComparison: PeriodComparisonResponse = {
  family_id: 'fam-123',
  current_period_name: 'September 2026',
  previous_period_name: 'August 2026',
  current_metrics: {
    total_receipts: 3,
    total_purchased_products: 12,
    total_spend: 950.0,
    high_attention_count: 3,
    potential_conflict_count: 5,
    verification_required_count: 4,
    matched_products: 11,
  },
  previous_metrics: {
    total_receipts: 1,
    total_purchased_products: 4,
    total_spend: 300.0,
    high_attention_count: 1,
    potential_conflict_count: 2,
    verification_required_count: 1,
    matched_products: 4,
  },
  changes: [
    'Analyzed receipts increased from 1 to 3.',
    'Products requiring verification increased from 1 to 4.',
  ],
  summary: 'Comparison between September 2026 and August 2026 indicates 3 receipts analyzed in the current period.',
};

const mockReport: MonthlyFamilyReportResponse = {
  family_id: 'fam-123',
  month_name: 'September 2026',
  generated_at: '2026-09-26T12:00:00Z',
  receipts_analyzed: 4,
  purchased_products: 16,
  products_successfully_matched: 15,
  products_requiring_review: 1,
  high_attention_count: 5,
  potential_conflict_count: 7,
  verification_required_count: 4,
  top_recurring_patterns: ["Recurring Conflict on 'Demo Protein Bar'"],
  most_recurring_products: [
    {
      product_name: 'Demo Protein Bar',
      purchase_count: 4,
      total_spend: 600.0,
      attention_events: 4,
    },
  ],
  disclaimer: 'This monthly grocery report is based strictly on scanned grocery receipts and catalog matching.',
};

const mockTimeline: TimelineEvent[] = [
  {
    receipt_id: 'rcpt-1',
    risk_analysis_id: 'ra-1',
    purchase_date: '2026-09-20T10:00:00Z',
    merchant_name: 'Supermarket',
    total_products: 4,
    matched_products: 4,
    unresolved_products: 0,
    high_attention_count: 1,
    potential_conflict_count: 2,
    verification_required_count: 1,
    no_configured_conflict_count: 1,
    total_amount: 320.0,
    currency: 'INR',
  },
];

// ------------------------------------------------------------------
// Test Suites
// ------------------------------------------------------------------

describe('Phase 8: Historical Grocery Intelligence & Trend Engine', () => {
  describe('HistoricalSummaryCards', () => {
    it('renders key aggregate purchase metrics and non-consumption disclaimer', () => {
      render(<HistoricalSummaryCards summary={mockSummary} />);

      expect(screen.getAllByText('4').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Receipts Analyzed')).toBeInTheDocument();
      expect(screen.getByText(/Purchased \(INR 1,250\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Safety & Decision-Support Notice:/i)).toBeInTheDocument();
      expect(screen.getByText(/not individual food consumed or clinical exposure/i)).toBeInTheDocument();
    });
  });

  describe('HistoricalCoverageCard', () => {
    it('displays catalog match percentage, counts, and unresolved warning', () => {
      render(<HistoricalCoverageCard coverage={mockCoverage} />);

      expect(screen.getByText('93.8%')).toBeInTheDocument();
      expect(screen.getByText('High Coverage')).toBeInTheDocument();
      expect(screen.getByText('15')).toBeInTheDocument();
      expect(screen.getByText('Matched Products')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('Unresolved Items')).toBeInTheDocument();
      expect(screen.getByText(/Missing products are not treated as safe/i)).toBeInTheDocument();
    });
  });

  describe('RecurringProductsTable', () => {
    it('renders recurring product row, purchase count, and affected members', () => {
      const handleOpenExplain = vi.fn();
      render(
        <RecurringProductsTable
          products={mockProducts}
          onOpenFindingExplanation={handleOpenExplain}
        />
      );

      expect(screen.getByText('Demo Protein Bar')).toBeInTheDocument();
      expect(screen.getByText('Demo Nutrition')).toBeInTheDocument();
      expect(screen.getByText('4x')).toBeInTheDocument();
      expect(screen.getByText('Father')).toBeInTheDocument();
      expect(screen.getByText('Child')).toBeInTheDocument();

      // Click "Why Flagged?" explainability trigger
      const whyBtn = screen.getByRole('button', { name: /Why Flagged\?/i });
      fireEvent.click(whyBtn);
      expect(handleOpenExplain).toHaveBeenCalledWith('finding-peanut-1');
    });

    it('renders empty state when no recurring products exist', () => {
      render(<RecurringProductsTable products={[]} onOpenFindingExplanation={vi.fn()} />);
      expect(screen.getByText(/No recurring products found in this period/i)).toBeInTheDocument();
    });
  });

  describe('RecurringIngredientsPanel', () => {
    it('switches between directly observed and knowledge traced tabs', () => {
      render(
        <RecurringIngredientsPanel
          directlyObserved={mockDirectIngredients}
          relationshipDerived={mockDerivedIngredients}
        />
      );

      // Directly observed is default
      expect(screen.getByText('Maida')).toBeInTheDocument();
      expect(screen.getByText('INS 471')).toBeInTheDocument();
      expect(screen.getByText('Uncertain Origin')).toBeInTheDocument();

      // Switch to Knowledge Traced tab
      const derivedTabBtn = screen.getByRole('button', { name: /Knowledge Traced/i });
      fireEvent.click(derivedTabBtn);

      expect(screen.getByText('Gluten')).toBeInTheDocument();
      expect(screen.getByText('Maida → Wheat → Gluten')).toBeInTheDocument();
    });
  });

  describe('MemberHistoryImpact', () => {
    it('renders member cards with personalized requirement occurrences and sample finding triggers', () => {
      const handleOpenExplain = vi.fn();
      render(
        <MemberHistoryImpact
          memberData={mockMemberHistory}
          onOpenFindingExplanation={handleOpenExplain}
        />
      );

      expect(screen.getByText('Father')).toBeInTheDocument();
      expect(screen.getByText('Parent')).toBeInTheDocument();
      expect(screen.getByText('Peanut')).toBeInTheDocument();

      // Click allergen badge to drill down
      const allergenBadge = screen.getByRole('button', { name: /Peanut/i });
      fireEvent.click(allergenBadge);
      expect(handleOpenExplain).toHaveBeenCalledWith('finding-peanut-1');
    });
  });

  describe('RecurringFindingsPanel', () => {
    it('renders recurring pattern title, description, and actionable guidance', () => {
      const handleOpenExplain = vi.fn();
      render(
        <RecurringFindingsPanel
          patterns={mockPatterns}
          onOpenFindingExplanation={handleOpenExplain}
        />
      );

      expect(screen.getByText("Recurring Conflict on 'Demo Protein Bar'")).toBeInTheDocument();
      expect(screen.getByText(/Review whether Demo Protein Bar is suitable/i)).toBeInTheDocument();

      const traceBtn = screen.getByRole('button', { name: /Trace/i });
      fireEvent.click(traceBtn);
      expect(handleOpenExplain).toHaveBeenCalledWith('finding-peanut-1');
    });
  });

  describe('PeriodComparisonCard', () => {
    it('renders period metrics and factual change bullet points', () => {
      const handlePeriodChange = vi.fn();
      render(
        <PeriodComparisonCard
          comparison={mockComparison}
          selectedPeriod="current_month"
          onPeriodChange={handlePeriodChange}
        />
      );

      expect(screen.getByText(/September 2026/i)).toBeInTheDocument();
      expect(screen.getByText(/August 2026/i)).toBeInTheDocument();
      expect(screen.getByText('Analyzed receipts increased from 1 to 3.')).toBeInTheDocument();

      // Click 30 Days period
      const thirtyDayBtn = screen.getByRole('button', { name: /30 Days/i });
      fireEvent.click(thirtyDayBtn);
      expect(handlePeriodChange).toHaveBeenCalledWith('30d');
    });
  });

  describe('MonthlyFamilyReport', () => {
    it('renders complete monthly grocery report card and safety notice', () => {
      render(<MonthlyFamilyReport report={mockReport} />);

      expect(screen.getByText('Family Grocery Report')).toBeInTheDocument();
      expect(screen.getByText('September 2026')).toBeInTheDocument();
      expect(screen.getByText('16')).toBeInTheDocument(); // purchased
      expect(screen.getByText('15')).toBeInTheDocument(); // matched
      expect(screen.getByText(/This monthly grocery report is based strictly/i)).toBeInTheDocument();
    });
  });

  describe('PurchaseHistoryTimeline', () => {
    it('renders timeline receipt cards and links to risk review', () => {
      render(
        <BrowserRouter>
          <PurchaseHistoryTimeline timeline={mockTimeline} />
        </BrowserRouter>
      );

      expect(screen.getByText(/2026/i)).toBeInTheDocument();
      expect(screen.getByText('1 High Attention')).toBeInTheDocument();
      expect(screen.getByText('2 Conflicts')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /View Risk/i })).toHaveAttribute(
        'href',
        '/risk/receipts/rcpt-1'
      );
    });
  });

  describe('DateRangeSelector', () => {
    it('triggers period callback when preset button is clicked', () => {
      const handleSelect = vi.fn();
      render(<DateRangeSelector selectedPeriod="all" onSelectPeriod={handleSelect} />);

      const monthBtn = screen.getByRole('button', { name: /Current Month/i });
      fireEvent.click(monthBtn);
      expect(handleSelect).toHaveBeenCalledWith('current_month');
    });
  });
});
