import React from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  Barcode,
  Layers,
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { ProductSummary } from '../types';
import { ProductCategoryBadge } from './ProductCategoryBadge';

interface ProductCardProps {
  product: ProductSummary;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const confidencePercent = Math.round(product.confidence * 100);

  return (
    <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 shadow-lg transition-all duration-300 hover:shadow-cyan-950/20 hover:-translate-y-0.5 flex flex-col justify-between group">
      <div>
        {/* Brand & Category Header */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            {product.brand_name ? (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {product.brand_name}
              </span>
            ) : (
              <span className="text-xs text-slate-500">Unbranded</span>
            )}
            {product.category_name && (
              <ProductCategoryBadge category={product.category_name} size="sm" />
            )}
          </div>

          {/* Verification / Quality Status */}
          {product.requires_verification ? (
            <span
              className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30"
              title="Verification required due to source uncertainty or unverified ingredients"
            >
              <AlertTriangle className="w-3 h-3" />
              Verify
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
              title="Verified structured product profile"
            >
              <ShieldCheck className="w-3 h-3" />
              Verified
            </span>
          )}
        </div>

        {/* Product Title */}
        <h3 className="text-lg font-semibold text-slate-100 group-hover:text-cyan-400 transition-colors line-clamp-2 mb-2">
          {product.name}
        </h3>

        {/* Pack Size & Barcode Specs */}
        <div className="space-y-1.5 mb-4 text-xs text-slate-400">
          {(product.pack_size || product.unit) && (
            <div className="flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-slate-500" />
              <span>
                Net Wt: {product.pack_size} {product.unit}
              </span>
            </div>
          )}

          {(product.gtin || product.barcode) && (
            <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400">
              <Barcode className="w-3.5 h-3.5 text-slate-500" />
              <span>{product.gtin || product.barcode}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer Specs & Action */}
      <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1 text-slate-400">
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <span>{product.ingredient_count} ingredients</span>
          </div>
          <span className="text-slate-600">•</span>
          <div className="flex items-center gap-1 text-slate-300 font-medium">
            <span>{confidencePercent}% conf</span>
          </div>
        </div>

        <Link
          to={`/products/${product.id}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300 group-hover:translate-x-0.5 transition-all"
        >
          <span>View Product</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};
