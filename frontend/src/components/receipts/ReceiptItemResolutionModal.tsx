import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  Barcode as BarcodeIcon,
  Check,
  AlertCircle,
  Loader2,
  Camera,
  Layers,
} from 'lucide-react';
import { ReceiptItem, Product, ProductSummary } from '../../types';
import { productService } from '../../services/productService';
import { BarcodeScanner } from '../BarcodeScanner';
import { ManualBarcodeInput } from '../ManualBarcodeInput';
import { BarcodeScanResult } from '../../services/barcodeScannerService';

interface ReceiptItemResolutionModalProps {
  item: ReceiptItem | null;
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'candidates' | 'search' | 'barcode';
  onSelectProduct: (productId: string) => Promise<void>;
  onResolveBarcode: (identifierType: string, identifierValue: string) => Promise<void>;
}

export const ReceiptItemResolutionModal: React.FC<ReceiptItemResolutionModalProps> = ({
  item,
  isOpen,
  onClose,
  initialTab = 'candidates',
  onSelectProduct,
  onResolveBarcode,
}) => {
  const [activeTab, setActiveTab] = useState<'candidates' | 'search' | 'barcode'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProductSummary[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    if (item) {
      if (item.candidate_products && item.candidate_products.length > 0) {
        setActiveTab(initialTab || 'candidates');
      } else {
        setActiveTab(initialTab === 'candidates' ? 'search' : initialTab);
      }
      setSearchQuery(item.product_name_raw || '');
      setErrorMessage(null);
    }
  }, [item, initialTab]);

  // Catalog product search with debouncing
  useEffect(() => {
    if (activeTab !== 'search') return;
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      setErrorMessage(null);
      try {
        const res = await productService.getProducts({
          search: trimmed,
          page_size: 8,
        });
        setSearchResults(res.items);
      } catch (err: unknown) {
        console.error('Catalog search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, activeTab]);

  if (!isOpen || !item) return null;

  const handleSelect = async (productId: string) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await onSelectProduct(productId);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to assign product';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBarcodeDetected = async (scanResult: BarcodeScanResult) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await onResolveBarcode(scanResult.format, scanResult.value);
      setIsScanning(false);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Barcode not found in catalog';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualBarcodeSubmit = async (barcode: string, format: string) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await onResolveBarcode(format, barcode);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Barcode not found in catalog';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasCandidates = item.candidate_products && item.candidate_products.length > 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-mono font-medium text-emerald-600 dark:text-emerald-400">
              Receipt Item #{item.line_number}
            </span>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Resolve Grocery Product
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5 truncate max-w-md">
              Raw line: &quot;{item.raw_text}&quot;
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 px-5 bg-zinc-50/50 dark:bg-zinc-900/50">
          {hasCandidates && (
            <button
              type="button"
              onClick={() => setActiveTab('candidates')}
              className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
                activeTab === 'candidates'
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Suggested Candidates ({item.candidate_products.length})
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('search')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'search'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            Search Catalog
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('barcode')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'barcode'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <BarcodeIcon className="w-3.5 h-3.5" />
            Scan / Enter Barcode
          </button>
        </div>

        {/* Error banner */}
        {errorMessage && (
          <div className="m-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Tab Body */}
        <div className="p-5 max-h-[60vh] overflow-y-auto">
          {/* TAB 1: CANDIDATES */}
          {activeTab === 'candidates' && hasCandidates && (
            <div className="space-y-3">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Phase 3 match engine found several potential products with similar names or brand tokens. Choose the one that matches this receipt purchase:
              </p>
              <div className="space-y-2">
                {item.candidate_products.map((cand) => (
                  <div
                    key={cand.id}
                    className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500 dark:hover:border-emerald-500 transition-all flex items-center justify-between gap-3 bg-zinc-50/50 dark:bg-zinc-800/40"
                  >
                    <div>
                      <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                        {cand.name}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
                        {cand.brand?.name && <span>{cand.brand.name}</span>}
                        {cand.pack_size && (
                          <span>
                            • {cand.pack_size}
                            {cand.unit}
                          </span>
                        )}
                        {cand.category?.name && <span>• {cand.category.name}</span>}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleSelect(cand.id)}
                      className="shrink-0 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors flex items-center gap-1"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      Select
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: CATALOG SEARCH */}
          {activeTab === 'search' && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Type product name, brand, or flavor..."
                  className="w-full pl-9 pr-4 py-2 text-sm border rounded-xl bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {isSearching && (
                <div className="py-6 text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                  Searching food catalog...
                </div>
              )}

              {!isSearching && searchResults.length > 0 && (
                <div className="space-y-2">
                  {searchResults.map((prod) => (
                    <div
                      key={prod.id}
                      className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500 dark:hover:border-emerald-500 transition-all flex items-center justify-between gap-3 bg-zinc-50/50 dark:bg-zinc-800/40"
                    >
                      <div>
                        <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                          {prod.name}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
                          {prod.brand_name && <span>{prod.brand_name}</span>}
                          {prod.pack_size && (
                            <span>
                              • {prod.pack_size}
                              {prod.unit}
                            </span>
                          )}
                          {prod.category_name && <span>• {prod.category_name}</span>}
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleSelect(prod.id)}
                        className="shrink-0 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors flex items-center gap-1"
                      >
                        {isSubmitting ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        Select
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {!isSearching && searchResults.length === 0 && searchQuery.trim() && (
                <div className="py-8 text-center text-zinc-400 text-xs">
                  No matching products found for &quot;{searchQuery}&quot;. Try adjusting your search or scan the package barcode.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: BARCODE RESOLUTION (PHASE 4 INTEGRATION) */}
          {activeTab === 'barcode' && (
            <div className="space-y-4">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                If you have the physical package, scanning or entering its barcode (EAN-13, GTIN, UPC) guarantees 100% accurate identification and links it to this receipt purchase.
              </p>

              {/* Barcode Camera Scanner */}
              {isScanning ? (
                <div className="relative rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
                  <BarcodeScanner
                    onDetected={handleBarcodeDetected}
                    onClose={() => setIsScanning(false)}
                    isProcessing={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setIsScanning(false)}
                    className="absolute top-3 right-3 p-1.5 bg-black/60 rounded-full text-white text-xs"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsScanning(true)}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  Launch Barcode Scanner
                </button>
              )}

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-200 dark:border-zinc-800" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white dark:bg-zinc-900 px-2 text-zinc-400 font-medium">
                    Or Enter Manually
                  </span>
                </div>
              </div>

              {/* Manual Barcode Input */}
              <ManualBarcodeInput
                onSubmit={handleManualBarcodeSubmit}
                isLoading={isSubmitting}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
