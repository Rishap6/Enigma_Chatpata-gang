import React from 'react';
import { RiskFinding } from '../../types';
import { RiskStatusBadge } from './RiskStatusBadge';

interface RiskFindingCardProps {
  finding: RiskFinding;
  onViewExplanation: (finding: RiskFinding) => void;
}

export const RiskFindingCard: React.FC<RiskFindingCardProps> = ({
  finding,
  onViewExplanation,
}) => {
  const isNoConflict = finding.status === 'no_configured_conflict';
  const chain = finding.explainability?.chain || finding.ingredient_path?.map((p) => p.ingredient_name);

  return (
    <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-slate-700 transition flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <RiskStatusBadge status={finding.status} size="sm" />
          <span className="text-[11px] text-slate-500 font-mono">
            {finding.risk_type.replace(/_/g, ' ')}
          </span>
        </div>

        <h4 className="text-sm font-bold text-slate-100 mb-1">
          {finding.product_name || 'Grocery Product'}
        </h4>

        <div className="text-xs text-slate-400 mb-2">
          <span className="text-slate-500">For: </span>
          <span className="text-slate-300 font-medium">{finding.member_name}</span>
          <span className="mx-1 text-slate-600">•</span>
          <span className="text-slate-400">{finding.matched_rule}</span>
        </div>

        {finding.trigger_text && (
          <div className="mb-2">
            <span className="text-[11px] text-slate-400">Trigger: </span>
            <span className="text-xs font-semibold text-sky-400 bg-sky-950/40 px-2 py-0.5 rounded border border-sky-900/40">
              {finding.trigger_text}
            </span>
          </div>
        )}

        <p className="text-xs text-slate-300 line-clamp-2 mb-3">
          {finding.reason || finding.summary}
        </p>

        {/* Small chain preview if derived */}
        {chain && chain.length > 1 && (
          <div className="text-[11px] font-mono text-slate-400 bg-slate-950/40 px-2.5 py-1.5 rounded-lg border border-slate-800/80 mb-3 truncate">
            {chain.join(' → ')}
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
        <span className="text-[11px] text-slate-500">
          Confidence: {Math.round((finding.confidence ?? 0.95) * 100)}%
        </span>
        <button
          type="button"
          onClick={() => onViewExplanation(finding)}
          className={`text-xs font-medium flex items-center gap-1 transition cursor-pointer ${
            isNoConflict
              ? 'text-emerald-400 hover:text-emerald-300'
              : 'text-indigo-400 hover:text-indigo-300'
          }`}
          data-testid="why-flagged-btn"
        >
          <span>{isNoConflict ? 'Why no conflict?' : 'Why was this flagged?'}</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
};
