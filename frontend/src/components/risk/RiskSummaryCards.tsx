import React from 'react';
import { RiskAnalysisSummary } from '../../types';

interface RiskSummaryCardsProps {
  summary: RiskAnalysisSummary;
  onFilterChange?: (status: string | null) => void;
  activeFilter?: string | null;
}

export const RiskSummaryCards: React.FC<RiskSummaryCardsProps> = ({
  summary,
  onFilterChange,
  activeFilter,
}) => {
  const cards = [
    {
      id: 'high_attention',
      title: 'High Attention',
      count: summary.high_priority,
      icon: '🔴',
      colorClass: 'text-red-400 border-red-500/20 bg-red-950/20 hover:bg-red-950/30',
      activeClass: 'ring-2 ring-red-500',
      description: 'Direct allergens, exclusions, or dietary conflicts',
    },
    {
      id: 'potential_conflict',
      title: 'Potential Conflicts',
      count: summary.potential_conflicts,
      icon: '🟠',
      colorClass: 'text-amber-400 border-amber-500/20 bg-amber-950/20 hover:bg-amber-950/30',
      activeClass: 'ring-2 ring-amber-500',
      description: 'Cross-contact warnings & nutrition preferences',
    },
    {
      id: 'verification_required',
      title: 'Require Verification',
      count: summary.verification_required,
      icon: '🟡',
      colorClass: 'text-yellow-300 border-yellow-500/20 bg-yellow-950/20 hover:bg-yellow-950/30',
      activeClass: 'ring-2 ring-yellow-500',
      description: 'Dual-source additives (e.g. INS 471) or unverified data',
    },
    {
      id: 'no_configured_conflict',
      title: 'No Configured Conflict',
      count: summary.no_configured_conflict,
      icon: '🟢',
      colorClass: 'text-emerald-400 border-emerald-500/20 bg-emerald-950/20 hover:bg-emerald-950/30',
      activeClass: 'ring-2 ring-emerald-500',
      description: 'No match with currently configured requirements',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((card) => {
        const isActive = activeFilter === card.id;
        return (
          <button
            key={card.id}
            type="button"
            onClick={() => onFilterChange && onFilterChange(isActive ? null : card.id)}
            className={`p-3.5 rounded-xl border text-left transition-all ${card.colorClass} ${
              isActive ? card.activeClass : ''
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xl">{card.icon}</span>
              <span className="text-2xl font-bold">{card.count}</span>
            </div>
            <div className="text-sm font-semibold truncate">{card.title}</div>
            <p className="text-xs text-slate-400 mt-1 line-clamp-1">{card.description}</p>
          </button>
        );
      })}
    </div>
  );
};
