import React from 'react';
import { FileText, Calendar, CheckCircle2, AlertTriangle, ShieldAlert, Package, Printer } from 'lucide-react';
import { MonthlyFamilyReportResponse } from '../../types/history';

interface MonthlyFamilyReportProps {
  report: MonthlyFamilyReportResponse;
}

export const MonthlyFamilyReport: React.FC<MonthlyFamilyReportProps> = ({ report }) => {
  return (
    <div className="card overflow-hidden border-2 border-slate-200">
      {/* Report Header */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold uppercase tracking-wider mb-2">
            <FileText className="w-3 h-3" />
            <span>Official Household Summary</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">Family Grocery Report</h2>
          <div className="text-xs text-slate-300 flex items-center gap-2 mt-1">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            <span>{report.month_name}</span>
            <span>•</span>
            <span>Generated {new Date(report.generated_at).toLocaleDateString()}</span>
          </div>
        </div>

        <button
          onClick={() => window.print()}
          className="self-start sm:self-center inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition-all"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print Summary</span>
        </button>
      </div>

      <div className="p-5 sm:p-6 space-y-6">
        {/* Core Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
            <div className="text-xs text-slate-500 font-medium">Receipts Analyzed</div>
            <div className="text-xl font-black text-slate-900 mt-1">{report.receipts_analyzed}</div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
            <div className="text-xs text-slate-500 font-medium">Purchased Products</div>
            <div className="text-xl font-black text-slate-900 mt-1">{report.purchased_products}</div>
          </div>
          <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-100">
            <div className="text-xs text-emerald-700 font-medium">Matched & Analyzed</div>
            <div className="text-xl font-black text-emerald-900 mt-1">{report.products_successfully_matched}</div>
          </div>
          <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-100">
            <div className="text-xs text-amber-700 font-medium">Requiring Review</div>
            <div className="text-xl font-black text-amber-900 mt-1">{report.products_requiring_review}</div>
          </div>
        </div>

        {/* Findings Summary */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Family Food Safety Findings</h4>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-2 rounded-lg bg-rose-100/60 text-rose-900">
              <div className="text-lg font-black">{report.high_attention_count}</div>
              <div className="text-[11px] font-semibold">High Attention</div>
            </div>
            <div className="p-2 rounded-lg bg-amber-100/60 text-amber-900">
              <div className="text-lg font-black">{report.potential_conflict_count}</div>
              <div className="text-[11px] font-semibold">Potential Conflicts</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-200/70 text-slate-800">
              <div className="text-lg font-black">{report.verification_required_count}</div>
              <div className="text-[11px] font-semibold">Verification Required</div>
            </div>
          </div>
        </div>

        {/* Top Recurring Patterns */}
        {report.top_recurring_patterns.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Top Recurring Grocery Patterns</h4>
            <div className="space-y-1.5">
              {report.top_recurring_patterns.map((pat, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200/70 text-xs text-amber-950 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  <span className="font-semibold">{pat}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Most Recurring Products */}
        {report.most_recurring_products.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Most Recurring Purchased Products</h4>
            <div className="divide-y divide-slate-100 border border-slate-200/70 rounded-xl overflow-hidden">
              {report.most_recurring_products.map((prod, i) => (
                <div key={i} className="p-3 bg-white flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-slate-900">{prod.product_name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500">{prod.purchase_count} purchases</span>
                    <span className="font-semibold text-slate-900">₹{prod.total_spend.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mandatory Disclaimer */}
        <div className="p-3.5 bg-slate-100 rounded-xl text-[11px] text-slate-600 leading-relaxed border border-slate-200">
          <strong className="text-slate-800">Safety Notice: </strong>
          {report.disclaimer}
        </div>
      </div>
    </div>
  );
};
