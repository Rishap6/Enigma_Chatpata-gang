import React from 'react';
import { User, ShieldAlert, AlertCircle, HelpCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { MemberHistoryResponse } from '../../types/history';

interface MemberHistoryImpactProps {
  memberData: MemberHistoryResponse;
  onOpenFindingExplanation: (findingId: string) => void;
}

export const MemberHistoryImpact: React.FC<MemberHistoryImpactProps> = ({
  memberData,
  onOpenFindingExplanation,
}) => {
  return (
    <div className="card overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-slate-200/80">
        <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <User className="w-4 h-4 text-emerald-600" />
          <span>Member Historical Purchase Impact</span>
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          How purchased grocery items matched each individual member's configured food safety requirements.
        </p>
      </div>

      <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        {memberData.members.map((mem) => {
          const hasAttention = mem.products_requiring_attention > 0;
          const hasConflict = mem.potential_conflicts > 0;
          const hasVerif = mem.verification_required_products > 0;

          return (
            <div
              key={mem.member_id}
              className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/40 hover:bg-white hover:shadow-xs transition-all space-y-3"
            >
              {/* Member Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs border border-emerald-200">
                    {mem.member_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 leading-tight">{mem.member_name}</h4>
                    {mem.relationship && (
                      <span className="text-[11px] text-slate-400 font-medium">{mem.relationship}</span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold text-slate-900">{mem.total_purchases_analyzed}</span>
                  <span className="text-[10px] text-slate-400 block leading-tight">Purchases Analyzed</span>
                </div>
              </div>

              {/* Status Counters */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 rounded-xl bg-rose-50/70 border border-rose-100 text-center">
                  <div className="text-sm font-black text-rose-700">{mem.products_requiring_attention}</div>
                  <div className="text-[10px] text-rose-600 font-medium">High Attention</div>
                </div>
                <div className="p-2 rounded-xl bg-amber-50/70 border border-amber-100 text-center">
                  <div className="text-sm font-black text-amber-700">{mem.potential_conflicts}</div>
                  <div className="text-[10px] text-amber-600 font-medium">Conflicts</div>
                </div>
                <div className="p-2 rounded-xl bg-slate-100/70 border border-slate-200/60 text-center">
                  <div className="text-sm font-black text-slate-700">{mem.verification_required_products}</div>
                  <div className="text-[10px] text-slate-500 font-medium">Verification</div>
                </div>
              </div>

              {/* Recurring Allergens */}
              {mem.recurring_allergens.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[11px] font-bold text-slate-700">Recurring Allergen Requirements:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {mem.recurring_allergens.map((alg, i) => (
                      <button
                        key={i}
                        onClick={() => alg.sample_finding_id && onOpenFindingExplanation(alg.sample_finding_id)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-[11px] font-semibold transition-colors"
                      >
                        <span>{alg.requirement_name}</span>
                        <span className="text-[9px] bg-rose-200/70 px-1 rounded-sm">{alg.occurrences}x</span>
                        {alg.sample_finding_id && <Sparkles className="w-2.5 h-2.5 text-rose-500" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Recurring Dietary & Exclusions */}
              {(mem.recurring_dietary_conflicts.length > 0 || mem.recurring_ingredient_exclusions.length > 0) && (
                <div className="space-y-1">
                  <div className="text-[11px] font-bold text-slate-700">Dietary & Exclusions:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {mem.recurring_dietary_conflicts.map((diet, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-semibold">
                        {diet.requirement_name} ({diet.occurrences}x)
                      </span>
                    ))}
                    {mem.recurring_ingredient_exclusions.map((excl, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-800 border border-indigo-200 text-[11px] font-semibold">
                        {excl.requirement_name} ({excl.occurrences}x)
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Recurring Source Uncertainties */}
              {mem.recurring_source_uncertainty.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[11px] font-bold text-slate-700">Source Verification Items:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {mem.recurring_source_uncertainty.map((unc, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-medium">
                        {unc.requirement_name} ({unc.occurrences}x)
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {mem.recurring_allergens.length === 0 && mem.recurring_dietary_conflicts.length === 0 && (
                <div className="text-[11px] text-slate-400 italic">No recurring conflicts found for this member in selected period.</div>
              )}
            </div>
          );
        })}
      </div>

      <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500">
        {memberData.disclaimer}
      </div>
    </div>
  );
};
