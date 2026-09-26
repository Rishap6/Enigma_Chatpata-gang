import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Barcode as BarcodeIcon,
  Search,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Info,
  Clock,
  Trash2,
  CameraOff,
  Keyboard,
  ShieldCheck,
  ScanLine,
  FileText,
  AlertTriangle,
  ChevronRight,
  Eye,
  ShieldAlert,
  Loader2,
  Camera,
  X,
  CheckCircle,
  XCircle,
  HelpCircle as HelpIcon,
  Layers,
} from 'lucide-react';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { ManualBarcodeInput } from '../components/ManualBarcodeInput';
import { ProductAlternativesPanel } from '../components/ProductAlternativesPanel';
import { barcodeScannerService, BarcodeScanResult } from '../services/barcodeScannerService';
import { productService } from '../services/productService';
import { scanService, BarcodeScanResult as BarcodeResult, IngredientScanResult, CompareResult, ParsedIngredientItem } from '../services/scanService';
import { normalizeBarcode, mapScannerFormat } from '../utils/barcode';
import { ProductDetail } from '../types';

export type ScanMode = 'barcode' | 'ingredient';

export type ScannerFlowState =
  | 'idle'
  | 'initializing'
  | 'scanning'
  | 'detected'
  | 'looking_up'
  | 'found'
  | 'not_found'
  | 'permission_denied'
  | 'error'
  | 'ingredient_input'
  | 'ingredient_analyzing'
  | 'ingredient_results'
  | 'comparing';

export interface RecentScanItem {
  barcode: string;
  format?: string;
  productId?: string;
  productName?: string;
  brandName?: string;
  scannedAt: string;
  status: 'found' | 'not_found';
}

const STORAGE_KEY = 'family_food_inspected_scans_v1';

export const ScanProductPage: React.FC = () => {
  const navigate = useNavigate();

  // Mode
  const [scanMode, setScanMode] = useState<ScanMode>('barcode');

  // Barcode state
  const [scanState, setScanState] = useState<ScannerFlowState>('scanning');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeBarcode, setActiveBarcode] = useState<string | null>(null);
  const [activeFormat, setActiveFormat] = useState<string | null>(null);
  const [matchedProduct, setMatchedProduct] = useState<ProductDetail | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [recentScans, setRecentScans] = useState<RecentScanItem[]>([]);

  // Barcode scan result (from new scan API)
  const [barcodeResult, setBarcodeResult] = useState<BarcodeResult | null>(null);

  // Ingredient scan state
  const [ingredientText, setIngredientText] = useState('');
  const [ingredientResult, setIngredientResult] = useState<IngredientScanResult | null>(null);
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);
  const [ingredientLoading, setIngredientLoading] = useState(false);
  const [showOCRScanner, setShowOCRScanner] = useState(false);

  // Prevent multiple burst requests
  const lookupInProgressRef = useRef(false);

  // Load recent history
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setRecentScans(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  const saveToHistory = useCallback((item: RecentScanItem) => {
    setRecentScans((prev) => {
      const filtered = prev.filter((i) => i.barcode !== item.barcode);
      const updated = [item, ...filtered].slice(0, 10);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch { /* */ }
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    try { localStorage.removeItem(STORAGE_KEY); setRecentScans([]); } catch { /* */ }
  }, []);

  // ─── Barcode Lookup ───
  const performProductLookup = useCallback(
    async (rawCode: string, detectedFormat?: string) => {
      if (lookupInProgressRef.current) return;
      lookupInProgressRef.current = true;

      const normalized = normalizeBarcode(rawCode);
      const mappedType = detectedFormat ? mapScannerFormat(detectedFormat) : 'AUTO';

      setActiveBarcode(normalized);
      setActiveFormat(detectedFormat || mappedType);
      setScanState('looking_up');
      setErrorMessage(null);

      try {
        // Try product lookup service first
        let product = null;
        try {
          product = await productService.lookupProductByIdentifier(activeFormat || 'EAN13', normalized);
        } catch (e: any) {
          // Rethrow network/lookup errors to transition scan state to error
          throw e;
        }

        if (product) {
          setMatchedProduct(product);
          setScanState('found');
          saveToHistory({
            barcode: normalized,
            format: detectedFormat || mappedType,
            productId: product.id,
            productName: product.name,
            brandName: product.brand?.name || undefined,
            scannedAt: new Date().toISOString(),
            status: 'found',
          });
          setTimeout(() => {
            navigate(`/products/${product.id}`);
          }, 300);
          return;
        }

        // Try backend scan/barcode service if direct lookup returns null
        try {
          const result = await scanService.scanBarcode(normalized);
          setBarcodeResult(result);
          if (result && result.found && result.product_id) {
            const p = await productService.getProduct(result.product_id);
            if (p) {
              setMatchedProduct(p);
              setScanState('found');
              return;
            }
          }
        } catch (e) {}

        setScanState('not_found');
        saveToHistory({
          barcode: normalized,
          format: detectedFormat || mappedType,
          scannedAt: new Date().toISOString(),
          status: 'not_found',
        });
      } catch (err: any) {
        const status = err?.response?.status;
        if (status === 404) {
          setScanState('not_found');
          saveToHistory({
            barcode: normalized,
            format: detectedFormat || mappedType,
            scannedAt: new Date().toISOString(),
            status: 'not_found',
          });
        } else {
          setScanState('error');
          setErrorMessage('We need an active internet connection to query product database.');
        }
      } finally {
        lookupInProgressRef.current = false;
      }
    },
    [saveToHistory]
  );

  const handleBarcodeDetected = useCallback(
    (result: BarcodeScanResult) => {
      setScanState('detected');
      performProductLookup(result.value, result.format);
    },
    [performProductLookup]
  );

  const handleScannerError = useCallback((message: string, isPermissionError: boolean) => {
    lookupInProgressRef.current = false;
    if (isPermissionError) {
      setScanState('permission_denied');
      setErrorMessage(message || 'Camera access is required to scan product barcodes.');
    } else {
      setScanState('error');
      setErrorMessage(message || "We couldn't start the camera.");
    }
  }, []);

  const handleRetry = useCallback(() => {
    lookupInProgressRef.current = false;
    setMatchedProduct(null);
    setBarcodeResult(null);
    setErrorMessage(null);
    setActiveBarcode(null);
    setScanState('scanning');
    setIngredientResult(null);
    setCompareResult(null);
    setIngredientText('');
    barcodeScannerService.resume().catch(() => {});
  }, []);

  // ─── Ingredient Analysis ───
  const handleIngredientScan = useCallback(async () => {
    if (!ingredientText.trim()) return;
    setIngredientLoading(true);
    setScanState('ingredient_analyzing');
    try {
      const result = await scanService.scanIngredients(
        ingredientText,
        barcodeResult?.product_id || undefined
      );
      setIngredientResult(result);

      // If we have a product, also do comparison
      if (barcodeResult?.product_id && result.ingredients.length > 0) {
        const ocrNames = result.ingredients.map(i => i.normalized_name || i.raw_name);
        const comparison = await scanService.compareIngredients(barcodeResult.product_id, ocrNames);
        setCompareResult(comparison);
      }

      setScanState('ingredient_results');
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.detail || 'Failed to analyze ingredients');
      setScanState('error');
    } finally {
      setIngredientLoading(false);
    }
  }, [ingredientText, barcodeResult]);

  // Handle OCR detection from camera
  const handleOCRDetected = useCallback((text: string) => {
    setIngredientText(text);
    setShowOCRScanner(false);
    // Optionally auto-analyze
    // handleIngredientScan();
  }, []);

  // Navigate to product detail
  const navigateToProduct = useCallback(() => {
    if (matchedProduct) {
      navigate(`/products/${matchedProduct.id}`, {
        state: { fromScan: true, scannedBarcode: activeBarcode },
      });
    }
  }, [matchedProduct, activeBarcode, navigate]);

  // Switch to ingredient scanning from barcode result
  const switchToIngredientScan = useCallback(() => {
    setScanState('ingredient_input');
    if (barcodeResult?.ingredients_raw) {
      // Pre-fill with catalog ingredients for comparison
      setIngredientText('');
    }
  }, [barcodeResult]);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Top App Bar */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3.5 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors p-1 -ml-1 rounded-lg"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-xs font-semibold hidden sm:inline">Back</span>
        </button>

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
            {scanMode === 'barcode' ? <BarcodeIcon className="w-4 h-4" /> : <ScanLine className="w-4 h-4" />}
          </div>
          <h1 className="text-base font-bold tracking-tight">
            {scanMode === 'barcode' ? 'Scan Product' : 'Scan Ingredients'}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowManualInput(!showManualInput)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              showManualInput
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
            aria-label="Manual barcode entry"
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Manual</span>
          </button>
        </div>
      </header>

      {/* Mode Toggle */}
      <div className="px-4 py-2 bg-slate-900/50 border-b border-slate-800/50">
        <div className="flex items-center gap-2 max-w-md mx-auto">
          <button
            onClick={() => { setScanMode('barcode'); handleRetry(); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
              scanMode === 'barcode'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-lg shadow-emerald-500/10'
                : 'bg-slate-800/60 text-slate-400 border border-slate-700/40 hover:bg-slate-800'
            }`}
          >
            <BarcodeIcon className="w-4 h-4" />
            <span>Barcode Scanner</span>
          </button>
          <button
            onClick={() => { setScanMode('ingredient'); setScanState('ingredient_input'); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
              scanMode === 'ingredient'
                ? 'bg-violet-500/20 text-violet-400 border border-violet-500/40 shadow-lg shadow-violet-500/10'
                : 'bg-slate-800/60 text-slate-400 border border-slate-700/40 hover:bg-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Ingredient Scanner</span>
          </button>
        </div>
      </div>

      {/* Main View Area */}
      <main className="flex-1 flex flex-col relative overflow-y-auto">

        {/* ══════════ BARCODE MODE ══════════ */}
        {scanMode === 'barcode' && (
          <>
            {/* PERMISSION DENIED */}
            {scanState === 'permission_denied' && (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
                  <CameraOff className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold mb-2">Camera Access Required</h2>
                <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                  Camera access is required to scan a barcode automatically.
                </p>
                <div className="w-full space-y-3">
                  <button onClick={handleRetry} className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2">
                    <RotateCcw className="w-4 h-4" /><span>Try Again</span>
                  </button>
                  <button onClick={() => setShowManualInput(true)} className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2">
                    <Keyboard className="w-4 h-4 text-emerald-400" /><span>Enter Barcode Manually</span>
                  </button>
                </div>
              </div>
            )}

            {/* NOT FOUND — with "Scan Ingredients" option */}
            {scanState === 'not_found' && (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto animate-fade-in">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
                  <HelpCircle className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold mb-1">Product Not Found</h2>
                <p className="text-xs text-slate-400 mb-4">
                  Barcode <span className="font-mono text-emerald-400 font-semibold">{activeBarcode}</span> is not in the catalog.
                  <span className="block text-[11px] text-slate-500 mt-1">Ingredient label OCR scanning will be available in a future phase.</span>
                </p>
                <div className="w-full bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 mb-6 text-left space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                    <Info className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>What you can do:</span>
                  </div>
                  <ul className="text-xs text-slate-400 list-disc list-inside space-y-1 pl-1">
                    <li>Scan the ingredient label instead for full analysis</li>
                    <li>Verify the barcode digits or scan again under better light</li>
                    <li>Search the catalog directly by brand or item name</li>
                  </ul>
                </div>
                <div className="w-full space-y-3">
                  <button
                    onClick={() => { setScanMode('ingredient'); setScanState('ingredient_input'); }}
                    className="w-full py-3 px-4 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    <ScanLine className="w-4 h-4" /><span>Scan Ingredient Label Instead</span>
                  </button>
                  <button onClick={handleRetry} className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2">
                    <RotateCcw className="w-4 h-4" /><span>Scan Again</span>
                  </button>
                  <button onClick={() => setShowManualInput(true)} className="w-full py-2.5 px-4 bg-slate-800/60 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2">
                    <Keyboard className="w-4 h-4 text-emerald-400" /><span>Enter Barcode Manually</span>
                  </button>
                </div>
              </div>
            )}

            {/* ERROR */}
            {scanState === 'error' && (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold mb-2">Scan or Lookup Error</h2>
                <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                  {errorMessage || "We need an active internet connection to query product database."}
                </p>
                <div className="w-full space-y-3">
                  <button onClick={handleRetry} className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2">
                    <RotateCcw className="w-4 h-4" /><span>Retry</span>
                  </button>
                </div>
              </div>
            )}

            {/* LOOKING UP / DETECTED / FOUND TRANSITION */}
            {(scanState === 'detected' || scanState === 'looking_up' || (scanState === 'found' && !matchedProduct)) && (
              <div className="absolute inset-0 z-20 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                <div className="w-16 h-16 rounded-full border-4 border-emerald-500/30 border-t-emerald-400 animate-spin mb-4" />
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 text-emerald-400 font-mono text-xs font-semibold mb-2">
                  <BarcodeIcon className="w-3.5 h-3.5" /><span>{activeBarcode}</span>
                </div>
                <h2 className="text-xl font-bold mb-1">{scanState === 'found' ? 'Product Found!' : 'Looking Up Product...'}</h2>
                <p className="text-xs text-slate-400 max-w-xs">Searching catalog and cross-referencing ingredients...</p>
              </div>
            )}

            {/* FOUND — show product + "Scan Ingredients" CTA */}
            {scanState === 'found' && matchedProduct && (
              <div className="flex-1 flex flex-col p-4 max-w-lg mx-auto w-full space-y-4 animate-fade-in">
                {/* Product Card */}
                <div className="bg-slate-800/80 border border-emerald-500/30 rounded-2xl p-5 shadow-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Product Found!
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-white text-sm truncate">{matchedProduct.name}</h3>
                      <p className="text-[11px] text-slate-400">{matchedProduct.brand?.name || 'Unknown Brand'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mb-4 pb-3 border-b border-slate-700/50">
                    <BarcodeIcon className="w-3 h-3 text-emerald-400" />
                    <span>{activeBarcode}</span>
                    {matchedProduct.category?.name && (
                      <>
                        <span className="text-slate-600">•</span>
                        <span>{matchedProduct.category.name}</span>
                      </>
                    )}
                  </div>

                  {/* Catalog Ingredients */}
                  {barcodeResult?.ingredients_raw && (
                    <div className="mb-4">
                      <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Layers className="w-3 h-3 text-emerald-400" />
                        Catalog Ingredients
                      </h4>
                      <p className="text-xs text-slate-400 leading-relaxed bg-slate-900/60 rounded-xl p-3 border border-slate-700/30">
                        {barcodeResult.ingredients_raw}
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    <button
                      onClick={navigateToProduct}
                      className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs transition-all flex items-center justify-center gap-2"
                    >
                      <Eye className="w-3.5 h-3.5" /><span>View Full Product Details</span>
                      <ChevronRight className="w-3.5 h-3.5 ml-auto" />
                    </button>
                    <button
                      onClick={switchToIngredientScan}
                      className="w-full py-2.5 px-4 bg-violet-600/80 hover:bg-violet-500 text-white font-semibold rounded-xl text-xs transition-all flex items-center justify-center gap-2"
                    >
                      <ScanLine className="w-3.5 h-3.5" /><span>Scan Ingredient Label to Compare</span>
                      <ChevronRight className="w-3.5 h-3.5 ml-auto" />
                    </button>
                    <button
                      onClick={() => {
                        if (matchedProduct) {
                          navigate(`/products/${matchedProduct.id}`, {
                            state: { fromScan: true, openRisk: true },
                          });
                        }
                      }}
                      className="w-full py-2.5 px-4 bg-amber-600/60 hover:bg-amber-500/60 text-white font-semibold rounded-xl text-xs transition-all flex items-center justify-center gap-2"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" /><span>Analyze for Family Safety</span>
                      <ChevronRight className="w-3.5 h-3.5 ml-auto" />
                    </button>
                  </div>
                </div>

                {/* Safe Alternatives Panel for Allergic / Lactose-Deficient Scans */}
                <div className="w-full max-w-lg mx-auto">
                  <ProductAlternativesPanel
                    productId={matchedProduct.id}
                    productName={matchedProduct.name}
                  />
                </div>

                <button onClick={handleRetry} className="text-xs text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-1.5 py-2">
                  <RotateCcw className="w-3 h-3" /><span>Scan Another Product</span>
                </button>
              </div>
            )}

            {/* ACTIVE CAMERA SCANNING */}
            {scanState === 'scanning' && !showManualInput && (
              <div className="flex-1 flex flex-col items-center justify-center relative w-full h-full min-h-[420px]">
                <BarcodeScanner
                  onDetected={handleBarcodeDetected}
                  onError={handleScannerError}
                  enabled={scanState === 'scanning'}
                  mode="barcode"
                />
                {/* Quick Demo Test Buttons — GTINs from new_products_gtin.csv */}
                <div className="absolute top-3 left-4 right-4 z-10 flex flex-wrap items-center justify-center gap-2 pointer-events-auto">
                  <div className="bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-slate-700/60 flex flex-wrap items-center justify-center gap-1.5 text-[11px] text-slate-300">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Test:</span>
                    <button type="button" onClick={() => performProductLookup('8906002482481', 'EAN_13')} className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 font-mono text-[10px]">Snickers</button>
                    <button type="button" onClick={() => performProductLookup('8901491100519', 'EAN_13')} className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 font-mono text-[10px]">Kurkure</button>
                    <button type="button" onClick={() => performProductLookup('8901491100267', 'EAN_13')} className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 font-mono text-[10px]">Lay's</button>
                    <button type="button" onClick={() => performProductLookup('8901719116520', 'EAN_13')} className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 font-mono text-[10px]">Hide&Seek</button>
                    <button type="button" onClick={() => performProductLookup('8906010916077', 'EAN_13')} className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 font-mono text-[10px]">Triple Bar</button>
                    <button type="button" onClick={() => performProductLookup('0000000000000', 'EAN_13')} className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 font-mono text-[10px]">Unknown</button>
                  </div>
                </div>
              </div>
            )}

            {/* Manual Input */}
            {showManualInput && (
              <div className="flex-1 flex flex-col items-center justify-center p-4 max-w-lg mx-auto w-full">
                <div className="w-full bg-slate-800/90 backdrop-blur-md rounded-2xl border border-slate-700 p-5 shadow-xl">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-700/60">
                    <div className="flex items-center gap-2">
                      <Keyboard className="w-4 h-4 text-emerald-400" />
                      <h3 className="text-sm font-bold text-white">Manual Barcode Search</h3>
                    </div>
                    <button onClick={() => setShowManualInput(false)} className="text-xs text-slate-400 hover:text-white transition-colors">Return to Camera</button>
                  </div>
                  <ManualBarcodeInput
                    onSearch={(code, type) => { setShowManualInput(false); performProductLookup(code, type); }}
                    isLoading={scanState === 'looking_up'}
                  />
                </div>
              </div>
            )}
          </>
        )}

        {/* ══════════ INGREDIENT MODE ══════════ */}
        {(scanMode === 'ingredient' || scanState === 'ingredient_input' || scanState === 'ingredient_analyzing' || scanState === 'ingredient_results') && (
          <>
            {/* Input Area */}
            {(scanState === 'ingredient_input' || scanState === 'ingredient_analyzing') && !showOCRScanner && (
              <div className="flex-1 flex flex-col p-4 max-w-lg mx-auto w-full space-y-4">
                {/* Context: linked product */}
                {barcodeResult?.found && (
                  <div className="bg-slate-800/70 border border-emerald-500/20 rounded-xl p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{barcodeResult.product_name}</p>
                      <p className="text-[10px] text-slate-400">Scanning label to compare with catalog</p>
                    </div>
                  </div>
                )}

                {/* OCR Text Input */}
                <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5 shadow-xl">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-bold flex items-center gap-2">
                      <FileText className="w-4 h-4 text-violet-400" />
                      Enter Ingredient Label Text
                    </h3>
                    <button
                      onClick={() => setShowOCRScanner(true)}
                      className="px-2.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-[11px] font-semibold flex items-center gap-1.5 transition-all"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Scan</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-3">
                    Type or paste the full ingredient list from the product label. You can also photograph and OCR it.
                  </p>
                  <textarea
                    value={ingredientText}
                    onChange={(e) => setIngredientText(e.target.value)}
                    placeholder="e.g. Refined Wheat Flour (Maida), Sugar, Cocoa Solids, Cocoa Butter, Dextrose, Emulsifier (INS 322), Edible Vegetable Fats..."
                    className="w-full h-40 bg-slate-900/80 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                    disabled={ingredientLoading}
                  />

                  {/* Quick Demo Presets */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="text-[10px] text-slate-500 flex items-center gap-1"><Sparkles className="w-3 h-3 text-amber-400" />Demo:</span>
                    <button
                      type="button"
                      onClick={() => setIngredientText('Milk chocolate coating: Sugar, Milk solids, Cocoa butter, Cocoa solids, Edible vegetable fats (Sal fat, Palm oil), Dextrose, Emulsifier (INS 322); Centre filling: Liquid glucose, Peanuts (18%), Sugar, Fractionated vegetable fat, Milk solids, Iodised salt, Cocoa butter, Cocoa solids, Dextrose, Emulsifier (INS 322). Contains Peanuts, Milk, Soy; may contain Tree Nuts.')}
                      className="px-2 py-0.5 rounded-md bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 text-[10px] font-medium"
                    >
                      Snickers
                    </button>
                    <button
                      type="button"
                      onClick={() => setIngredientText('Refined Wheat Flour (Maida), Chocolate (21%) [Sugar, Cocoa Solids, Cocoa Butter, Dextrose, Emulsifier of Vegetable Origin (Soya Lecithin) and Artificial Flavouring Substances - Vanilla], Sugar, Refined Palm Oil, Invert Sugar Syrup, Coffee and Chicory Mixture (1%), Iodised Salt and Emulsifier of Vegetable Origin, Raising Agents [503(ii), 500(ii)]. Contains Permitted Natural Food Colour [150d] and Added Flavour.')}
                      className="px-2 py-0.5 rounded-md bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 text-[10px] font-medium"
                    >
                      Hide & Seek
                    </button>
                    <button
                      type="button"
                      onClick={() => setIngredientText('Cereal Products (67%) [Rice Meal (44%), Corn Meal (23%)], Edible Vegetable Oil, Seasoning [Spices and Condiments, Iodised Salt, Sugar, Flavour (Natural and Nature Identical Flavouring Substances), Black Salt, Tomato Powder, Acidity Regulators (330, 296, 331), Colour (160c)], Maltodextrin, Gram Meal (0.5%).')}
                      className="px-2 py-0.5 rounded-md bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 text-[10px] font-medium"
                    >
                      Kurkure
                    </button>
                  </div>

                  <button
                    onClick={handleIngredientScan}
                    disabled={ingredientLoading || !ingredientText.trim()}
                    className="w-full mt-4 py-3 px-4 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    {ingredientLoading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /><span>Analyzing Ingredients...</span></>
                    ) : (
                      <><Search className="w-4 h-4" /><span>Analyze Ingredients</span></>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* OCR Camera Scanner */}
            {(scanState === 'ingredient_input' || scanState === 'ingredient_analyzing') && showOCRScanner && (
              <div className="flex-1 flex flex-col p-4 max-w-lg mx-auto w-full space-y-4">
                <div className="bg-slate-800/80 border border-violet-500/30 rounded-2xl p-4 shadow-xl">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold flex items-center gap-2 text-white">
                      <Camera className="w-4 h-4 text-violet-400" />
                      Scan Ingredient Label
                    </h3>
                    <button
                      onClick={() => setShowOCRScanner(false)}
                      className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" />
                      Cancel
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-3">
                    Point your camera at the ingredient list on the product packaging. The text will be automatically extracted.
                  </p>
                  <BarcodeScanner
                    onDetected={handleBarcodeDetected}
                    onOCRDetected={handleOCRDetected}
                    onError={handleScannerError}
                    enabled={showOCRScanner}
                    mode="ocr"
                  />
                  {ingredientText && (
                    <div className="mt-3 p-3 bg-slate-900/80 border border-violet-500/20 rounded-xl">
                      <p className="text-[11px] font-semibold text-violet-400 mb-1">Captured Text:</p>
                      <p className="text-xs text-slate-300 leading-relaxed max-h-32 overflow-y-auto">{ingredientText}</p>
                      <button
                        onClick={() => {
                          setShowOCRScanner(false);
                          handleIngredientScan();
                        }}
                        className="w-full mt-3 py-2 px-4 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-lg text-xs transition-all flex items-center justify-center gap-2"
                      >
                        <Search className="w-3.5 h-3.5" />
                        <span>Analyze This Text</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Results */}
            {scanState === 'ingredient_results' && ingredientResult && (
              <div className="flex-1 flex flex-col p-4 max-w-lg mx-auto w-full space-y-4 animate-fade-in">
                {/* Summary Header */}
                <div className="bg-gradient-to-r from-violet-600/20 to-emerald-600/20 border border-violet-500/30 rounded-2xl p-4">
                  <h3 className="font-bold text-sm mb-2 flex items-center gap-2">
                    <ScanLine className="w-4 h-4 text-violet-400" />
                    Ingredient Analysis Results
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-900/60 rounded-xl p-2.5 text-center">
                      <div className="text-lg font-bold text-emerald-400">{ingredientResult.parsed_count}</div>
                      <div className="text-[10px] text-slate-400">Parsed</div>
                    </div>
                    <div className="bg-slate-900/60 rounded-xl p-2.5 text-center">
                      <div className="text-lg font-bold text-rose-400">{ingredientResult.allergens_detected.length}</div>
                      <div className="text-[10px] text-slate-400">Allergens</div>
                    </div>
                    <div className="bg-slate-900/60 rounded-xl p-2.5 text-center">
                      <div className="text-lg font-bold text-amber-400">{ingredientResult.verification_required_count}</div>
                      <div className="text-[10px] text-slate-400">Verify</div>
                    </div>
                  </div>
                </div>

                {/* Allergen Alerts */}
                {ingredientResult.allergens_detected.length > 0 && (
                  <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3">
                    <h4 className="text-xs font-bold text-rose-400 mb-2 flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      Allergens Detected
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {ingredientResult.allergens_detected.map((a) => (
                        <span key={a} className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[11px] font-semibold border border-rose-500/30">
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Comparison Results (if linked product) */}
                {compareResult && (
                  <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 space-y-3">
                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-violet-400" />
                      Catalog vs OCR Comparison
                      <span className="ml-auto text-emerald-400 font-mono text-[11px]">{Math.round(compareResult.match_score * 100)}% match</span>
                    </h4>
                    {compareResult.matching.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-emerald-400 mb-1 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Matching ({compareResult.matching.length})</p>
                        <div className="flex flex-wrap gap-1">
                          {compareResult.matching.map((m, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 text-[10px] border border-emerald-500/20">{m.name}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {compareResult.additional.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-amber-400 mb-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Additional in OCR ({compareResult.additional.length})</p>
                        <div className="flex flex-wrap gap-1">
                          {compareResult.additional.map((m, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 text-[10px] border border-amber-500/20">{m.name}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {compareResult.missing.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-rose-400 mb-1 flex items-center gap-1"><XCircle className="w-3 h-3" /> Missing from OCR ({compareResult.missing.length})</p>
                        <div className="flex flex-wrap gap-1">
                          {compareResult.missing.map((m, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-300 text-[10px] border border-rose-500/20">{m.name}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {compareResult.uncertain.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-yellow-400 mb-1 flex items-center gap-1"><HelpCircle className="w-3 h-3" /> Uncertain ({compareResult.uncertain.length})</p>
                        <div className="flex flex-wrap gap-1">
                          {compareResult.uncertain.map((m, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-300 text-[10px] border border-yellow-500/20">{m.catalog_name} ≈ {m.ocr_name}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Individual Ingredients */}
                <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4">
                  <h4 className="text-xs font-bold text-white mb-3 flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-violet-400" />
                    Parsed Ingredients ({ingredientResult.parsed_count})
                  </h4>
                  <div className="space-y-1.5 max-h-72 overflow-y-auto">
                    {ingredientResult.ingredients.map((item, idx) => (
                      <IngredientRow key={idx} item={item} index={idx} />
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  {matchedProduct && (
                    <button
                      onClick={() => navigate(`/products/${matchedProduct.id}`, { state: { fromScan: true, openRisk: true } })}
                      className="w-full py-2.5 px-4 bg-amber-600/80 hover:bg-amber-500 text-white font-semibold rounded-xl text-xs transition-all flex items-center justify-center gap-2"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" /><span>Analyze for Family Safety</span>
                    </button>
                  )}
                  <button onClick={() => { setScanState('ingredient_input'); setIngredientResult(null); setCompareResult(null); }}
                    className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs transition-all flex items-center justify-center gap-2">
                    <RotateCcw className="w-3.5 h-3.5" /><span>Scan Another Label</span>
                  </button>
                  <button onClick={handleRetry}
                    className="w-full py-2 px-4 bg-slate-800/60 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition-all flex items-center justify-center gap-2">
                    <BarcodeIcon className="w-3.5 h-3.5" /><span>Back to Barcode Scanner</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Bottom Bar */}
      <footer className="bg-slate-900 border-t border-slate-800 p-4 space-y-3 safe-area-bottom">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <button
            onClick={() => setShowManualInput(!showManualInput)}
            className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors py-1.5 px-3 rounded-lg bg-slate-800/80 border border-slate-700"
          >
            <Keyboard className="w-4 h-4 text-emerald-400" />
            <span>{showManualInput ? 'Show Camera' : 'Enter Barcode'}</span>
          </button>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors py-1.5 px-3 rounded-lg"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Recent ({recentScans.length})</span>
          </button>
        </div>

        {showHistory && (
          <div className="max-w-md mx-auto pt-3 border-t border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Inspected Products (Not Purchases)
              </span>
              {recentScans.length > 0 && (
                <button onClick={clearHistory} className="text-slate-500 hover:text-rose-400 transition-colors flex items-center gap-1">
                  <Trash2 className="w-3 h-3" /><span>Clear</span>
                </button>
              )}
            </div>
            {recentScans.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">No recent barcode inspections.</p>
            ) : (
              <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                {recentScans.map((item, idx) => (
                  <div key={`${item.barcode}-${idx}`} className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-between text-xs">
                    <div className="min-w-0 pr-2">
                      <div className="font-semibold text-slate-200 truncate">{item.productName || `Barcode ${item.barcode}`}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{item.barcode} {item.brandName ? `• ${item.brandName}` : ''}</div>
                    </div>
                    {item.productId ? (
                      <Link to={`/products/${item.productId}`} className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 font-semibold text-[11px] shrink-0">View</Link>
                    ) : (
                      <span className="text-[10px] text-amber-400 font-medium px-2 py-0.5 rounded-sm bg-amber-500/10">Unknown</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </footer>
    </div>
  );
};

// ─── Sub-component: Ingredient Row ───
const IngredientRow: React.FC<{ item: ParsedIngredientItem; index: number }> = ({ item, index }) => {
  return (
    <div className={`px-3 py-2 rounded-xl border text-xs flex items-start gap-2 ${
      item.requires_verification
        ? 'bg-amber-500/5 border-amber-500/20'
        : item.matched
        ? 'bg-slate-900/40 border-slate-700/40'
        : 'bg-slate-900/30 border-slate-700/20'
    }`}>
      <span className="text-[10px] text-slate-500 font-mono mt-0.5 w-4 shrink-0">{index + 1}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-semibold text-white">{item.raw_name}</span>
          {item.matched && item.normalized_name && item.normalized_name !== item.raw_name && (
            <span className="text-[10px] text-slate-400">→ {item.normalized_name}</span>
          )}
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          {item.matched ? (
            <span className="px-1.5 py-0 rounded bg-emerald-500/10 text-emerald-300 text-[9px] border border-emerald-500/20">
              ✓ Matched ({Math.round(item.confidence * 100)}%)
            </span>
          ) : (
            <span className="px-1.5 py-0 rounded bg-slate-600/30 text-slate-400 text-[9px] border border-slate-600/20">
              Unmatched
            </span>
          )}
          {item.allergen_flags.map((a) => (
            <span key={a} className="px-1.5 py-0 rounded bg-rose-500/15 text-rose-300 text-[9px] border border-rose-500/20 font-medium">
              ⚠ {a}
            </span>
          ))}
          {item.source_uncertain && (
            <span className="px-1.5 py-0 rounded bg-amber-500/15 text-amber-300 text-[9px] border border-amber-500/20">
              ? Source Uncertain
            </span>
          )}
          {item.requires_verification && !item.source_uncertain && (
            <span className="px-1.5 py-0 rounded bg-yellow-500/15 text-yellow-300 text-[9px] border border-yellow-500/20">
              Verification Required
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
