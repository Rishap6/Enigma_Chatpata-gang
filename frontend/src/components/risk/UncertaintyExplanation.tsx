import React from 'react';
import { AlertTriangle, HelpCircle, ShieldAlert, CheckSquare } from 'lucide-react';
import { RiskFinding } from '../../types';

interface UncertaintyExplanationProps {
  finding: RiskFinding;
  className?: string;
}

export const UncertaintyExplanation: React.FC<UncertaintyExplanationProps> = ({
  finding,
  className = '',
}) => {
  const isSourceUncertainty = finding.source_uncertainty || finding.risk_type === 'source_uncertainty';
  const isCrossContact = finding.cross_contact || finding.risk_type === 'cross_contact';
  const isInsufficientInfo = finding.status === 'insufficient_information';

  if (!isSourceUncertainty && !isCrossContact && !isInsufficientInfo && !finding.requires_verification) {
    return null;
  }

  // Dual-Source Uncertainty (e.g. INS 471, mono- and diglycerides)
  if (isSourceUncertainty) {
    const trigger = finding.trigger_text || 'Dual-Source Additive';
    const possibleSources = ['Plant origin (vegetable oils, palm, soy)', 'Animal origin (tallow, animal fats)'];

    return (
      <div
        className={`p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-3 ${className}`}
        data-testid="uncertainty-explanation-source"
      >
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
          <span className="font-bold text-amber-300 uppercase tracking-wider text-[11px]">
            🟡 Verification Required: Ambiguous Ingredient Source
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
            <span className="text-slate-400 text-[11px] block mb-1">Ingredient / Additive:</span>
            <span className="font-semibold text-slate-100 font-mono text-sm">{trigger}</span>
          </div>

          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
            <span className="text-slate-400 text-[11px] block mb-1">Possible Commercial Origins:</span>
            <div className="space-y-0.5">
              {possibleSources.map((src, i) => (
                <div key={i} className="text-slate-300 text-[11px] flex items-center gap-1.5">
                  <span className="text-amber-400">•</span>
                  <span>{src}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-1.5 bg-amber-950/20 p-2.5 rounded-lg border border-amber-500/20">
          <div className="flex items-center gap-1.5 font-semibold text-amber-300">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>Why uncertain:</span>
          </div>
          <p className="text-slate-300 leading-relaxed text-[11px]">
            {finding.explainability?.uncertainty_reason ||
              'Standard grocery ingredient labels typically declare functional code numbers (e.g. INS 471) without specifying whether the underlying fatty acid substrate was sourced from vegetable or animal lipids.'}
          </p>
        </div>

        <div className="space-y-1.5 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
          <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
            <CheckSquare className="w-3.5 h-3.5 shrink-0" />
            <span>What to do on the physical package:</span>
          </div>
          <p className="text-slate-300 leading-relaxed text-[11px]">
            {finding.explainability?.verification_guidance ||
              'Inspect physical package for a certified Vegetarian green dot (India) or Vegan certification mark, or reach out to the manufacturer batch helpline.'}
          </p>
        </div>
      </div>
    );
  }

  // Precautionary Cross-Contact Warning
  if (isCrossContact) {
    return (
      <div
        className={`p-4 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-200 text-xs space-y-2.5 ${className}`}
        data-testid="uncertainty-explanation-cross-contact"
      >
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-orange-400 shrink-0" />
          <span className="font-bold text-orange-300 uppercase tracking-wider text-[11px]">
            Cross-Contact / Precautionary Warning
          </span>
        </div>

        <p className="text-slate-300 leading-relaxed">
          {finding.explainability?.uncertainty_reason ||
            'The product packaging includes a precautionary statement (such as "May contain traces" or shared facility). This indicates potential unintended cross-contact, distinct from an intentional recipe ingredient.'}
        </p>

        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 text-[11px]">
          <span className="font-semibold text-orange-300 block mb-0.5">Verification recommendation:</span>
          <p className="text-slate-300">
            {finding.explainability?.verification_guidance ||
              'Review tolerance thresholds with your physician. Precautionary facility statements are voluntary and may reflect trace risks.'}
          </p>
        </div>
      </div>
    );
  }

  // Insufficient Information
  return (
    <div
      className={`p-4 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 text-xs space-y-2.5 ${className}`}
      data-testid="uncertainty-explanation-insufficient"
    >
      <div className="flex items-center gap-2">
        <HelpCircle className="w-4 h-4 text-sky-400 shrink-0" />
        <span className="font-bold text-sky-300 uppercase tracking-wider text-[11px]">
          Insufficient Product Information
        </span>
      </div>

      <p className="text-slate-300 leading-relaxed">
        {finding.explainability?.uncertainty_reason ||
          'There is not enough verified ingredient or allergen data in the catalog record to establish compatibility with certainty.'}
      </p>

      <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 text-[11px]">
        <span className="font-semibold text-sky-300 block mb-0.5">Action:</span>
        <p className="text-slate-300">
          {finding.explainability?.verification_guidance ||
            'Inspect the full ingredient list printed on the physical package before serving.'}
        </p>
      </div>
    </div>
  );
};
