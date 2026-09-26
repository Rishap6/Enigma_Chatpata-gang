import React from 'react';
import { AlertTriangle, HelpCircle, ShieldAlert } from 'lucide-react';

interface UncertaintyBannerProps {
  type: 'source_uncertain' | 'unknown_ingredient' | 'verification_required';
  title?: string;
  message?: string;
  candidate?: string | null;
  onSelectCandidate?: (candidate: string) => void;
}

export const UncertaintyBanner: React.FC<UncertaintyBannerProps> = ({
  type,
  title,
  message,
  candidate,
  onSelectCandidate,
}) => {
  if (type === 'unknown_ingredient') {
    return (
      <div
        className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 shadow-xs flex items-start gap-3"
        data-testid="uncertainty-banner-unknown"
      >
        <HelpCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-semibold text-sm">
            {title || 'Ingredient Not Recognized'}
          </h4>
          <p className="text-xs text-amber-800 leading-relaxed">
            {message ||
              'We could not confidently identify this ingredient from the current knowledge base. No false assumptions were made.'}
          </p>
          {candidate && (
            <div className="pt-2 flex items-center gap-2">
              <span className="text-xs font-medium text-amber-900">Did you mean:</span>
              <button
                type="button"
                onClick={() => onSelectCandidate && onSelectCandidate(candidate)}
                className="px-2.5 py-1 text-xs font-semibold rounded bg-amber-200/80 hover:bg-amber-300 text-amber-950 transition-colors"
              >
                {candidate}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (type === 'source_uncertain') {
    return (
      <div
        className="p-4 rounded-xl bg-yellow-50 border border-yellow-200 text-yellow-950 shadow-xs flex items-start gap-3"
        data-testid="uncertainty-banner-source"
      >
        <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-yellow-500 animate-pulse" />
            <h4 className="font-semibold text-sm">
              {title || 'Source Unverified / Multiple Origins Possible'}
            </h4>
          </div>
          <p className="text-xs text-yellow-900 leading-relaxed">
            {message ||
              'This ingredient can be synthesized or derived from multiple distinct origins (e.g. plant vs. animal). Its exact origin depends on manufacturer batch specification.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="p-4 rounded-xl bg-orange-50 border border-orange-200 text-orange-950 shadow-xs flex items-start gap-3"
      data-testid="uncertainty-banner-verification"
    >
      <ShieldAlert className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
      <div className="space-y-1">
        <h4 className="font-semibold text-sm">
          {title || 'Verification Required'}
        </h4>
        <p className="text-xs text-orange-900 leading-relaxed">
          {message ||
            'Knowledge confidence is insufficient to assert definite dietary compatibility without additional label or manufacturer verification.'}
        </p>
      </div>
    </div>
  );
};
