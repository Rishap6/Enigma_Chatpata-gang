import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Receipt, ChevronRight, ShieldAlert, AlertTriangle, CheckCircle2, HelpCircle } from 'lucide-react';
import { TimelineEvent } from '../../types/history';

interface PurchaseHistoryTimelineProps {
  timeline: TimelineEvent[];
}

export const PurchaseHistoryTimeline: React.FC<PurchaseHistoryTimelineProps> = ({ timeline }) => {
  if (timeline.length === 0) {
    return (
      <div className="card p-8 text-center text-slate-400 text-xs italic">
        No receipt purchase records available in this period.
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-slate-200/80">
        <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-600" />
          <span>Purchase History Timeline</span>
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Chronological record of scanned receipts and evaluated food safety statuses.
        </p>
      </div>

      <div className="p-4 sm:p-6 space-y-4">
        {timeline.map((event, idx) => {
          const dateStr = event.purchase_date
            ? new Date(event.purchase_date).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : 'Undated Purchase';

          const hasAttention = event.high_attention_count > 0;
          const hasConflict = event.potential_conflict_count > 0;
          const hasVerif = event.verification_required_count > 0;

          return (
            <div
              key={event.receipt_id}
              className="flex items-start gap-4 group p-3 sm:p-4 rounded-xl border border-slate-200/70 hover:border-slate-300 hover:bg-slate-50/50 transition-all"
            >
              {/* Receipt Icon / Date Badge */}
              <div className="w-12 h-12 rounded-2xl bg-slate-100 group-hover:bg-emerald-50 text-slate-600 group-hover:text-emerald-700 flex flex-col items-center justify-center shrink-0 border border-slate-200/80 transition-colors">
                <Receipt className="w-4 h-4" />
                <span className="text-[9px] font-black uppercase mt-0.5 tracking-wider">
                  {event.total_products} items
                </span>
              </div>

              {/* Event Content */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <span className="font-bold text-slate-900 text-sm">{dateStr}</span>
                    <span className="text-xs text-slate-400 ml-2 font-mono">
                      Receipt #{event.receipt_id.slice(0, 8)}
                    </span>
                  </div>
                  {event.total_amount !== null && event.total_amount !== undefined && (
                    <span className="text-xs font-bold text-slate-700">
                      ₹{event.total_amount.toLocaleString()} {event.currency}
                    </span>
                  )}
                </div>

                {/* Status Badges */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  {hasAttention && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                      <ShieldAlert className="w-2.5 h-2.5" />
                      {event.high_attention_count} High Attention
                    </span>
                  )}
                  {hasConflict && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      {event.potential_conflict_count} Conflicts
                    </span>
                  )}
                  {hasVerif && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      <HelpCircle className="w-2.5 h-2.5" />
                      {event.verification_required_count} Verification
                    </span>
                  )}
                  {event.no_configured_conflict_count > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      {event.no_configured_conflict_count} No Conflict
                    </span>
                  )}
                </div>
              </div>

              {/* Action Link */}
              <div className="shrink-0 flex items-center gap-1 self-center">
                <Link
                  to={`/risk/receipts/${event.receipt_id}`}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold border border-emerald-200 inline-flex items-center gap-1 transition-colors"
                >
                  <span>View Risk</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
