import React from 'react';
import { ShieldCheck, AlertTriangle, CheckCircle, HelpCircle } from 'lucide-react';
import { ReceiptCoverageSummary } from '../../types';

interface ReceiptCoverageCardProps {
  coverage: ReceiptCoverageSummary;
  readyForPhase6: boolean;
}

export const ReceiptCoverageCard: React.FC<ReceiptCoverageCardProps> = ({
  coverage,
  readyForPhase6,
}) => {
  const percentage = Math.round((coverage.coverage_ratio || 0) * 100);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Grocery Item Coverage
          </span>
          <h4 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mt-0.5">
            {percentage}% Products Identified
          </h4>
        </div>

        {readyForPhase6 ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            <ShieldCheck className="w-3.5 h-3.5" />
            Ready for family analysis
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            <AlertTriangle className="w-3.5 h-3.5" />
            {coverage.ambiguous + coverage.unknown} items need review
          </span>
        )}
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2.5 overflow-hidden mb-4">
        <div
          className={`h-2.5 rounded-full transition-all duration-500 ${
            percentage === 100
              ? 'bg-emerald-600'
              : percentage >= 70
              ? 'bg-emerald-500'
              : percentage >= 40
              ? 'bg-amber-500'
              : 'bg-red-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Metric Breakdown Badges */}
      <div className="grid grid-cols-4 gap-2 text-center pt-2 border-t border-zinc-100 dark:border-zinc-800">
        <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
          <span className="text-xs text-zinc-500 block">Total Items</span>
          <span className="text-base font-bold text-zinc-800 dark:text-zinc-200">
            {coverage.total_items}
          </span>
        </div>

        <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
          <span className="text-xs text-emerald-700 dark:text-emerald-400 flex items-center justify-center gap-1">
            <CheckCircle className="w-3 h-3" /> Matched
          </span>
          <span className="text-base font-bold text-emerald-800 dark:text-emerald-300">
            {coverage.matched}
          </span>
        </div>

        <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30">
          <span className="text-xs text-amber-700 dark:text-amber-400 flex items-center justify-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Ambiguous
          </span>
          <span className="text-base font-bold text-amber-800 dark:text-amber-300">
            {coverage.ambiguous}
          </span>
        </div>

        <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
          <span className="text-xs text-zinc-500 flex items-center justify-center gap-1">
            <HelpCircle className="w-3 h-3" /> Unknown
          </span>
          <span className="text-base font-bold text-zinc-700 dark:text-zinc-300">
            {coverage.unknown}
          </span>
        </div>
      </div>
    </div>
  );
};
