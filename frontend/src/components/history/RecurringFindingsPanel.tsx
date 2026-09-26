import React from 'react';
import { AlertTriangle, Sparkles, CheckCircle2, ChevronRight, Package, User } from 'lucide-react';
import { RecurringPatternItem } from '../../types/history';

interface RecurringFindingsPanelProps {
  patterns: RecurringPatternItem[];
  onOpenFindingExplanation: (findingId: string) => void;
}

export const RecurringFindingsPanel: React.FC<RecurringFindingsPanelProps> = ({
  patterns,
  onOpenFindingExplanation,
}) => {
  if (patterns.length === 0) {
    return null;
  }

  return (
    <div className="card overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-slate-200/80">
        <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span>Top Recurring Grocery Safety Patterns</span>
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Deterministic patterns identified across multiple receipts and products requiring household review.
        </p>
      </div>

      <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        {patterns.map((pat, idx) => (
          <div
            key={idx}
            className="p-4 rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/40 via-white to-slate-50/50 shadow-xs space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-200">
                  {pat.pattern_type.replace(/_/g, ' ')}
                </span>
                <h4 className="text-sm font-bold text-slate-900 mt-1">{pat.title}</h4>
              </div>
              <span className="text-xs font-black text-amber-700 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200/80 shrink-0">
                {pat.supporting_purchase_count} Events
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">{pat.description}</p>

            {/* Affected Members & Products */}
            <div className="space-y-1.5 text-[11px] pt-2 border-t border-amber-100">
              {pat.affected_members.length > 0 && (
                <div className="flex items-center gap-1.5 text-slate-700">
                  <User className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>
                    Affecting configured requirements for: <strong className="text-slate-900">{pat.affected_members.join(', ')}</strong>
                  </span>
                </div>
              )}

              {pat.supporting_product_names.length > 0 && (
                <div className="flex items-center gap-1.5 text-slate-600">
                  <Package className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate">
                    Observed in: <span className="font-semibold">{pat.supporting_product_names.join(', ')}</span>
                  </span>
                </div>
              )}
            </div>

            {/* Actionable Review Box */}
            <div className="p-2.5 rounded-xl bg-white border border-amber-200/60 text-xs text-amber-900 flex items-start justify-between gap-2">
              <div>
                <span className="font-bold text-amber-950 block">Actionable Guidance:</span>
                <span>{pat.actionable_review}</span>
              </div>
              {pat.sample_finding_id && (
                <button
                  onClick={() => onOpenFindingExplanation(pat.sample_finding_id!)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 shrink-0 transition-colors"
                >
                  <Sparkles className="w-3 h-3 text-indigo-500" />
                  <span>Trace</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
