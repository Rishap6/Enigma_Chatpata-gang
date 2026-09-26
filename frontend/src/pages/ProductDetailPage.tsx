import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Package,
  Barcode,
  Globe,
  ShieldAlert,
  Code2,
  Copy,
  Check,
  AlertTriangle,
  ShieldCheck,
  Calendar,
  ScanLine,
} from 'lucide-react';
import { productService } from '../services/productService';
import { ProductCategoryBadge } from '../components/ProductCategoryBadge';
import { ProductQualityPanel } from '../components/ProductQualityPanel';
import { ProductIngredientList } from '../components/ProductIngredientList';
import { ProductIdentifierCard } from '../components/ProductIdentifierCard';
import { ProductSourceCard } from '../components/ProductSourceCard';
import { ProductAllergenStatement } from '../components/ProductAllergenStatement';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { ProductImpactPanel } from '../components/risk/ProductImpactPanel';
import { RiskExplanationDrawer } from '../components/risk/RiskExplanationDrawer';
import { ProductAlternativesPanel } from '../components/ProductAlternativesPanel';
import { RiskFinding } from '../types';


export const ProductDetailPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const [showJson, setShowJson] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedFinding, setSelectedFinding] = useState<RiskFinding | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);


  // Load complete product details
  const {
    data: product,
    isLoading: isProductLoading,
    isError: isProductError,
    error: productError,
    refetch: refetchProduct,
  } = useQuery({
    queryKey: ['product-detail', productId],
    queryFn: () => productService.getProduct(productId!),
    enabled: Boolean(productId),
  });

  // Load unified product analysis (Phase 6 contract)
  const {
    data: analysis,
    isLoading: isAnalysisLoading,
    isError: isAnalysisError,
    error: analysisError,
    refetch: refetchAnalysis,
  } = useQuery({
    queryKey: ['product-analysis', productId],
    queryFn: () => productService.getProductAnalysis(productId!),
    enabled: Boolean(productId),
  });

  const copyJson = () => {
    if (analysis) {
      navigator.clipboard.writeText(JSON.stringify(analysis, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isLoading = isProductLoading || isAnalysisLoading;
  const isError = isProductError || isAnalysisError;

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <LoadingState message="Analyzing product ingredients and intelligence derivation chains..." />
      </div>
    );
  }

  if (isError || !product || !analysis) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <ErrorState
          message="Failed to load product intelligence details. Please try again."
          onRetry={() => {
            refetchProduct();
            refetchAnalysis();
          }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/products"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-cyan-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Product Catalog</span>
          </Link>

          <Link
            to="/scan"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20"
          >
            <ScanLine className="w-3.5 h-3.5" />
            <span>Scan Another</span>
          </Link>
        </div>

        {/* Phase 6 Contract Inspector Toggle */}
        <button
          onClick={() => setShowJson(!showJson)}
          className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-medium text-slate-300 hover:text-cyan-400 hover:bg-slate-800 transition-colors flex items-center gap-1.5"
        >
          <Code2 className="w-3.5 h-3.5 text-cyan-400" />
          <span>{showJson ? 'Hide Phase 6 JSON' : 'Inspect Phase 6 Contract'}</span>
        </button>
      </div>

      {/* Product Hero Header */}
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-3 flex-1">
            {/* Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              {product.brand && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {product.brand.name}
                </span>
              )}
              {product.category && (
                <ProductCategoryBadge category={product.category.name} />
              )}
              {product.country && (
                <span className="inline-flex items-center gap-1 text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                  <Globe className="w-3 h-3 text-slate-500" />
                  {product.country}
                </span>
              )}
            </div>

            {/* Title & Description */}
            <h1 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight">
              {product.name}
            </h1>

            {product.description && (
              <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
                {product.description}
              </p>
            )}

            {/* Specifications Bar */}
            <div className="flex items-center gap-4 text-xs text-slate-400 pt-2 flex-wrap">
              {(product.pack_size || product.unit) && (
                <div className="flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-slate-500" />
                  <span>
                    Net Quantity: {product.pack_size} {product.unit}
                  </span>
                </div>
              )}

              {(product.gtin || product.barcode) && (
                <div className="flex items-center gap-1.5 font-mono text-slate-300">
                  <Barcode className="w-4 h-4 text-cyan-400" />
                  <span>GTIN: {product.gtin || product.barcode}</span>
                </div>
              )}
            </div>
          </div>

          {/* Confidence & Verification Status Badge */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center text-center shrink-0 min-w-[160px]">
            <span className="text-xs text-slate-400 block mb-1">Product Confidence</span>
            <span className="text-3xl font-extrabold text-cyan-400 font-mono">
              {Math.round(analysis.product_confidence * 100)}%
            </span>

            <div className="mt-2.5">
              {analysis.requires_verification ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  <AlertTriangle className="w-3 h-3" />
                  Verification Required
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <ShieldCheck className="w-3 h-3" />
                  High Confidence
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible Phase 6 JSON Inspector */}
      {showJson && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-3 font-mono text-xs animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-cyan-400 font-bold flex items-center gap-2">
              <Code2 className="w-4 h-4" />
              Phase 6 Family Risk Engine Contract Payload
            </span>
            <button
              onClick={copyJson}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:text-cyan-400 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy JSON'}</span>
            </button>
          </div>
          <pre className="max-h-96 overflow-y-auto p-4 bg-slate-900/90 rounded-xl text-slate-300 text-[11px] leading-relaxed">
            {JSON.stringify(analysis, null, 2)}
          </pre>
        </div>
      )}

      {/* Quality Panel */}
      <ProductQualityPanel
        quality={analysis.quality_summary}
        productConfidence={analysis.product_confidence}
      />

      {/* Safe Alternatives & Allergy Substitutions Panel */}
      <ProductAlternativesPanel
        productId={product.id}
        productName={product.name}
      />

      {/* Main Content Grid: Ingredients & Statements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Ordered Ingredients List */}
        <div className="lg:col-span-2 space-y-6">
          <ProductIngredientList ingredients={analysis.ingredients} />
        </div>

        {/* Right 1 Col: Allergen Statements, Identifiers, Provenance */}
        <div className="space-y-6">
          {/* Allergen Statements */}
          <ProductAllergenStatement
            statements={product.allergen_statements}
            rawCrossContact={product.cross_contact_statement_raw}
          />

          {/* Barcode & GTIN Identifiers */}
          <ProductIdentifierCard identifiers={product.identifiers} />

          {/* Provenance Data Sources */}
          <ProductSourceCard sources={product.data_sources} />
        </div>
      </div>

      {/* Risk Finding Explanation Drawer */}
      <RiskExplanationDrawer
        finding={selectedFinding}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedFinding(null);
        }}
      />
    </div>
  );
};

