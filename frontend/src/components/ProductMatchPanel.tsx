import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Search,
  Sparkles,
  Barcode,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  ShieldCheck,
  Tag,
  ArrowRight,
} from 'lucide-react';
import { productService } from '../services/productService';
import { ProductMatchResponse } from '../types';

export const ProductMatchPanel: React.FC = () => {
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [barcode, setBarcode] = useState('');
  const [matchResult, setMatchResult] = useState<ProductMatchResponse | null>(null);

  const matchMutation = useMutation({
    mutationFn: productService.matchProduct,
    onSuccess: (data) => {
      setMatchResult(data);
    },
  });

  const handleMatch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim() && !barcode.trim()) return;

    matchMutation.mutate({
      name: name.trim(),
      brand: brand.trim() || undefined,
      barcode: barcode.trim() || undefined,
    });
  };

  const loadSample = (sampleName: string, sampleBrand?: string, sampleBarcode?: string) => {
    setName(sampleName);
    setBrand(sampleBrand || '');
    setBarcode(sampleBarcode || '');
    matchMutation.mutate({
      name: sampleName,
      brand: sampleBrand || undefined,
      barcode: sampleBarcode || undefined,
    });
  };

  return (
    <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            Product Match Simulator
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Test multi-signal matching (Barcode → GTIN → Brand + Normalized Name → OCR Fuzzy Match)
          </p>
        </div>

        {/* Quick sample chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-slate-500 font-medium">Quick Test:</span>
          <button
            type="button"
            onClick={() => loadSample('BRIT NUTR CHC 40G', 'Britannia')}
            className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-cyan-400 hover:bg-slate-700 transition-colors"
          >
            Receipt OCR
          </button>
          <button
            type="button"
            onClick={() => loadSample('Demo Protein Bar', '', '08901234560010')}
            className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-cyan-400 hover:bg-slate-700 transition-colors"
          >
            Barcode GTIN
          </button>
          <button
            type="button"
            onClick={() => loadSample('Chocolate')}
            className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-amber-400 hover:bg-slate-700 transition-colors"
          >
            Ambiguous
          </button>
          <button
            type="button"
            onClick={() => loadSample('XYZ UNKNOWN ALIEN FOOD 999')}
            className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-rose-400 hover:bg-slate-700 transition-colors"
          >
            Unknown
          </button>
        </div>
      </div>

      {/* Input Form */}
      <form onSubmit={handleMatch} className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-5">
          <label className="text-xs font-semibold text-slate-400 block mb-1">
            Raw Product Name / OCR Label Text *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. BRIT NUTR CHC 40G"
            className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        <div className="md:col-span-3">
          <label className="text-xs font-semibold text-slate-400 block mb-1">
            Brand Hint (Optional)
          </label>
          <input
            type="text"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="e.g. Britannia"
            className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        <div className="md:col-span-4">
          <label className="text-xs font-semibold text-slate-400 block mb-1">
            Barcode / GTIN (Optional)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="e.g. 08901234560010"
              className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
            <button
              type="submit"
              disabled={(!name.trim() && !barcode.trim()) || matchMutation.isPending}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-cyan-950/40 disabled:opacity-50 shrink-0"
            >
              <Search className="w-3.5 h-3.5" />
              <span>{matchMutation.isPending ? 'Matching...' : 'Match'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Match Results Display */}
      {matchResult && (
        <div className="pt-4 border-t border-slate-800 space-y-4">
          {/* Matched State */}
          {matchResult.matched && matchResult.product && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confident Match Found</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                    {Math.round(matchResult.confidence * 100)}% Match
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono capitalize">
                    {matchResult.match_method?.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                <div>
                  <h4 className="text-sm font-bold text-slate-100">
                    {matchResult.product.name}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                    {matchResult.product.brand && (
                      <span className="text-indigo-400 font-medium">
                        {matchResult.product.brand.name}
                      </span>
                    )}
                    {matchResult.product.category && (
                      <span>• {matchResult.product.category.name}</span>
                    )}
                    {matchResult.product.gtin && (
                      <span className="font-mono text-[11px] text-slate-500">
                        • GTIN: {matchResult.product.gtin}
                      </span>
                    )}
                  </div>
                </div>

                <Link
                  to={`/products/${matchResult.product.id}`}
                  className="px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors"
                >
                  <span>View Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}

          {/* Ambiguous / Candidate Selection Required */}
          {!matchResult.matched && matchResult.requires_selection && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
                  <AlertCircle className="w-4 h-4" />
                  <span>Ambiguous Match — User Selection Required</span>
                </div>
                <span className="text-xs text-amber-300">
                  {matchResult.candidates.length} candidates found
                </span>
              </div>

              <p className="text-xs text-slate-300">
                Multiple products matched with moderate confidence. Select the matching product below:
              </p>

              <div className="space-y-2">
                {matchResult.candidates.map((cand, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-colors"
                  >
                    <div>
                      <span className="text-sm font-semibold text-slate-100 block">
                        {cand.product.name}
                      </span>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                        {cand.product.brand_name && (
                          <span className="text-indigo-400">{cand.product.brand_name}</span>
                        )}
                        {cand.product.category_name && (
                          <span>• {cand.product.category_name}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold text-slate-300">
                        {Math.round(cand.confidence * 100)}%
                      </span>
                      <Link
                        to={`/products/${cand.product.id}`}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg transition-colors"
                      >
                        Select
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completely Unknown / Unmatched */}
          {!matchResult.matched && !matchResult.requires_selection && (
            <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl flex items-start gap-3 text-xs text-slate-400">
              <HelpCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-300 block mb-0.5">
                  No Matching Product Found
                </span>
                <span>
                  The provided name or barcode did not match any known products in our catalog.
                  The platform never hallucinates or fabricates product records.
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
