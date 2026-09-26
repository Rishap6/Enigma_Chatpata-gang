import React from 'react';
import {
  Receipt,
  Package,
  Repeat,
  ShieldAlert,
  HelpCircle,
  TrendingUp,
  Info,
} from 'lucide-react';
import { HistoricalSummaryResponse } from '../../types/history';

interface HistoricalSummaryCardsProps {
  summary: HistoricalSummaryResponse;
}

export const HistoricalSummaryCards: React.FC<HistoricalSummaryCardsProps> = ({ summary }) => {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Total Receipts */}
        <div className="card-subtle p-4 sm:p-5 flex items-center gap-3.5 bg-gradient-to-br from-white to-slate-50/50">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 leading-none">
              {summary.total_receipts}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1">Receipts Analyzed</div>
          </div>
        </div>

        {/* Total Products & Spend */}
        <div className="card-subtle p-4 sm:p-5 flex items-center gap-3.5 bg-gradient-to-br from-white to-slate-50/50">
          <div className="w-11 h-11 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 border border-teal-100">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 leading-none">
              {summary.total_purchased_products}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1">
              Purchased ({summary.currency} {summary.total_spend.toLocaleString()})
            </div>
          </div>
        </div>

        {/* Unique & Recurring Products */}
        <div className="card-subtle p-4 sm:p-5 flex items-center gap-3.5 bg-gradient-to-br from-white to-slate-50/50">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
            <Repeat className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 leading-none">
              {summary.recurring_products_count}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1">
              Recurring ({summary.total_unique_products} Unique)
            </div>
          </div>
        </div>

        {/* High Attention Events */}
        <div className="card-subtle p-4 sm:p-5 flex items-center gap-3.5 bg-gradient-to-br from-white to-rose-50/30">
          <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 leading-none">
              {summary.high_attention_count}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1">High Attention Events</div>
          </div>
        </div>

        {/* Verification Required Events */}
        <div className="card-subtle p-4 sm:p-5 flex items-center gap-3.5 bg-gradient-to-br from-white to-amber-50/30">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 leading-none">
              {summary.verification_required_count}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1">Requires Verification</div>
          </div>
        </div>
      </div>

      {/* Mandatory Non-Consumption Disclaimer Banner */}
      <div className="p-3 bg-slate-100/70 rounded-xl border border-slate-200/80 flex items-start gap-2.5 text-xs text-slate-600">
        <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-700">Safety & Decision-Support Notice: </span>
          Receipt history indicates grocery products purchased for the household, not individual food consumed or clinical exposure. Always inspect physical packaging before consumption.
        </div>
      </div>
    </div>
  );
};
