import React from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  DollarSign,
  Receipt as ReceiptIcon,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { Receipt } from '../../types';

interface ReceiptHistoryCardProps {
  receipt: Receipt;
}

export const ReceiptHistoryCard: React.FC<ReceiptHistoryCardProps> = ({ receipt }) => {
  const currency = receipt.currency === 'USD' ? '$' : '₹';
  const totalItems = receipt.items?.length || receipt.coverage?.total_items || 0;
  const matched = receipt.coverage?.matched ?? receipt.items?.filter((i) => i.product_id).length;
  const ambiguous = receipt.coverage?.ambiguous ?? receipt.items?.filter((i) => i.requires_selection).length;
  const unknown = receipt.coverage?.unknown ?? receipt.items?.filter((i) => !i.product_id && !i.requires_selection).length;

  const formattedDate = receipt.purchase_date
    ? new Date(receipt.purchase_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : new Date(receipt.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });

  return (
    <Link
      to={`/receipts/${receipt.id}`}
      className="block group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 hover:border-emerald-500 dark:hover:border-emerald-500 shadow-sm hover:shadow-md transition-all duration-200"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900 flex items-center justify-center shrink-0">
            <ReceiptIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-base text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                {receipt.original_filename || 'Grocery Receipt'}
              </h4>
              <span
                className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                  receipt.processing_status === 'processed'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : receipt.processing_status === 'partial'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                }`}
              >
                {receipt.processing_status}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {formattedDate}
              </span>
              {receipt.total_amount && (
                <span className="flex items-center gap-1 font-semibold text-zinc-700 dark:text-zinc-300">
                  <DollarSign className="w-3.5 h-3.5" />
                  {currency}{receipt.total_amount.toFixed(2)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Metric Summary & Arrow */}
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              {totalItems} Products
            </div>
            <div className="text-xs flex items-center gap-2 mt-0.5 justify-end">
              <span className="text-emerald-600 flex items-center gap-0.5">
                <CheckCircle2 className="w-3 h-3" /> {matched}
              </span>
              {(ambiguous > 0 || unknown > 0) && (
                <span className="text-amber-600 flex items-center gap-0.5">
                  <AlertTriangle className="w-3 h-3" /> {ambiguous + unknown} review
                </span>
              )}
            </div>
          </div>

          <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-zinc-400 group-hover:text-emerald-600 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-950/40 transition-colors">
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </Link>
  );
};
