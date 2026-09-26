import React from 'react';
import { Shield, X, AlertTriangle, CheckSquare, Sparkles } from 'lucide-react';
import { RiskFinding } from '../../types';
import { RiskStatusBadge } from './RiskStatusBadge';
import { ExplainableConfidence } from './ExplainableConfidence';
import { EvidencePanel } from './EvidencePanel';
import { UncertaintyExplanation } from './UncertaintyExplanation';
import { ExplainableDerivationTrace } from './ExplainableDerivationTrace';

interface RiskExplanationDrawerProps {
  finding: RiskFinding | null;
  isOpen: boolean;
  onClose: () => void;
}

export const RiskExplanationDrawer: React.FC<RiskExplanationDrawerProps> = ({
  finding,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !finding) return null;

  const expl = finding.explainability;
  const headline = expl?.headline || finding.title;
  const summaryText = expl?.summary || finding.reason || finding.summary;
  const trigger = expl?.trigger || finding.trigger_text;
  const rule = expl?.configured_requirement || expl?.rule || finding.matched_rule || 'Profile Requirement';
  const confidence = expl?.confidence ?? finding.confidence ?? 0.95;
  const confidenceLevel = expl?.confidence_level;
  const evidenceList = expl?.evidence || [];
  const verifGuidance =
    expl?.verification_guidance ||
    'Always verify the physical packaging and current manufacturer ingredient label before consumption.';
  const disclaimerText =
    expl?.disclaimer ||
    'This is an informational decision-support tool based on your family\'s configured requirements and available product label data. It does not diagnose medical conditions, predict allergic reactions, or guarantee that food is 100% safe. Always inspect physical packaging before consumption.';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="why-flagged-heading"
    >
      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 text-slate-100 font-sans">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <RiskStatusBadge status={finding.status} size="sm" />
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold font-mono">
                {finding.risk_type.replace(/_/g, ' ')}
              </span>
            </div>
            <h2 id="why-flagged-heading" className="text-lg font-bold text-white leading-snug">
              {headline}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 10-Question Core Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-4 border-b border-slate-800 text-xs">
          <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/80">
            <span className="text-slate-400 text-[11px] block">Product:</span>
            <p className="font-semibold text-slate-100 mt-0.5 text-sm">
              {finding.product_name || expl?.product_name || 'Purchased Product'}
            </p>
          </div>

          <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/80">
            <span className="text-slate-400 text-[11px] block">Affected Family Member:</span>
            <p className="font-semibold text-slate-100 mt-0.5 text-sm">
              {finding.member_name || expl?.member_name || 'Member'}
            </p>
          </div>

          <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/80">
            <span className="text-slate-400 text-[11px] block">Configured Requirement:</span>
            <p className="font-semibold text-indigo-300 mt-0.5">
              {rule}
            </p>
          </div>

          {trigger && (
            <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/80">
              <span className="text-slate-400 text-[11px] block">Triggering Item / Statement:</span>
              <p className="font-semibold text-sky-300 mt-0.5 font-mono">
                {trigger}
              </p>
            </div>
          )}
        </div>

        {/* Why it was flagged: Human Narrative Summary */}
        <div className="my-4">
          <h3 className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1.5 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Reasoning Summary</span>
          </h3>
          <p className="text-xs text-slate-200 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 leading-relaxed">
            {summaryText}
          </p>
        </div>

        {/* Uncertainty / Dual-Source / Cross-Contact Guidance */}
        <UncertaintyExplanation finding={finding} className="my-4" />

        {/* Ingredient Derivation Trace (6-stage pipeline) */}
        <div className="my-4">
          <h3 className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1.5 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Ingredient Reasoning Chain</span>
          </h3>
          <ExplainableDerivationTrace finding={finding} />
        </div>

        {/* Evidence Sources & Provenance */}
        <div className="my-4">
          <EvidencePanel evidence={evidenceList} />
        </div>

        {/* Confidence (with mandatory clinical non-reaction distinction) */}
        <div className="my-4">
          <h4 className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1.5">
            Matching Confidence & Intelligence Quality
          </h4>
          <ExplainableConfidence
            confidence={confidence}
            level={confidenceLevel}
            method={finding.risk_type}
          />
        </div>

        {/* Actionable Packaging Verification Checklist */}
        <div className="my-4 p-3.5 rounded-xl bg-slate-950/60 border border-emerald-500/30 text-xs">
          <div className="flex items-center gap-1.5 text-emerald-400 font-semibold mb-1">
            <CheckSquare className="w-4 h-4 shrink-0" />
            <span>What to verify on the physical package before serving:</span>
          </div>
          <p className="text-slate-300 leading-relaxed">
            {verifGuidance}
          </p>
        </div>

        {/* Mandatory Clinical Disclaimer Footer */}
        <div className="mt-5 pt-4 border-t border-slate-800 text-[11px] text-slate-400 leading-relaxed flex items-start gap-2">
          <Shield className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <div>
            <strong className="text-slate-300">Food Safety Decision Support:</strong>{' '}
            {disclaimerText}
          </div>
        </div>
      </div>
    </div>
  );
};
