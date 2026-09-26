import React from 'react';
import { ShieldCheck, AlertTriangle, CheckCircle2, HelpCircle } from 'lucide-react';
import { HistoricalCoverageResponse } from '../../types/history';

interface HistoricalCoverageCardProps {
  coverage: HistoricalCoverageResponse;
}

export const HistoricalCoverageCard: React.FC<HistoricalCoverageCardProps> = ({ coverage }) => {
  const isHigh = coverage.coverage_percentage >= 85;
  const isModerate = coverage.coverage_percentage >= 60 && coverage.coverage_percentage < 85;

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
            isHigh ? 'bg-emerald-50 text-emerald-600' : isModerate ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
          }`}>
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Historical Coverage & Data Quality</h3>
            <p className="text-xs text-slate-500">Analysis completeness across all scanned grocery items</p>
          </div>
        </div>

        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
          isHigh
            ? 'bg-emerald-100/70 text-emerald-800 border border-emerald-200'
            : isModerate
            ? 'bg-amber-100/70 text-amber-800 border border-amber-200'
            : 'bg-rose-100/70 text-rose-800 border border-rose-200'
        }`}>
          {coverage.data_quality_grade}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-700">Catalog Matched Rate</span>
          <span className="font-black text-slate-900">{coverage.coverage_percentage}%</span>
        </div>
        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
          <div
            className={`h-full transition-all duration-500 ${
              isHigh ? 'bg-emerald-500' : isModerate ? 'bg-amber-500' : 'bg-rose-500'
            }`}
            style={{ width: `${Math.min(100, Math.max(0, coverage.coverage_percentage))}%` }}
          />
        </div>
      </div>

      {/* Stats Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100">
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
          <div className="text-sm font-black text-slate-900">{coverage.matched_products}</div>
          <div className="text-[11px] text-slate-500 font-medium">Matched Products</div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
          <div className="text-sm font-black text-amber-600">{coverage.unresolved_products}</div>
          <div className="text-[11px] text-slate-500 font-medium">Unresolved Items</div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
          <div className="text-sm font-black text-slate-900">{coverage.products_with_ingredients}</div>
          <div className="text-[11px] text-slate-500 font-medium">Verified Ingredients</div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
          <div className="text-sm font-black text-slate-900">{coverage.receipts_successfully_processed}</div>
          <div className="text-[11px] text-slate-500 font-medium">Receipts Processed</div>
        </div>
      </div>

      {coverage.warning_message && (
        <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200/80 flex items-start gap-2 text-xs text-amber-800">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>{coverage.warning_message} Missing products are not treated as safe.</div>
        </div>
      )}
    </div>
  );
};
