import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Leaf,
  Heart,
  BadgeAlert,
  HelpCircle,
} from 'lucide-react';
import { productService } from '../services/productService';
import { ProductAlternativesResponse, ProductAlternativeItem } from '../types';

interface ProductAlternativesPanelProps {
  productId: string;
  productName?: string;
  hasAllergyRisk?: boolean;
}

export const ProductAlternativesPanel: React.FC<ProductAlternativesPanelProps> = ({
  productId,
  productName,
  hasAllergyRisk = true,
}) => {
  const {
    data: altData,
    isLoading,
    isError,
  } = useQuery<ProductAlternativesResponse>({
    queryKey: ['product-alternatives', productId],
    queryFn: () => productService.getProductAlternatives(productId),
    enabled: Boolean(productId),
  });

  if (isLoading) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 animate-pulse">
        <div className="h-5 bg-slate-800 rounded w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-32 bg-slate-800/60 rounded-2xl" />
          <div className="h-32 bg-slate-800/60 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError || !altData || altData.alternatives.length === 0) {
    return null;
  }

  const { flagged_allergens, alternatives } = altData;

  return (
    <div className="bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
      {/* Glow Effect */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20">
              <Leaf className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <span>Safe Alternatives & Substitutions</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                {alternatives.length} Recommended
              </span>
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            {flagged_allergens.length > 0
              ? `Healthier, allergy-safe substitutes free from ${flagged_allergens.join(', ')}`
              : 'Cleaner, allergen-free recommendations in this category'}
          </p>
        </div>

        {/* Flagged allergens chips */}
        {flagged_allergens.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-amber-400 flex items-center gap-1">
              <BadgeAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>Flags:</span>
            </span>
            {flagged_allergens.map((alg) => (
              <span
                key={alg}
                className="px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px] font-bold"
              >
                {alg}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Alternatives Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
        {alternatives.map((item, idx) => (
          <div
            key={item.id || idx}
            className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/40 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4 transition-all group"
          >
            <div className="space-y-3">
              {/* Header inside card */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  {item.alternative_brand && (
                    <span className="text-[10px] font-bold tracking-wider text-emerald-400 uppercase">
                      {item.alternative_brand}
                    </span>
                  )}
                  <h4 className="text-sm font-bold text-slate-100 group-hover:text-emerald-300 transition-colors leading-snug">
                    {item.alternative_name}
                  </h4>
                </div>
                <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Tags */}
              {item.dietary_tags && item.dietary_tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {item.dietary_tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-semibold"
                    >
                      ✨ {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Reason / Why it's safe */}
              <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800 space-y-1">
                <p className="text-[11px] font-medium text-slate-200 leading-relaxed">
                  {item.reason}
                </p>
                {item.health_benefit && (
                  <p className="text-[10px] text-slate-400 leading-relaxed pt-0.5">
                    {item.health_benefit}
                  </p>
                )}
              </div>
            </div>

            {/* Action link if existing DB product */}
            {item.alternative_product_id ? (
              <Link
                to={`/products/${item.alternative_product_id}`}
                className="w-full py-2 px-3 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all border border-emerald-500/30"
              >
                <span>View Product Details</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-700/50">
                <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Verified Safe Substitute</span>
                </span>
                <span className="text-[10px] text-slate-500">{item.alternative_category || 'Healthy Food'}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
