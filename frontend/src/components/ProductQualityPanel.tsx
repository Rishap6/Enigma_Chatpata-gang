import React from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  FileCheck,
  Percent,
  CheckCircle2,
  HelpCircle,
  Database,
} from 'lucide-react';
import { ProductQualitySummary } from '../types';

interface ProductQualityPanelProps {
  quality: ProductQualitySummary;
  productConfidence: number;
}

export const ProductQualityPanel: React.FC<ProductQualityPanelProps> = ({
  quality,
  productConfidence,
}) => {
  const isHighConfidence = quality.overall_status === 'high_confidence';
  const confidencePercent = Math.round(productConfidence * 100);

  return (
    <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
      {/* Top Header & Status Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            Product Data Quality
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Deterministic evaluation of identification, ingredient coverage, and source provenance
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs text-slate-400 block">Overall Score</span>
            <span className="text-lg font-bold text-slate-100">{confidencePercent}%</span>
          </div>

          {isHighConfidence ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="w-4 h-4" />
              High Confidence
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <AlertTriangle className="w-4 h-4" />
              Verification Required
            </span>
          )}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Identification */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3.5">
          <span className="text-xs text-slate-400 block mb-1">Identification</span>
          <div className="flex items-center gap-2">
            <span
              className={`text-sm font-bold ${
                quality.identification_confidence === 'High'
                  ? 'text-emerald-400'
                  : quality.identification_confidence === 'Medium'
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {quality.identification_confidence}
            </span>
          </div>
        </div>

        {/* Ingredient Coverage */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3.5">
          <span className="text-xs text-slate-400 block mb-1">Ingredient Coverage</span>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-200">
              <span>{quality.ingredient_coverage_pct}%</span>
              <span className="text-slate-400 font-normal">
                {quality.recognized_ingredients}/{quality.total_ingredients}
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  quality.ingredient_coverage_pct >= 90
                    ? 'bg-emerald-400'
                    : quality.ingredient_coverage_pct >= 70
                    ? 'bg-amber-400'
                    : 'bg-rose-400'
                }`}
                style={{ width: `${quality.ingredient_coverage_pct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Statements */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3.5">
          <span className="text-xs text-slate-400 block mb-1">Statements</span>
          <div className="space-y-0.5 text-xs">
            <div className="flex items-center gap-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  quality.has_allergen_statement ? 'bg-emerald-400' : 'bg-slate-600'
                }`}
              />
              <span className={quality.has_allergen_statement ? 'text-slate-200' : 'text-slate-500'}>
                Allergen Label
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  quality.has_cross_contact_statement ? 'bg-amber-400' : 'bg-slate-600'
                }`}
              />
              <span
                className={
                  quality.has_cross_contact_statement ? 'text-slate-200' : 'text-slate-500'
                }
              >
                Cross-contact
              </span>
            </div>
          </div>
        </div>

        {/* Primary Source */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3.5">
          <span className="text-xs text-slate-400 block mb-1">Data Source</span>
          <div className="flex items-center gap-1.5 text-slate-200 text-xs font-medium capitalize">
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span className="truncate">{quality.primary_source.replace('_', ' ')}</span>
          </div>
        </div>
      </div>

      {/* Uncertainty Notice if Verification Required */}
      {quality.unresolved_ingredients > 0 && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block">
              {quality.unresolved_ingredients} Unrecognized Ingredient(s)
            </span>
            <span>
              Some ingredients on this label could not be mapped to canonical knowledge. Phase 2
              cannot certify complete safety until these items are verified.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
