import React from 'react';
import { ArrowLeftRight, TrendingUp, TrendingDown, Minus, CheckCircle } from 'lucide-react';
import { PeriodComparisonResponse } from '../../types/history';

interface PeriodComparisonCardProps {
  comparison: PeriodComparisonResponse;
  selectedPeriod: string;
  onPeriodChange: (period: string) => void;
}

export const PeriodComparisonCard: React.FC<PeriodComparisonCardProps> = ({
  comparison,
  selectedPeriod,
  onPeriodChange,
}) => {
  const { current_metrics, previous_metrics, changes, current_period_name, previous_period_name } = comparison;

  return (
    <div className="card p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-emerald-600" />
            <span>Period-over-Period Grocery Comparison</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Comparing <strong className="text-slate-800">{current_period_name}</strong> vs <strong className="text-slate-800">{previous_period_name}</strong>
          </p>
        </div>

        <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/70 text-xs">
          <button
            onClick={() => onPeriodChange('current_month')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
              selectedPeriod === 'current_month' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => onPeriodChange('30d')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
              selectedPeriod === '30d' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            30 Days
          </button>
          <button
            onClick={() => onPeriodChange('7d')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
              selectedPeriod === '7d' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            7 Days
          </button>
        </div>
      </div>

      {/* Metrics Comparison Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {/* Receipts */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 text-center">
          <div className="text-[11px] text-slate-500 font-medium">Receipts</div>
          <div className="text-base font-black text-slate-900 mt-0.5">
            {current_metrics.total_receipts} <span className="text-xs text-slate-400 font-normal">/ {previous_metrics.total_receipts}</span>
          </div>
        </div>

        {/* Matched Products */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 text-center">
          <div className="text-[11px] text-slate-500 font-medium">Matched Items</div>
          <div className="text-base font-black text-slate-900 mt-0.5">
            {current_metrics.matched_products} <span className="text-xs text-slate-400 font-normal">/ {previous_metrics.matched_products}</span>
          </div>
        </div>

        {/* Total Spend */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 text-center">
          <div className="text-[11px] text-slate-500 font-medium">Total Spend</div>
          <div className="text-base font-black text-slate-900 mt-0.5">
            ₹{current_metrics.total_spend.toLocaleString()}
          </div>
        </div>

        {/* High Attention */}
        <div className="p-3 rounded-xl bg-rose-50/50 border border-rose-100 text-center">
          <div className="text-[11px] text-rose-700 font-medium">High Attention</div>
          <div className="text-base font-black text-rose-900 mt-0.5">
            {current_metrics.high_attention_count} <span className="text-xs text-rose-400 font-normal">/ {previous_metrics.high_attention_count}</span>
          </div>
        </div>

        {/* Conflicts */}
        <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-100 text-center">
          <div className="text-[11px] text-amber-700 font-medium">Conflicts</div>
          <div className="text-base font-black text-amber-900 mt-0.5">
            {current_metrics.potential_conflict_count} <span className="text-xs text-amber-400 font-normal">/ {previous_metrics.potential_conflict_count}</span>
          </div>
        </div>

        {/* Verification */}
        <div className="p-3 rounded-xl bg-slate-100/60 border border-slate-200/60 text-center">
          <div className="text-[11px] text-slate-600 font-medium">Requires Verif</div>
          <div className="text-base font-black text-slate-800 mt-0.5">
            {current_metrics.verification_required_count} <span className="text-xs text-slate-400 font-normal">/ {previous_metrics.verification_required_count}</span>
          </div>
        </div>
      </div>

      {/* Observed Changes List */}
      <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/70 space-y-2">
        <div className="text-xs font-bold text-slate-700">Observed Variations:</div>
        <ul className="space-y-1.5 text-xs text-slate-600">
          {changes.map((ch, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
              <span>{ch}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
