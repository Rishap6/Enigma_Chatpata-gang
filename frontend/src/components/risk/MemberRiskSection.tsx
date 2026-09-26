import React from 'react';
import { MemberRiskResponse, RiskFinding } from '../../types';
import { RiskFindingCard } from './RiskFindingCard';

interface MemberRiskSectionProps {
  members: MemberRiskResponse[];
  selectedMemberId: string | null;
  onSelectMember: (memberId: string) => void;
  onViewExplanation: (finding: RiskFinding) => void;
}

export const MemberRiskSection: React.FC<MemberRiskSectionProps> = ({
  members,
  selectedMemberId,
  onSelectMember,
  onViewExplanation,
}) => {
  const activeMember = members.find((m) => m.member_id === selectedMemberId) || members[0];

  return (
    <div className="space-y-4">
      {/* Member Selector Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {members.map((m) => {
          const isSelected = activeMember && activeMember.member_id === m.member_id;
          const hasHigh = m.summary.high > 0;
          const hasPotential = m.summary.potential > 0;

          return (
            <button
              key={m.member_id}
              type="button"
              onClick={() => onSelectMember(m.member_id)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-medium transition ${
                isSelected
                  ? 'bg-indigo-950/60 border-indigo-500/50 text-white shadow-md'
                  : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
              }`}
            >
              <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                {m.member_name.charAt(0)}
              </div>
              <span>{m.member_name}</span>
              <div className="flex items-center gap-1 text-xs">
                {hasHigh && (
                  <span className="px-1.5 py-0.2 rounded-full bg-red-500/20 text-red-400 font-bold">
                    🔴 {m.summary.high}
                  </span>
                )}
                {hasPotential && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-400 font-bold">
                    🟠 {m.summary.potential}
                  </span>
                )}
                {!hasHigh && !hasPotential && (
                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400">
                    🟢
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Member Findings */}
      {activeMember && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>{activeMember.member_name}&apos;s Results</span>
              <span className="text-xs font-normal text-slate-400">
                ({activeMember.product_results.length} products evaluated)
              </span>
            </h3>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-red-400 font-semibold">🔴 {activeMember.summary.high} High</span>
              <span className="text-amber-400 font-semibold">🟠 {activeMember.summary.potential} Potential</span>
              <span className="text-yellow-300 font-semibold">🟡 {activeMember.summary.verification} Verify</span>
              <span className="text-emerald-400 font-semibold">🟢 {activeMember.summary.no_conflict} Clear</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeMember.product_results.map((finding, idx) => (
              <RiskFindingCard
                key={idx}
                finding={finding}
                onViewExplanation={onViewExplanation}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
