import React from 'react';
import { Sparkles, AlertOctagon, CheckCircle2, UserCheck, PackageSearch } from 'lucide-react';
import { RiskAnalysisResponse } from '../../types';

interface FamilyRiskInsightsProps {
  analysis: RiskAnalysisResponse;
  className?: string;
  onFilterStatus?: (status: string) => void;
}

export const FamilyRiskInsights: React.FC<FamilyRiskInsightsProps> = ({
  analysis,
  className = '',
  onFilterStatus,
}) => {
  const summary = analysis.summary;
  const members = analysis.members || [];

  // Identify members affected by high_attention or potential_conflict
  const affectedMembers = members.filter(
    (m) => m.summary.high > 0 || m.summary.potential > 0
  );

  // Collect repeated triggers across all findings
  const triggerCounts: Record<string, number> = {};
  for (const m of members) {
    for (const f of m.product_results) {
      if (f.status !== 'no_configured_conflict' && f.trigger_text) {
        triggerCounts[f.trigger_text] = (triggerCounts[f.trigger_text] || 0) + 1;
      }
    }
  }

  const topTriggers = Object.entries(triggerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const hasHigh = summary.high_priority > 0;
  const hasVerification = summary.verification_required > 0;

  return (
    <div
      className={`rounded-2xl p-5 border text-xs shadow-lg transition-all ${
        hasHigh
          ? 'bg-gradient-to-br from-rose-950/40 via-slate-900 to-slate-900 border-rose-500/30 text-rose-100'
          : hasVerification
          ? 'bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-900 border-amber-500/30 text-amber-100'
          : 'bg-gradient-to-br from-emerald-950/30 via-slate-900 to-slate-900 border-emerald-500/30 text-emerald-100'
      } ${className}`}
      data-testid="family-risk-insights"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-white/10 text-white shrink-0">
            <Sparkles className="w-4 h-4 text-sky-300" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Family Food Safety Insights & Basket Summary</span>
            </h3>
            <p className="text-[11px] text-slate-300">
              Evaluated {summary.products_analyzed} purchased items against {summary.members_analyzed} family members
            </p>
          </div>
        </div>

        {hasHigh && onFilterStatus && (
          <button
            type="button"
            onClick={() => onFilterStatus('high_attention')}
            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition shadow-sm cursor-pointer"
          >
            Review {summary.high_priority} High Attention Items
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-4">
        {/* Card 1: Family Member Impact */}
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/5 space-y-1.5">
          <div className="flex items-center gap-1.5 text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
            <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>Impacted Members</span>
          </div>
          {affectedMembers.length > 0 ? (
            <div>
              <p className="font-semibold text-slate-100">
                {affectedMembers.map((m) => m.member_name).join(', ')}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                {affectedMembers.length} member{affectedMembers.length > 1 ? 's' : ''} have items in this grocery run conflicting with their configured profiles.
              </p>
            </div>
          ) : (
            <div>
              <p className="font-semibold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> All Profiles Clear
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                No configured allergens or strict dietary rule conflicts were detected for any family member.
              </p>
            </div>
          )}
        </div>

        {/* Card 2: Frequent Trigger Ingredients */}
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/5 space-y-1.5">
          <div className="flex items-center gap-1.5 text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
            <AlertOctagon className="w-3.5 h-3.5 text-amber-400" />
            <span>Frequent Basket Triggers</span>
          </div>
          {topTriggers.length > 0 ? (
            <div className="space-y-1">
              <div className="flex flex-wrap gap-1.5">
                {topTriggers.map(([trig, count], idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 text-[11px] font-mono"
                  >
                    {trig} ({count}x)
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Repeated across multiple items. Traced through direct label text and derivation relationships.
              </p>
            </div>
          ) : (
            <p className="text-[11px] text-slate-400">
              No recurrent trigger ingredients detected across purchased items.
            </p>
          )}
        </div>

        {/* Card 3: Packaging Verification Checklist */}
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/5 space-y-1.5">
          <div className="flex items-center gap-1.5 text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
            <PackageSearch className="w-3.5 h-3.5 text-sky-400" />
            <span>Pre-Serving Guidance</span>
          </div>
          <p className="text-slate-300 leading-relaxed text-[11px]">
            {summary.verification_required > 0
              ? `Check ${summary.verification_required} items for green vegetarian dots or manufacturer batch seals before unpacking.`
              : 'Inspect back-panel allergen disclaimers on physical items before serving, particularly for shared-facility items.'}
          </p>
        </div>
      </div>
    </div>
  );
};
