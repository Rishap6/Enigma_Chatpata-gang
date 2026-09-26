import React from 'react';
import { ProductFamilyImpactItem, RiskFinding } from '../../types';
import { RiskStatusBadge } from './RiskStatusBadge';

interface ProductImpactPanelProps {
  impactedMembers: ProductFamilyImpactItem[];
  onViewFinding?: (finding: RiskFinding) => void;
}

export const ProductImpactPanel: React.FC<ProductImpactPanelProps> = ({
  impactedMembers,
  onViewFinding,
}) => {
  if (!impactedMembers || impactedMembers.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 mt-6 shadow-xl">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <span>👨‍👩‍👧‍👦</span>
            <span>Family Grocery Risk Impact</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Personalized evaluation against your configured family requirements.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {impactedMembers.map((item) => {
          const topFinding = item.top_finding || item.findings[0];
          return (
            <div
              key={item.member_id}
              className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/40 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm text-slate-200">{item.member_name}</span>
                  <RiskStatusBadge status={item.status} size="sm" />
                </div>

                {topFinding && topFinding.status !== 'no_configured_conflict' ? (
                  <div>
                    <p className="text-xs font-medium text-slate-300 line-clamp-1">
                      {topFinding.title}
                    </p>
                    {topFinding.trigger_text && (
                      <p className="text-[11px] text-sky-400 mt-1 line-clamp-1">
                        Trigger: {topFinding.trigger_text}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">
                    No configured conflict detected.
                  </p>
                )}
              </div>

              {topFinding && topFinding.status !== 'no_configured_conflict' && onViewFinding && (
                <button
                  type="button"
                  onClick={() => onViewFinding(topFinding)}
                  className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 font-medium text-left flex items-center gap-1"
                >
                  <span>Why? View Evidence</span>
                  <span>→</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
