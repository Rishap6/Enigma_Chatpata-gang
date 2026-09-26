import React, { useState } from 'react';
import {
  Calendar,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  PlusCircle,
  Loader2,
} from 'lucide-react';
import { Receipt, ReceiptCoverageSummary } from '../../types';

interface ReceiptSummaryProps {
  receipt: Receipt;
  coverage: ReceiptCoverageSummary;
  onConfirmList: () => Promise<void>;
  onAddManualItem: (data: { product_name: string; quantity: number; price?: number }) => Promise<void>;
  isConfirming?: boolean;
}

export const ReceiptSummary: React.FC<ReceiptSummaryProps> = ({
  receipt,
  coverage,
  onConfirmList,
  onAddManualItem,
  isConfirming = false,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualQty, setManualQty] = useState('1');
  const [manualPrice, setManualPrice] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const currency = receipt.currency === 'USD' ? '$' : '₹';
  const hasUnresolved = coverage.ambiguous > 0 || coverage.unknown > 0;
  const isProcessed = receipt.processing_status === 'processed';

  const handleManualAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim()) return;
    setIsAdding(true);
    try {
      await onAddManualItem({
        product_name: manualName.trim(),
        quantity: parseFloat(manualQty) || 1,
        price: manualPrice ? parseFloat(manualPrice) : undefined,
      });
      setManualName('');
      setManualQty('1');
      setManualPrice('');
      setShowAddModal(false);
    } finally {
      setIsAdding(false);
    }
  };

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
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Grocery Receipt Summary
          </span>
          <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mt-0.5">
            {receipt.original_filename || 'Grocery Receipt'}
          </h3>
          <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {formattedDate}
            </span>
            {receipt.total_amount && (
              <span className="flex items-center gap-1 font-semibold text-zinc-700 dark:text-zinc-300">
                <DollarSign className="w-3.5 h-3.5" />
                Total: {currency}{receipt.total_amount.toFixed(2)}
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-medium transition-colors flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            Add Item Manually
          </button>

          <button
            type="button"
            onClick={onConfirmList}
            disabled={isConfirming || isProcessed}
            className={`px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 ${
              isProcessed
                ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-900/10'
            }`}
          >
            {isConfirming ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            {isProcessed ? 'Grocery List Confirmed' : 'Confirm Grocery List'}
          </button>
        </div>
      </div>

      {/* Warning banner if unresolved items remain */}
      {hasUnresolved && !isProcessed && (
        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>
            {coverage.ambiguous + coverage.unknown} items are unresolved. You can confirm now with partial coverage or resolve them for complete Phase 6 family analysis.
          </span>
        </div>
      )}

      {/* Manual Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-1">
              Add Item Manually
            </h4>
            <p className="text-xs text-zinc-500 mb-4">
              Enter grocery item details. The system will match it against our food catalog.
            </p>

            <form onSubmit={handleManualAddSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Product / Brand Name *
                </label>
                <input
                  type="text"
                  required
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="e.g. Britannia NutriChoice"
                  className="w-full px-3 py-2 text-sm border rounded-xl bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.5"
                    value={manualQty}
                    onChange={(e) => setManualQty(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-xl bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Price ({currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={manualPrice}
                    onChange={(e) => setManualPrice(e.target.value)}
                    placeholder="40.00"
                    className="w-full px-3 py-2 text-sm border rounded-xl bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdding || !manualName.trim()}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5"
                >
                  {isAdding && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Add to Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
