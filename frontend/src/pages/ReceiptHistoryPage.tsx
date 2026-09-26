import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Receipt as ReceiptIcon,
  Plus,
  Loader2,
  Calendar,
  ShieldCheck,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { receiptService } from '../services/receiptService';
import { ReceiptHistoryCard } from '../components/receipts/ReceiptHistoryCard';

export const ReceiptHistoryPage: React.FC = () => {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['receipts-list'],
    queryFn: () => receiptService.getReceipts({ page: 1, page_size: 50 }),
  });

  const receipts = data?.items || [];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Header & Primary CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Grocery Intelligence
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight mt-0.5">
            Grocery Receipts
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Track and review purchased household products extracted automatically from your paper receipts.
          </p>
        </div>

        <Link
          to="/receipt/upload"
          className="inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm hover:shadow-emerald-900/20 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          Upload Grocery Receipt
        </Link>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="py-20 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600 mb-3" />
          <p className="text-sm text-zinc-500">Loading grocery receipts...</p>
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="p-6 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-center max-w-md mx-auto my-12">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-2" />
          <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">Failed to load receipts</h3>
          <p className="text-xs text-zinc-500 mt-1 mb-4">
            {(error as Error)?.message || 'Unable to communicate with the receipt service.'}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="px-4 py-2 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-semibold"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && receipts.length === 0 && (
        <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center max-w-lg mx-auto my-8 bg-zinc-50/50 dark:bg-zinc-900/40">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900 flex items-center justify-center mx-auto mb-4 text-emerald-600 dark:text-emerald-400">
            <ReceiptIcon className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-1">
            No Grocery Receipts Yet
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto mb-6">
            Upload your first paper grocery receipt. The intelligence engine will segment line items, extract prices, and match them with food allergens.
          </p>
          <Link
            to="/receipt/upload"
            className="inline-flex items-center gap-2 py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Upload Your First Receipt
          </Link>
        </div>
      )}

      {/* Receipts List */}
      {!isLoading && !isError && receipts.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-zinc-500 pb-2 border-b border-zinc-100 dark:border-zinc-800">
            <span>{receipts.length} Grocery Receipts Logged</span>
            <span>Chronological order</span>
          </div>

          <div className="grid grid-cols-1 gap-3.5">
            {receipts.map((rcpt) => (
              <ReceiptHistoryCard key={rcpt.id} receipt={rcpt} />
            ))}
          </div>
        </div>
      )}

      {/* Phase 6 Bridge Informational Footer */}
      <div className="mt-12 p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 text-xs text-emerald-900 dark:text-emerald-300 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
        <div>
          <span className="font-semibold block mb-0.5">
            Phase 5 Purchase Semantics Foundation
          </span>
          Receipt items represent verified household grocery purchases. Once items are reviewed and confirmed, this clean purchase dataset will feed directly into the Phase 6 Family Risk Engine to compare against every member&apos;s allergies and dietary rules.
        </div>
      </div>
    </div>
  );
};
