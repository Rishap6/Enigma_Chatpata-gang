import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import { MemoryRouter, Routes, Route } from 'react-router-dom';

import { FamilyRiskDashboardPage } from '../pages/FamilyRiskDashboardPage';
import { MemberRiskDetailPage } from '../pages/MemberRiskDetailPage';
import { RiskStatusBadge } from '../components/risk/RiskStatusBadge';
import { RiskSummaryCards } from '../components/risk/RiskSummaryCards';
import { RiskMatrixGrid } from '../components/risk/RiskMatrixGrid';
import { RiskFindingCard } from '../components/risk/RiskFindingCard';
import { MemberRiskSection } from '../components/risk/MemberRiskSection';
import { RiskExplanationDrawer } from '../components/risk/RiskExplanationDrawer';
import { ProductImpactPanel } from '../components/risk/ProductImpactPanel';

import { riskService } from '../services/riskService';
import { receiptService } from '../services/receiptService';
import { RiskAnalysisResponse, RiskFinding, Receipt } from '../types';

vi.mock('../services/riskService', () => ({
  riskService: {
    analyzeReceiptRisk: vi.fn(),
    getLatestReceiptRisk: vi.fn(),
    getRiskAnalysis: vi.fn(),
    getReceiptMemberRisk: vi.fn(),
    getReceiptProductRisk: vi.fn(),
    getReceiptMatrix: vi.fn(),
  },
}));

vi.mock('../services/receiptService', () => ({
  receiptService: {
    getReceipt: vi.fn(),
  },
}));

const mockReceipt: Receipt = {
  id: 'rcpt-123',
  owner_user_id: 'user-1',
  family_id: 'fam-1',
  original_filename: 'September Grocery Run.jpg',
  storage_path: '/storage/rcpt-123.jpg',
  processing_status: 'processed',
  ocr_confidence: 0.98,

  subtotal: 350.0,
  tax: 17.5,
  total_amount: 367.5,
  currency: 'INR',
  items: [],
  events: [],
  created_at: '2026-09-26T10:00:00Z',
  updated_at: '2026-09-26T10:00:00Z',
};


const mockFindingHigh: RiskFinding = {
  id: 'f-1',
  risk_analysis_id: 'analysis-123',
  member_id: 'mem-father',
  member_name: 'Father',
  product_id: 'prod-pb',
  product_name: 'Demo Roasted Peanuts',
  status: 'high_attention',
  risk_type: 'direct_allergen',
  severity: 'high',
  title: 'Direct allergen detected: Peanut',
  summary: 'Peanut explicitly present in ingredients.',
  trigger_text: 'Roasted Peanuts',
  matched_rule: 'Father: Peanut allergy (Severe)',
  reason: 'Peanut is explicitly present in the product ingredient information.',
  confidence: 0.99,
  attention_score: 95.0,
  requires_verification: false,
  cross_contact: false,
  source_uncertainty: false,
  ingredient_path: [
    { step_number: 1, ingredient_name: 'Peanut', relationship_type: 'direct_ingredient' },
  ],
  evidence: [
    { evidence_type: 'label', description: 'Product label contains peanuts.', confidence: 0.99 },
  ],
  explainability: {
    title: 'Direct allergen detected: Peanut',
    summary: 'Peanut explicitly present in ingredients.',
    trigger: 'Roasted Peanuts',
    chain: ['Peanut'],
    rule: 'Father: Peanut allergy (Severe)',
    risk_type: 'direct_allergen',
    status: 'high_attention',
    severity: 'high',
    confidence: 0.99,
    attention_score: 95.0,
    requires_verification: false,
    cross_contact: false,
    source_uncertainty: false,
    reason: 'Peanut is explicitly present in the product ingredient information.',
    evidence: [],
  },
};

const mockFindingDerived: RiskFinding = {
  id: 'f-2',
  risk_analysis_id: 'analysis-123',
  member_id: 'mem-child',
  member_name: 'Child',
  product_id: 'prod-bar',
  product_name: 'Demo Protein Bar',
  status: 'high_attention',
  risk_type: 'derived_allergen',
  severity: 'high',
  title: 'Milk-derived ingredient detected',
  summary: 'Whey Protein is linked to dairy restriction.',
  trigger_text: 'Whey Protein',
  matched_rule: 'Child: Lactose intolerance',
  reason: 'Whey Protein is linked through ingredient knowledge to milk-derived source.',
  confidence: 0.97,
  attention_score: 80.0,
  requires_verification: false,
  cross_contact: false,
  source_uncertainty: false,
  ingredient_path: [
    { step_number: 1, ingredient_name: 'Whey Protein', relationship_type: 'product_ingredient' },
    { step_number: 2, ingredient_name: 'Whey', relationship_type: 'derived_from' },
    { step_number: 3, ingredient_name: 'Milk', relationship_type: 'parent_source' },
  ],
  evidence: [],
  explainability: {
    title: 'Milk-derived ingredient detected',
    summary: 'Whey Protein is linked to dairy restriction.',
    trigger: 'Whey Protein',
    chain: ['Whey Protein', 'Whey', 'Milk'],
    rule: 'Child: Lactose intolerance',
    risk_type: 'derived_allergen',
    status: 'high_attention',
    severity: 'high',
    confidence: 0.97,
    attention_score: 80.0,
    requires_verification: false,
    cross_contact: false,
    source_uncertainty: false,
    evidence: [],
  },
};

const mockFindingCrossContact: RiskFinding = {
  id: 'f-3',
  risk_analysis_id: 'analysis-123',
  member_id: 'mem-father',
  member_name: 'Father',
  product_id: 'prod-bar',
  product_name: 'Demo Protein Bar',
  status: 'potential_conflict',
  risk_type: 'cross_contact',
  severity: 'medium',
  title: 'Cross-contact warning: Peanut',
  summary: 'Product packaging indicates potential cross-contact with Peanut.',
  trigger_text: 'May contain traces of peanuts.',
  matched_rule: 'Father: Peanut allergy',
  reason: 'Product packaging carries a precautionary statement: "May contain traces of peanuts."',
  confidence: 0.95,
  attention_score: 50.0,
  requires_verification: false,
  cross_contact: true,
  source_uncertainty: false,
  ingredient_path: [],
  evidence: [],
};

const mockFindingUncertain: RiskFinding = {
  id: 'f-4',
  risk_analysis_id: 'analysis-123',
  member_id: 'mem-grandma',
  member_name: 'Grandmother',
  product_id: 'prod-bar',
  product_name: 'Demo Protein Bar',
  status: 'verification_required',
  risk_type: 'source_uncertainty',
  severity: 'medium',
  title: 'Source verification required: INS 471',
  summary: 'INS 471 has potential plant or animal origins.',
  trigger_text: 'INS 471',
  matched_rule: 'Grandmother: Vegetarian',
  reason: 'The source of this ingredient could not be confidently established.',
  confidence: 0.95,
  attention_score: 40.0,
  requires_verification: true,
  cross_contact: false,
  source_uncertainty: true,
  ingredient_path: [],
  evidence: [],
};

const mockFindingNoConflict: RiskFinding = {
  id: 'f-5',
  risk_analysis_id: 'analysis-123',
  member_id: 'mem-mother',
  member_name: 'Mother',
  product_id: 'prod-rice',
  product_name: 'Demo Basmati Rice',
  status: 'no_configured_conflict',
  risk_type: 'unknown',
  severity: 'info',
  title: 'No configured conflict detected',
  summary: 'No match between available product information and requirements.',
  reason: 'No match was found between the available product information and this family member\'s currently configured requirements.',
  confidence: 1.0,
  attention_score: 0.0,
  requires_verification: false,
  cross_contact: false,
  source_uncertainty: false,
  ingredient_path: [],
  evidence: [],
};

const mockRiskAnalysis: RiskAnalysisResponse = {
  id: 'analysis-123',
  family_id: 'fam-1',
  receipt_id: 'rcpt-123',
  analysis_version: 'v1.0.0',
  status: 'completed',
  summary: {
    products_analyzed: 3,
    members_analyzed: 4,
    members_with_conflicts: 3,
    high_priority: 2,
    potential_conflicts: 1,
    verification_required: 1,
    no_configured_conflict: 2,
  },
  members: [
    {
      member_id: 'mem-father',
      member_name: 'Father',
      summary: { high: 1, potential: 1, verification: 0, no_conflict: 1 },
      product_results: [mockFindingHigh, mockFindingCrossContact],
    },
    {
      member_id: 'mem-mother',
      member_name: 'Mother',
      summary: { high: 0, potential: 0, verification: 0, no_conflict: 2 },
      product_results: [mockFindingNoConflict],
    },
    {
      member_id: 'mem-child',
      member_name: 'Child',
      summary: { high: 1, potential: 0, verification: 0, no_conflict: 0 },
      product_results: [mockFindingDerived],
    },
    {
      member_id: 'mem-grandma',
      member_name: 'Grandmother',
      summary: { high: 0, potential: 0, verification: 1, no_conflict: 0 },
      product_results: [mockFindingUncertain],
    },
  ],
  matrix: [
    {
      member_id: 'mem-father',
      member_name: 'Father',
      product_id: 'prod-pb',
      product_name: 'Demo Roasted Peanuts',
      status: 'high_attention',
      findings_count: 1,
      top_finding_title: 'Direct allergen detected: Peanut',
      top_risk_type: 'direct_allergen',
      attention_score: 95.0,
      findings: [mockFindingHigh],
    },
    {
      member_id: 'mem-child',
      member_name: 'Child',
      product_id: 'prod-bar',
      product_name: 'Demo Protein Bar',
      status: 'high_attention',
      findings_count: 1,
      top_finding_title: 'Milk-derived ingredient detected',
      top_risk_type: 'derived_allergen',
      attention_score: 80.0,
      findings: [mockFindingDerived],
    },
    {
      member_id: 'mem-grandma',
      member_name: 'Grandmother',
      product_id: 'prod-bar',
      product_name: 'Demo Protein Bar',
      status: 'verification_required',
      findings_count: 1,
      top_finding_title: 'Source verification required: INS 471',
      top_risk_type: 'source_uncertainty',
      attention_score: 40.0,
      findings: [mockFindingUncertain],
    },
    {
      member_id: 'mem-mother',
      member_name: 'Mother',
      product_id: 'prod-rice',
      product_name: 'Demo Basmati Rice',
      status: 'no_configured_conflict',
      findings_count: 0,
      top_finding_title: 'No configured conflict detected',
      top_risk_type: 'unknown',
      attention_score: 0.0,
      findings: [mockFindingNoConflict],
    },
  ],
};

describe('Phase 6 Family Risk Engine Frontend Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Risk dashboard renders with receipt title and version', async () => {
    vi.mocked(receiptService.getReceipt).mockResolvedValue(mockReceipt);
    vi.mocked(riskService.getLatestReceiptRisk).mockResolvedValue(mockRiskAnalysis);

    render(
      <MemoryRouter initialEntries={['/risk/receipts/rcpt-123']}>
        <Routes>
          <Route path="/risk/receipts/:receiptId" element={<FamilyRiskDashboardPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Family Grocery Risk Intelligence')).toBeInTheDocument();
      expect(screen.getByText(/VERSION v1.0.0/)).toBeInTheDocument();
      expect(screen.getByText(/September Grocery Run.jpg/)).toBeInTheDocument();
    });
  });

  it('2. Summary metrics cards render correct counts', async () => {
    render(
      <RiskSummaryCards
        summary={mockRiskAnalysis.summary}
        activeFilter={null}
        onFilterChange={vi.fn()}
      />
    );

    expect(screen.getByText('High Attention')).toBeInTheDocument();
    expect(screen.getAllByText('2').length).toBe(2); // high_priority and no_configured_conflict
    expect(screen.getByText('Potential Conflicts')).toBeInTheDocument();
    expect(screen.getAllByText('1').length).toBe(2); // potential_conflicts and verification_required
    expect(screen.getByText('Require Verification')).toBeInTheDocument();
    expect(screen.getByText('No Configured Conflict')).toBeInTheDocument();

  });

  it('3. Member cards render with summary badges', () => {
    render(
      <MemberRiskSection
        members={mockRiskAnalysis.members}
        selectedMemberId="mem-father"
        onSelectMember={vi.fn()}
        onViewExplanation={vi.fn()}
      />
    );

    expect(screen.getAllByText('Father').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Child').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Grandmother').length).toBeGreaterThan(0);
    expect(screen.getByText("Father's Results")).toBeInTheDocument();
  });


  it('4. Product matrix renders with family members and products', () => {
    render(
      <RiskMatrixGrid
        matrix={mockRiskAnalysis.matrix!}
        onSelectFinding={vi.fn()}
      />
    );

    expect(screen.getByText('Demo Roasted Peanuts')).toBeInTheDocument();
    expect(screen.getByText('Demo Protein Bar')).toBeInTheDocument();
    expect(screen.getByText('Demo Basmati Rice')).toBeInTheDocument();
  });

  it('5. High-attention finding renders with red badge', () => {
    render(
      <RiskFindingCard
        finding={mockFindingHigh}
        onViewExplanation={vi.fn()}
      />
    );

    expect(screen.getByText('High Attention')).toBeInTheDocument();
    expect(screen.getByText('Demo Roasted Peanuts')).toBeInTheDocument();
    expect(screen.getByText('Roasted Peanuts')).toBeInTheDocument();
  });

  it('6. Potential conflict renders with amber badge', () => {
    render(
      <RiskStatusBadge status="potential_conflict" />
    );

    expect(screen.getByText('Potential Conflict')).toBeInTheDocument();
  });

  it('7. Verification state renders with yellow badge', () => {
    render(
      <RiskStatusBadge status="verification_required" />
    );

    expect(screen.getByText('Verification Required')).toBeInTheDocument();
  });

  it('8. No-configured-conflict renders with non-judgmental wording', () => {
    render(
      <RiskFindingCard
        finding={mockFindingNoConflict}
        onViewExplanation={vi.fn()}
      />
    );

    expect(screen.getByText('No Configured Conflict')).toBeInTheDocument();
    expect(screen.getByText(/No match was found between the available product information/)).toBeInTheDocument();
  });

  it('9. Finding explanation drawer expands with why details', () => {
    const handleClose = vi.fn();
    render(
      <RiskExplanationDrawer
        finding={mockFindingDerived}
        isOpen={true}
        onClose={handleClose}
      />
    );

    expect(screen.getByText('Milk-derived ingredient detected')).toBeInTheDocument();
    expect(screen.getAllByText('Whey Protein').length).toBeGreaterThan(0);
    expect(screen.getByText('Child: Lactose intolerance')).toBeInTheDocument();

    expect(screen.getByText(/Food Safety Decision Support:/)).toBeInTheDocument();
  });

  it('10. Ingredient reasoning chain renders step-by-step breadcrumbs', () => {
    render(
      <RiskExplanationDrawer
        finding={mockFindingDerived}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Ingredient Reasoning Chain')).toBeInTheDocument();
    expect(screen.getByText('Whey')).toBeInTheDocument();
    expect(screen.getByText('Milk')).toBeInTheDocument();
  });

  it('11. Filter tabs switch view mode between Matrix and Members', async () => {
    vi.mocked(receiptService.getReceipt).mockResolvedValue(mockReceipt);
    vi.mocked(riskService.getLatestReceiptRisk).mockResolvedValue(mockRiskAnalysis);

    render(
      <MemoryRouter initialEntries={['/risk/receipts/rcpt-123']}>
        <Routes>
          <Route path="/risk/receipts/:receiptId" element={<FamilyRiskDashboardPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('📊 Family Matrix')).toBeInTheDocument();
    });

    const membersBtn = screen.getByText('👨‍👩‍👧 By Member');
    fireEvent.click(membersBtn);

    expect(screen.getByText(/Results/)).toBeInTheDocument();
  });

  it('12. Member detail page renders member-specific results', async () => {
    vi.mocked(riskService.getReceiptMemberRisk).mockResolvedValue(mockRiskAnalysis.members[0]);

    render(
      <MemoryRouter initialEntries={['/risk/receipts/rcpt-123/member/mem-father']}>
        <Routes>
          <Route path="/risk/receipts/:receiptId/member/:memberId" element={<MemberRiskDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Father's Grocery Risk Results")).toBeInTheDocument();
      expect(screen.getByText('Demo Roasted Peanuts')).toBeInTheDocument();
    });
  });

  it('13. Product impact panel renders family impact cards on product page', () => {
    const impactList = [
      {
        member_id: 'mem-father',
        member_name: 'Father',
        status: 'potential_conflict' as const,
        top_finding: mockFindingCrossContact,
        findings: [mockFindingCrossContact],
      },
      {
        member_id: 'mem-child',
        member_name: 'Child',
        status: 'high_attention' as const,
        top_finding: mockFindingDerived,
        findings: [mockFindingDerived],
      },
    ];

    render(
      <ProductImpactPanel
        impactedMembers={impactList}
        onViewFinding={vi.fn()}
      />
    );

    expect(screen.getByText('Family Grocery Risk Impact')).toBeInTheDocument();
    expect(screen.getByText('Father')).toBeInTheDocument();
    expect(screen.getByText('Child')).toBeInTheDocument();
  });

  it('14. Cross-contact warning banner shows in explanation', () => {
    render(
      <RiskExplanationDrawer
        finding={mockFindingCrossContact}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Cross-Contact / Precautionary Warning')).toBeInTheDocument();
    expect(screen.getByText(/potential unintended cross-contact/)).toBeInTheDocument();
  });

  it('15. Error state renders graceful error alert when risk analysis fails', async () => {
    vi.mocked(receiptService.getReceipt).mockRejectedValue(new Error('Network error loading receipt'));

    render(
      <MemoryRouter initialEntries={['/risk/receipts/rcpt-123']}>
        <Routes>
          <Route path="/risk/receipts/:receiptId" element={<FamilyRiskDashboardPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Family Risk Analysis Unavailable')).toBeInTheDocument();
      expect(screen.getByText('Network error loading receipt')).toBeInTheDocument();
    });
  });
});
