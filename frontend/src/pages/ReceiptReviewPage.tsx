import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  Receipt as ReceiptIcon,
  Image as ImageIcon,
  CheckCircle2,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { receiptService } from '../services/receiptService';
import { ReceiptItemCard } from '../components/receipts/ReceiptItemCard';
import { ReceiptSummary } from '../components/receipts/ReceiptSummary';
import { ReceiptCoverageCard } from '../components/receipts/ReceiptCoverageCard';
import { ReceiptRawTextPanel } from '../components/receipts/ReceiptRawTextPanel';
import { ReceiptItemResolutionModal } from '../components/receipts/ReceiptItemResolutionModal';
import { ReceiptItem, ReceiptCoverageSummary } from '../types';

export const ReceiptReviewPage: React.FC = () => {
  const { receiptId } = useParams<{ receiptId: string }>();
  const queryClient = useQueryClient();

  const [filterTab, setFilterTab] = useState<'all' | 'needs_review' | 'matched'>('all');
  const [activeResolvingItem, setActiveResolvingItem] = useState<ReceiptItem | null>(null);
  const [resolutionTab, setResolutionTab] = useState<'candidates' | 'search' | 'barcode'>('candidates');
  const [isResolutionOpen, setIsResolutionOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // 1. Fetch Receipt details & items
  const {
    data: receipt,
    isLoading: isLoadingReceipt,
    isError: isErrorReceipt,
    error: receiptError,
    refetch: refetchReceipt,
  } = useQuery({
    queryKey: ['receipt', receiptId],
    queryFn: () => (receiptId ? receiptService.getReceipt(receiptId) : Promise.reject('No ID')),
    enabled: Boolean(receiptId),
  });

  // 2. Fetch Structured Analysis (Phase 6 handoff dataset)
  const { data: analysis, refetch: refetchAnalysis } = useQuery({
    queryKey: ['receipt-analysis', receiptId],
    queryFn: () => (receiptId ? receiptService.getReceiptAnalysis(receiptId) : Promise.reject('No ID')),
    enabled: Boolean(receiptId),
  });

  const refreshAll = () => {
    refetchReceipt();
    refetchAnalysis();
    queryClient.invalidateQueries({ queryKey: ['receipt', receiptId] });
  };

  // Mutations
  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: any }) =>
      receiptService.updateReceiptItem(itemId, data),
    onSuccess: () => refreshAll(),
    onError: (err: any) => setActionError(err.message || 'Failed to update item'),
  });

  const deleteItemMutation = useMutation({
    mutationFn: (itemId: string) => receiptService.deleteReceiptItem(itemId),
    onSuccess: () => refreshAll(),
    onError: (err: any) => setActionError(err.message || 'Failed to remove item'),
  });

  const resolveProductMutation = useMutation({
    mutationFn: ({ itemId, productId }: { itemId: string; productId: string }) =>
      receiptService.resolveReceiptItemProduct(itemId, productId),
    onSuccess: () => refreshAll(),
    onError: (err: any) => setActionError(err.message || 'Failed to assign product'),
  });

  const resolveBarcodeMutation = useMutation({
    mutationFn: ({
      itemId,
      identifierType,
      identifierValue,
    }: {
      itemId: string;
      identifierType: string;
      identifierValue: string;
    }) => receiptService.resolveReceiptItemBarcode(itemId, identifierType, identifierValue),
    onSuccess: () => refreshAll(),
    onError: (err: any) => setActionError(err.message || 'Barcode not found'),
  });

  const addManualItemMutation = useMutation({
    mutationFn: (data: { product_name: string; quantity: number; price?: number }) =>
      receiptId ? receiptService.addManualItem(receiptId, data) : Promise.reject('No ID'),
    onSuccess: () => refreshAll(),
    onError: (err: any) => setActionError(err.message || 'Failed to add manual item'),
  });

  const reprocessMutation = useMutation({
    mutationFn: () => (receiptId ? receiptService.processReceipt(receiptId) : Promise.reject('No ID')),
    onSuccess: () => refreshAll(),
    onError: (err: any) => setActionError(err.message || 'Failed to reprocess receipt'),
  });

  if (isLoadingReceipt) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600 mb-3" />
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Loading grocery receipt intelligence...
        </h3>
      </div>
    );
  }

  if (isErrorReceipt || !receipt) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Receipt Not Found</h3>
        <p className="text-sm text-zinc-500 mt-1 mb-6">
          {(receiptError as Error)?.message || 'This grocery receipt does not exist or access was denied.'}
        </p>
        <Link
          to="/receipts"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Receipts
        </Link>
      </div>
    );
  }

  // Calculate or use coverage from analysis/receipt
  const fallbackCoverage: ReceiptCoverageSummary = {
    total_items: receipt.items?.length || 0,
    matched: receipt.items?.filter((i) => i.product_id).length || 0,
    ambiguous: receipt.items?.filter((i) => i.requires_selection).length || 0,
    unknown: receipt.items?.filter((i) => !i.product_id && !i.requires_selection).length || 0,
    coverage_ratio: receipt.items?.length
      ? (receipt.items.filter((i) => i.product_id).length / receipt.items.length)
      : 0,
  };

  const coverage = analysis?.coverage || receipt.coverage || fallbackCoverage;
  const isReadyForPhase6 = analysis?.ready_for_family_risk_engine ?? (coverage.ambiguous + coverage.unknown === 0 && coverage.total_items > 0);

  // Filter items
  const items = receipt.items || [];
  const filteredItems = items.filter((item) => {
    if (filterTab === 'needs_review') return item.requires_selection || !item.product_id;
    if (filterTab === 'matched') return Boolean(item.product_id && !item.requires_selection);
    return true;
  });

  const handleOpenResolution = (
    item: ReceiptItem,
    defaultTab: 'candidates' | 'search' | 'barcode' = 'candidates'
  ) => {
    setActiveResolvingItem(item);
    setResolutionTab(defaultTab);
    setIsResolutionOpen(true);
  };

  const handleConfirmList = async () => {
    // If not processed yet, trigger re-evaluation or confirmation
    await reprocessMutation.mutateAsync();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <Link
            to="/receipts"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Receipt History
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-2.5">
            <span>{receipt.original_filename || 'Grocery Receipt Review'}</span>
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Uploaded on {new Date(receipt.created_at).toLocaleString()} • ID: {receipt.id.slice(0, 8)}...
          </p>
        </div>

        <div className="flex items-center gap-2">
          {receipt.items?.some((i) => i.product_id) && (
            <Link
              to={`/risk/receipts/${receipt.id}`}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all flex items-center gap-1.5"
            >
              <span>🛡️</span>
              <span>Analyze Family Risk</span>
            </Link>
          )}

          <button
            type="button"
            onClick={() => reprocessMutation.mutate()}
            disabled={reprocessMutation.isPending}
            className="px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium transition-colors flex items-center gap-1.5"
            title="Re-run OCR & Matching"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${reprocessMutation.isPending ? 'animate-spin' : ''}`} />
            Re-process
          </button>

          <Link
            to="/receipt/upload"
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            Upload Another
          </Link>
        </div>
      </div>


      {actionError && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center justify-between">
          <span>{actionError}</span>
          <button type="button" onClick={() => setActionError(null)} className="font-semibold underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Responsive Grid: Left Preview & Raw Text / Right Grocery List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (Desktop 5 cols): Image preview & Raw OCR */}
        <div className="lg:col-span-5 space-y-6">
          {/* Receipt Image Preview */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5" />
                Receipt Image
              </span>
              {receipt.ocr_confidence && (
                <span className="text-xs font-mono text-emerald-600 font-semibold">
                  OCR: {Math.round(receipt.ocr_confidence * 100)}%
                </span>
              )}
            </div>

            <div className="p-4 bg-zinc-950 flex items-center justify-center min-h-[280px] max-h-[500px] overflow-auto">
              <img
                src={receiptService.getImageUrl(receipt.id)}
                alt="Uploaded grocery receipt"
                className="max-h-[460px] w-auto object-contain mx-auto rounded shadow"
                onError={(e) => {
                  // Fallback placeholder if image cannot be read directly
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
          </div>

          {/* Raw OCR Text Panel */}
          <ReceiptRawTextPanel
            rawText={receipt.ocr_text}
            ocrConfidence={receipt.ocr_confidence}
          />
        </div>

        {/* Right Column (Desktop 7 cols): Summary, Coverage & Items List */}
        <div className="lg:col-span-7 space-y-6">
          {/* Summary Card */}
          <ReceiptSummary
            receipt={receipt}
            coverage={coverage}
            onConfirmList={handleConfirmList}
            onAddManualItem={async (data) => {
              await addManualItemMutation.mutateAsync(data);
            }}
            isConfirming={reprocessMutation.isPending}
          />

          {/* Coverage Card */}
          <ReceiptCoverageCard
            coverage={coverage}
            readyForPhase6={isReadyForPhase6}
          />

          {/* Grocery Items List Section */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                  Extracted Grocery Purchases ({items.length})
                </h3>
                <p className="text-xs text-zinc-500">
                  Non-food lines filtered. Review ambiguous or unknown items before confirming.
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setFilterTab('all')}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    filterTab === 'all'
                      ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  All ({items.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab('needs_review')}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    filterTab === 'needs_review'
                      ? 'bg-white dark:bg-zinc-700 text-amber-700 dark:text-amber-300 shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  Review ({coverage.ambiguous + coverage.unknown})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab('matched')}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    filterTab === 'matched'
                      ? 'bg-white dark:bg-zinc-700 text-emerald-700 dark:text-emerald-300 shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  Matched ({coverage.matched})
                </button>
              </div>
            </div>

            {/* Item Cards Stack */}
            {filteredItems.length === 0 ? (
              <div className="py-12 text-center text-zinc-400 text-xs">
                No items in this category.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredItems.map((item) => (
                  <ReceiptItemCard
                    key={item.id}
                    item={item}
                    currency={receipt.currency === 'USD' ? '$' : '₹'}
                    onOpenResolution={handleOpenResolution}
                    onUpdateItem={async (itemId, data) => {
                      await updateItemMutation.mutateAsync({ itemId, data });
                    }}
                    onDeleteItem={async (itemId) => {
                      await deleteItemMutation.mutateAsync(itemId);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Resolution Modal for Ambiguous or Unknown Items */}
      <ReceiptItemResolutionModal
        item={activeResolvingItem}
        isOpen={isResolutionOpen}
        initialTab={resolutionTab}
        onClose={() => setIsResolutionOpen(false)}
        onSelectProduct={async (productId) => {
          if (activeResolvingItem) {
            await resolveProductMutation.mutateAsync({ itemId: activeResolvingItem.id, productId });
          }
        }}
        onResolveBarcode={async (identifierType, identifierValue) => {
          if (activeResolvingItem) {
            await resolveBarcodeMutation.mutateAsync({
              itemId: activeResolvingItem.id,
              identifierType,
              identifierValue,
            });
          }
        }}
      />
    </div>
  );
};
