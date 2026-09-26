import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

import { ExplainableConfidence } from '../components/risk/ExplainableConfidence';
import { EvidencePanel } from '../components/risk/EvidencePanel';
import { UncertaintyExplanation } from '../components/risk/UncertaintyExplanation';
import { ExplainableDerivationTrace } from '../components/risk/ExplainableDerivationTrace';
import { TerminologyHelper } from '../components/risk/TerminologyHelper';
import { FamilyRiskInsights } from '../components/risk/FamilyRiskInsights';
import { RiskAuditRecord } from '../components/risk/RiskAuditRecord';
import { RiskExplanationDrawer } from '../components/risk/RiskExplanationDrawer';
import { RiskFinding, RiskAnalysisResponse } from '../types';

describe('Phase 7: Explainable AI & Evidence Components', () => {
  describe('ExplainableConfidence', () => {
    it('renders confidence percentage, tier label, and mandatory clinical disclaimer', () => {
      render(<ExplainableConfidence confidence={0.97} level="high" />);

      expect(screen.getByTestId('explainable-confidence')).toBeInTheDocument();
      expect(screen.getByText('High Evidence Confidence')).toBeInTheDocument();
      expect(screen.getByText('(97%)')).toBeInTheDocument();

      // Mandatory medical safety distinction
      expect(screen.getByText(/not a probability of an allergic reaction/i)).toBeInTheDocument();
      expect(screen.getByText(/Confidence reflects the available product\/ingredient evidence/i)).toBeInTheDocument();
    });

    it('renders medium confidence tier for dual-source uncertainty', () => {
      render(<ExplainableConfidence confidence={0.70} level="medium" method="source_uncertainty" />);

      expect(screen.getByText('Medium Evidence Confidence')).toBeInTheDocument();
      expect(screen.getByText('(70%)')).toBeInTheDocument();
      expect(screen.getByText(/source: source uncertainty/i)).toBeInTheDocument();
    });
  });

  describe('EvidencePanel', () => {
    it('renders structured evidence items with level badges and citations', () => {
      const mockEvidence = [
        {
          source: 'Ingredient Knowledge Base',
          evidence_type: 'canonical_database',
          level: 'high' as const,
          confidence: 0.99,
          snippet: 'Whey is milk-derived.',
          reference: 'KB-REF/WHEY-01',
        },
        {
          source: 'Product Packaging Label',
          evidence_type: 'product_label',
          level: 'high' as const,
          confidence: 1.0,
          snippet: 'Listed on label: "Whey Protein Isolate"',
          reference: 'Packaging Back Panel',
        },
      ];

      render(<EvidencePanel evidence={mockEvidence} />);

      expect(screen.getByTestId('evidence-panel')).toBeInTheDocument();
      expect(screen.getAllByText('High Quality')).toHaveLength(2);
      expect(screen.getByText(/Whey is milk-derived/i)).toBeInTheDocument();
      expect(screen.getByText('KB-REF/WHEY-01')).toBeInTheDocument();
      expect(screen.getByText('Packaging Back Panel')).toBeInTheDocument();
    });

    it('displays empty message if no evidence items provided', () => {
      render(<EvidencePanel evidence={[]} />);
      expect(screen.getByText(/No specific secondary evidence records attached/i)).toBeInTheDocument();
    });
  });

  describe('UncertaintyExplanation', () => {
    it('renders dual-source verification instructions for INS 471', () => {
      const mockFinding: RiskFinding = {
        member_id: 'mem-1',
        member_name: 'David',
        product_id: 'prod-1',
        product_name: 'Demo Biscuit',
        status: 'verification_required',
        risk_type: 'source_uncertainty',
        severity: 'medium',
        title: 'INS 471 Source Ambiguity',
        summary: 'Dual source origin requires verification.',
        trigger_text: 'INS 471',
        matched_rule: 'Vegetarian',
        attention_score: 50.0,
        requires_verification: true,
        cross_contact: false,
        source_uncertainty: true,
        ingredient_path: [],
        evidence: [],
        explainability: {
          title: 'INS 471 Source Ambiguity',
          summary: 'Dual source origin requires verification.',
          trigger: 'INS 471',
          rule: 'Vegetarian',
          risk_type: 'source_uncertainty',
          status: 'verification_required',
          severity: 'medium',
          confidence: 0.70,
          attention_score: 50.0,
          requires_verification: true,
          cross_contact: false,
          source_uncertainty: true,
          chain: [],
          evidence: [],
          uncertainty_reason: 'The available data does not establish whether INS 471 is plant or animal-derived.',
          verification_guidance: 'Check physical package for vegetarian green dot symbol or contact manufacturer.',
        },
      };

      render(<UncertaintyExplanation finding={mockFinding} />);

      expect(screen.getByTestId('uncertainty-explanation-source')).toBeInTheDocument();
      expect(screen.getByText(/Verification Required: Ambiguous Ingredient Source/i)).toBeInTheDocument();
      expect(screen.getByText(/Plant origin/i)).toBeInTheDocument();
      expect(screen.getByText(/Animal origin/i)).toBeInTheDocument();
      expect(screen.getByText(/Check physical package for vegetarian green dot/i)).toBeInTheDocument();
    });

    it('renders cross-contact precautionary warning', () => {
      const mockFinding: RiskFinding = {
        member_id: 'mem-2',
        member_name: 'Alex',
        product_id: 'prod-1',
        status: 'potential_conflict',
        risk_type: 'cross_contact',
        severity: 'medium',
        title: 'Precautionary Cross-Contact',
        summary: 'Precautionary peanut statement on package.',
        matched_rule: 'Peanut Allergy',
        attention_score: 70.0,
        requires_verification: false,
        cross_contact: true,
        source_uncertainty: false,
        ingredient_path: [],
        evidence: [],
      };

      render(<UncertaintyExplanation finding={mockFinding} />);

      expect(screen.getByTestId('uncertainty-explanation-cross-contact')).toBeInTheDocument();
      expect(screen.getByText(/Cross-Contact \/ Precautionary Warning/i)).toBeInTheDocument();
    });
  });

  describe('ExplainableDerivationTrace', () => {
    it('renders complete 6-stage derivation tree for Maida -> Wheat -> Gluten', () => {
      const mockFinding: RiskFinding = {
        member_id: 'mem-3',
        member_name: 'Sarah',
        product_id: 'prod-2',
        product_name: 'Artisan Biscuit',
        status: 'high_attention',
        risk_type: 'derived_allergen',
        severity: 'high',
        title: 'Gluten Conflict via Maida',
        summary: 'Maida is wheat-derived and naturally contains gluten.',
        trigger_text: 'Maida',
        matched_rule: 'Gluten-Free',
        attention_score: 95.0,
        requires_verification: false,
        cross_contact: false,
        source_uncertainty: false,
        ingredient_path: [
          { step_number: 1, ingredient_name: 'Maida' },
          { step_number: 2, ingredient_name: 'Wheat' },
          { step_number: 3, ingredient_name: 'Gluten' },
        ],
        evidence: [],
        explainability: {
          title: 'Gluten Conflict via Maida',
          summary: 'Maida is wheat-derived and naturally contains gluten.',
          trigger: 'Maida',
          rule: 'Gluten-Free',
          risk_type: 'derived_allergen',
          status: 'high_attention',
          severity: 'high',
          confidence: 0.98,
          attention_score: 95.0,
          requires_verification: false,
          cross_contact: false,
          source_uncertainty: false,
          chain: ['Maida', 'Wheat', 'Gluten'],
          evidence: [],
        },
      };

      render(<ExplainableDerivationTrace finding={mockFinding} />);

      expect(screen.getByTestId('explainable-derivation-trace')).toBeInTheDocument();
      expect(screen.getByText('1. Raw Label Ingredient')).toBeInTheDocument();
      expect(screen.getByText('2. Normalized Ingredient')).toBeInTheDocument();
      expect(screen.getByText('3. Derived Ancestor Ingredient')).toBeInTheDocument();
      expect(screen.getByText('4. Underlying Allergen / Source')).toBeInTheDocument();
      expect(screen.getByText('5. Relevant Category')).toBeInTheDocument();
      expect(screen.getByText('6. Family Configured Requirement')).toBeInTheDocument();
      expect(screen.getByText('Sarah: Gluten-Free')).toBeInTheDocument();
    });
  });

  describe('TerminologyHelper', () => {
    it('opens interactive terminology modal with safety principles and status explanations', () => {
      render(<TerminologyHelper />);

      const button = screen.getByRole('button', { name: /open food safety terminology helper/i });
      fireEvent.click(button);

      expect(screen.getByText('Food Safety Intelligence: Terminology & Standards')).toBeInTheDocument();
      expect(screen.getByText(/Informational Decision-Support Principles/i)).toBeInTheDocument();
      expect(screen.getByText(/Direct or Strong Ancestor Conflict/i)).toBeInTheDocument();
      expect(screen.getByText(/Precautionary \/ Moderate Preference Conflict/i)).toBeInTheDocument();
      expect(screen.getByText(/Dual-Source \/ Unestablished Origin/i)).toBeInTheDocument();
      expect(screen.getByText(/No Configured Conflict Detected/i)).toBeInTheDocument();

      // Ensure explicit safe wording disclaimer is present
      expect(screen.getByText(/This does not mean guaranteed 100% allergen-free/i)).toBeInTheDocument();

      // Close modal
      const closeBtn = screen.getByRole('button', { name: 'Close Helper' });
      fireEvent.click(closeBtn);
      expect(screen.queryByText('Food Safety Intelligence: Terminology & Standards')).not.toBeInTheDocument();
    });
  });

  describe('FamilyRiskInsights', () => {
    it('renders basket-level executive safety summary', () => {
      const mockAnalysis: RiskAnalysisResponse = {
        id: 'ana-1',
        family_id: 'fam-1',
        receipt_id: 'rcpt-1',
        analysis_version: 'v1.0.0',
        status: 'completed',
        summary: {
          products_analyzed: 5,
          members_analyzed: 4,
          members_with_conflicts: 2,
          high_priority: 2,
          potential_conflicts: 1,
          verification_required: 1,
          no_configured_conflict: 2,
        },
        members: [
          {
            member_id: 'mem-1',
            member_name: 'David',
            summary: { high: 0, potential: 0, verification: 1, no_conflict: 4 },
            product_results: [],
          },
          {
            member_id: 'mem-2',
            member_name: 'Sarah',
            summary: { high: 2, potential: 0, verification: 0, no_conflict: 3 },
            product_results: [
              {
                member_id: 'mem-2',
                product_id: 'prod-1',
                status: 'high_attention',
                risk_type: 'derived_allergen',
                severity: 'high',
                title: 'Gluten Conflict',
                summary: 'Contains wheat gluten.',
                trigger_text: 'Maida',
                attention_score: 95.0,
                requires_verification: false,
                cross_contact: false,
                source_uncertainty: false,
                ingredient_path: [],
                evidence: [],
              },
            ],
          },
        ],
      };

      render(<FamilyRiskInsights analysis={mockAnalysis} onFilterStatus={vi.fn()} />);

      expect(screen.getByTestId('family-risk-insights')).toBeInTheDocument();
      expect(screen.getByText('Sarah')).toBeInTheDocument();
      expect(screen.getByText(/Maida/i)).toBeInTheDocument();
      expect(screen.getByText(/Review 2 High Attention Items/i)).toBeInTheDocument();
    });
  });

  describe('RiskAuditRecord', () => {
    it('expands to reveal deterministic pipeline steps and analysis metadata', () => {
      const mockAnalysis: RiskAnalysisResponse = {
        id: 'analysis-uuid-12345',
        family_id: 'fam-uuid-67890',
        receipt_id: 'rcpt-uuid-11223',
        analysis_version: 'v1.0.0',
        status: 'completed',
        analysis_timestamp: '2026-09-26T12:00:00Z',
        summary: {
          products_analyzed: 3,
          members_analyzed: 2,
          members_with_conflicts: 1,
          high_priority: 1,
          potential_conflicts: 0,
          verification_required: 0,
          no_configured_conflict: 2,
        },
        members: [],
      };

      render(<RiskAuditRecord analysis={mockAnalysis} />);

      expect(screen.getByTestId('risk-audit-record')).toBeInTheDocument();
      expect(screen.getByText('v1.0.0')).toBeInTheDocument();

      const expandBtn = screen.getByRole('button', { name: /view audit trail/i });
      fireEvent.click(expandBtn);

      expect(screen.getByText('analysis-uuid-12345')).toBeInTheDocument();
      expect(screen.getByText('1. Direct Allergen Evaluation')).toBeInTheDocument();
      expect(screen.getByText('2. Graph Derivation Traversal')).toBeInTheDocument();
      expect(screen.getByText(/Regulatory & Safety Standard Notice/i)).toBeInTheDocument();
    });
  });

  describe('RiskExplanationDrawer: Full Why Flagged Experience', () => {
    it('renders complete explainability payload with headline, rule, trace, confidence, and verification', () => {
      const onClose = vi.fn();
      const mockFinding: RiskFinding = {
        id: 'find-1',
        member_id: 'mem-1',
        member_name: 'Sarah',
        product_id: 'prod-1',
        product_name: 'Demo Biscuit',
        status: 'high_attention',
        risk_type: 'derived_allergen',
        severity: 'high',
        title: 'Maida is linked to Gluten',
        summary: 'Maida is linked through the ingredient knowledge model to wheat and gluten.',
        trigger_text: 'Maida',
        matched_rule: 'Gluten-Free',
        confidence: 0.97,
        attention_score: 95.0,
        requires_verification: false,
        cross_contact: false,
        source_uncertainty: false,
        ingredient_path: [
          { step_number: 1, ingredient_name: 'Maida' },
          { step_number: 2, ingredient_name: 'Wheat' },
          { step_number: 3, ingredient_name: 'Gluten' },
        ],
        evidence: [],
        explainability: {
          headline: 'Derived Allergen Link: Maida is linked to Gluten-Free',
          title: 'Maida is linked to Gluten',
          summary: 'Maida is linked through the ingredient knowledge model to wheat and gluten.',
          trigger: 'Maida',
          configured_requirement: 'Gluten-Free',
          rule: 'Gluten-Free',
          risk_type: 'derived_allergen',
          status: 'high_attention',
          severity: 'high',
          confidence: 0.97,
          confidence_level: 'high',
          confidence_explanation: 'Confidence reflects the available product/ingredient evidence and matching quality. It is not a probability of an allergic reaction.',
          attention_score: 95.0,
          requires_verification: false,
          cross_contact: false,
          source_uncertainty: false,
          chain: ['Maida', 'Wheat', 'Gluten'],
          relationship_steps: [
            { step_number: 1, from_node: 'Maida', relationship: 'derived_from', to_node: 'Wheat' },
            { step_number: 2, from_node: 'Wheat', relationship: 'contains', to_node: 'Gluten' },
          ],
          evidence: [
            {
              source: 'Ingredient Knowledge Base',
              evidence_type: 'canonical_database',
              level: 'high',
              confidence: 0.99,
              snippet: 'Maida is milled from wheat and contains gluten.',
              reference: 'KB-REF/WHEAT-01',
            },
          ],
          verification_guidance: 'Always verify the physical packaging and current manufacturer ingredient label before consumption.',
          disclaimer: 'This is an informational decision-support tool. It does not diagnose medical conditions or predict allergic reactions.',
        },
      };

      render(
        <RiskExplanationDrawer
          finding={mockFinding}
          isOpen={true}
          onClose={onClose}
        />
      );

      // Verify headline & questions
      expect(screen.getByText('Derived Allergen Link: Maida is linked to Gluten-Free')).toBeInTheDocument();
      expect(screen.getByText('Demo Biscuit')).toBeInTheDocument();
      expect(screen.getByText('Sarah')).toBeInTheDocument();
      expect(screen.getByText('Gluten-Free')).toBeInTheDocument();
      expect(screen.getAllByText('Maida').length).toBeGreaterThan(0);

      // Verify confidence & evidence
      expect(screen.getByText('High Evidence Confidence')).toBeInTheDocument();
      expect(screen.getByText('(97%)')).toBeInTheDocument();
      expect(screen.getByText(/Maida is milled from wheat and contains gluten/i)).toBeInTheDocument();

      // Verify verification guidance
      expect(screen.getByText(/Always verify the physical packaging/i)).toBeInTheDocument();

      // Verify disclaimer
      expect(screen.getByText(/Food Safety Decision Support:/i)).toBeInTheDocument();

      // Verify close action
      const closeBtn = screen.getByRole('button', { name: 'Close' });
      fireEvent.click(closeBtn);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
