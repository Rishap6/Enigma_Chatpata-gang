import React, { useState } from 'react';
import { HelpCircle, X, Shield, Info, AlertTriangle, ShieldCheck } from 'lucide-react';
import { RiskStatusBadge } from './RiskStatusBadge';

interface TerminologyHelperProps {
  buttonText?: string;
  className?: string;
}

export const TerminologyHelper: React.FC<TerminologyHelperProps> = ({
  buttonText = 'Food Safety Terminology & Definitions',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium transition cursor-pointer ${className}`}
        aria-label="Open food safety terminology helper"
      >
        <HelpCircle className="w-3.5 h-3.5" />
        <span>{buttonText}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 text-slate-100">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">
                  Food Safety Intelligence: Terminology & Standards
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-5 text-xs leading-relaxed">
              {/* Critical Safety Notice Callout */}
              <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-indigo-300">
                  <Info className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>Informational Decision-Support Principles</span>
                </div>
                <p className="text-slate-300">
                  This system assists families in reviewing grocery products against their personal dietary rules and documented allergies. It{' '}
                  <strong className="text-white">never</strong> guarantees that any food is &ldquo;100% safe&rdquo; or predicts individual biological reaction probabilities. Always verify current physical packaging before consumption.
                </p>
              </div>

              {/* Status Definitions Table / Cards */}
              <div className="space-y-3">
                <h4 className="font-semibold text-slate-200 uppercase tracking-wider text-[11px]">
                  Classification Statuses Explained
                </h4>

                <div className="space-y-2.5">
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                    <div className="flex items-center gap-2">
                      <RiskStatusBadge status="high_attention" size="sm" />
                      <span className="font-semibold text-rose-300">Direct or Strong Ancestor Conflict</span>
                    </div>
                    <p className="text-slate-300">
                      An ingredient declared on the product label explicitly matches an allergy or strict dietary exclusion, or was traced through a high-confidence derivation chain (e.g. Maida → Wheat → Gluten).
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                    <div className="flex items-center gap-2">
                      <RiskStatusBadge status="potential_conflict" size="sm" />
                      <span className="font-semibold text-amber-300">Precautionary / Moderate Preference Conflict</span>
                    </div>
                    <p className="text-slate-300">
                      The product contains a precautionary facility cross-contact statement (e.g. &ldquo;May contain traces of Peanuts&rdquo;), or conflicts with a nutrition preference (e.g. added sodium or sugar).
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                    <div className="flex items-center gap-2">
                      <RiskStatusBadge status="verification_required" size="sm" />
                      <span className="font-semibold text-yellow-300">Dual-Source / Unestablished Origin</span>
                    </div>
                    <p className="text-slate-300">
                      The ingredient (e.g. INS 471) can be derived from plant or animal sources. Because commercial origin cannot be determined from label codes alone, packaging verification or manufacturer confirmation is required.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                    <div className="flex items-center gap-2">
                      <RiskStatusBadge status="no_configured_conflict" size="sm" />
                      <span className="font-semibold text-emerald-300">No Configured Conflict Detected</span>
                    </div>
                    <p className="text-slate-300">
                      Based on current family member configurations and visible ingredients, no conflict was found. This does not mean guaranteed 100% allergen-free. Unlisted cross-contamination or recipe reformulations remain possible.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                    <div className="flex items-center gap-2">
                      <RiskStatusBadge status="insufficient_information" size="sm" />
                      <span className="font-semibold text-slate-300">Insufficient Information</span>
                    </div>
                    <p className="text-slate-300">
                      The product ingredient list is missing or could not be mapped to verified definitions. Manual label inspection is required.
                    </p>
                  </div>
                </div>
              </div>

              {/* Confidence vs Medical Danger */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                <h4 className="font-bold text-slate-200">
                  Evidence Confidence vs. Reaction Probability
                </h4>
                <p className="text-slate-400">
                  <strong className="text-slate-300">Confidence (e.g. 97%)</strong> indicates the mathematical certainty of our ingredient normalization and relationship graph traversal. It is{' '}
                  <strong className="text-amber-300">never a biological probability of anaphylaxis</strong>. Biological reactions depend on clinical sensitivity, ingestion quantity, and individual immune response.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition cursor-pointer"
              >
                Close Helper
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
