import React from 'react';
import { Layers, CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react';
import { AnalyzedProductIngredient } from '../types';
import { ProductIngredientRow } from './ProductIngredientRow';

interface ProductIngredientListProps {
  ingredients: AnalyzedProductIngredient[];
}

export const ProductIngredientList: React.FC<ProductIngredientListProps> = ({ ingredients }) => {
  const totalCount = ingredients.length;
  const verifiedCount = ingredients.filter(
    (i) => !i.requires_verification && i.normalized_name && i.match_method !== 'unresolved'
  ).length;
  const uncertainCount = ingredients.filter(
    (i) => i.requires_verification && i.normalized_name && i.match_method !== 'unresolved'
  ).length;
  const unresolvedCount = ingredients.filter(
    (i) => !i.normalized_name || i.match_method === 'unresolved'
  ).length;

  return (
    <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
      {/* Header & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            Ordered Label Ingredients ({totalCount})
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Preserved verbatim from manufacturer label and normalized into Phase 2 intelligence
          </p>
        </div>

        {/* Breakdown chips */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {verifiedCount} Verified
          </span>

          {uncertainCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />
              {uncertainCount} Uncertain
            </span>
          )}

          {unresolvedCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium">
              <HelpCircle className="w-3.5 h-3.5" />
              {unresolvedCount} Unresolved
            </span>
          )}
        </div>
      </div>

      {/* Rows */}
      <div className="space-y-3">
        {ingredients.map((ing) => (
          <ProductIngredientRow key={ing.sequence} ingredient={ing} />
        ))}
      </div>
    </div>
  );
};
