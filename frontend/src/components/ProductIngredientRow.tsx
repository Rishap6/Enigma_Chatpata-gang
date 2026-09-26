import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  GitBranch,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ShieldAlert,
} from 'lucide-react';
import { AnalyzedProductIngredient } from '../types';
import { IngredientCategoryBadge } from './IngredientCategoryBadge';
import { SourceStatusBadge } from './SourceStatusBadge';

interface ProductIngredientRowProps {
  ingredient: AnalyzedProductIngredient;
}

export const ProductIngredientRow: React.FC<ProductIngredientRowProps> = ({ ingredient }) => {
  const [expanded, setExpanded] = useState(false);
  const confidencePercent = Math.round(ingredient.confidence * 100);

  const hasDerivation =
    ingredient.relationship_chains && ingredient.relationship_chains.length > 0;
  const isUnresolved = !ingredient.normalized_name || ingredient.match_method === 'unresolved';

  return (
    <div
      className={`border rounded-xl transition-all duration-200 ${
        isUnresolved
          ? 'bg-rose-500/5 border-rose-500/30'
          : ingredient.requires_verification
          ? 'bg-amber-500/5 border-amber-500/30'
          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700/80'
      }`}
    >
      <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Sequence + Names */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="shrink-0 w-6 h-6 rounded-full bg-slate-800 border border-slate-700 text-xs font-mono text-slate-400 flex items-center justify-center font-semibold mt-0.5">
            {ingredient.sequence}
          </span>

          <div className="min-w-0">
            {/* Raw Label Text */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-100 text-sm">{ingredient.raw_name}</span>

              {ingredient.normalized_name &&
                ingredient.normalized_name.toLowerCase() !== ingredient.raw_name.toLowerCase() && (
                  <span className="text-xs text-cyan-400 font-medium flex items-center gap-1">
                    <span>→</span>
                    <span className="underline decoration-cyan-400/40">
                      {ingredient.normalized_name}
                    </span>
                  </span>
                )}

              {isUnresolved && (
                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 font-medium">
                  <HelpCircle className="w-3 h-3" />
                  Unrecognized
                </span>
              )}

              {ingredient.requires_verification && !isUnresolved && (
                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-medium">
                  <AlertTriangle className="w-3 h-3" />
                  Source Uncertain
                </span>
              )}
            </div>

            {/* Categories & Allergens Chips */}
            <div className="flex items-center gap-1.5 flex-wrap mt-2">
              {ingredient.categories.map((cat, idx) => (
                <IngredientCategoryBadge key={idx} category={cat} />
              ))}

              {ingredient.allergens.map((alg, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/30 font-medium"
                >
                  <ShieldAlert className="w-3 h-3 text-rose-400" />
                  {alg.name || (alg as any).allergen_name}
                  {alg.is_derived && <span className="text-[10px] text-rose-400/70">(derived)</span>}
                </span>
              ))}

              {ingredient.sources.map((src, idx) => (
                <SourceStatusBadge
                  key={idx}
                  sourceType={src.type}
                  sourceStatus={src.status}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right: Confidence & Derivation Details Button */}
        <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800/80">
          <div className="text-right">
            <span className="text-xs text-slate-400 block font-mono">
              {isUnresolved ? '0%' : `${confidencePercent}%`}
            </span>
            <span className="text-[10px] text-slate-500 capitalize">
              {ingredient.match_method || 'canonical'}
            </span>
          </div>

          {hasDerivation && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-800 text-slate-300 hover:text-cyan-400 hover:bg-slate-700/80 border border-slate-700 transition-colors"
            >
              <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
              <span>Derivation</span>
              {expanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Expanded Phase 2 Derivation Tree */}
      {expanded && hasDerivation && (
        <div className="px-4 pb-4 pt-2 border-t border-slate-800 bg-slate-950/40 rounded-b-xl space-y-3">
          <span className="text-xs font-semibold text-slate-400 block">
            Phase 2 Knowledge Derivation Path:
          </span>

          <div className="space-y-2">
            {ingredient.relationship_chains.map((chain, cIdx) => (
              <div
                key={cIdx}
                className="flex items-center gap-2 text-xs font-mono bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 text-slate-300 overflow-x-auto"
              >
                {chain.path.map((node: string, nIdx: number) => (
                  <React.Fragment key={nIdx}>
                    <span
                      className={`px-2 py-0.5 rounded font-semibold ${
                        nIdx === chain.path.length - 1
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-slate-800 text-slate-200'
                      }`}
                    >
                      {node}
                    </span>
                    {nIdx < chain.path.length - 1 && (
                      <span className="text-cyan-400 font-bold">
                        → {chain.relationship_types[nIdx] || 'derived_from'} →
                      </span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
