import React from 'react';
import { Barcode, Globe, Star, ShieldCheck } from 'lucide-react';
import { ProductIdentifier } from '../types';

interface ProductIdentifierCardProps {
  identifiers: ProductIdentifier[];
}

export const ProductIdentifierCard: React.FC<ProductIdentifierCardProps> = ({ identifiers }) => {
  if (!identifiers || identifiers.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 text-center text-xs text-slate-500">
        No external identifiers registered for this product.
      </div>
    );
  }

  return (
    <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
          <Barcode className="w-4 h-4 text-cyan-400" />
          Product Identifiers ({identifiers.length})
        </h4>
        <span className="text-[11px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
          Phase 4 Ready
        </span>
      </div>

      <div className="space-y-2.5">
        {identifiers.map((ident) => (
          <div
            key={ident.id}
            className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs"
          >
            <div className="flex items-center gap-3">
              <span className="font-semibold text-slate-300 px-2 py-0.5 rounded bg-slate-800 text-[11px] font-mono">
                {ident.identifier_type}
              </span>
              <span className="font-mono text-cyan-400 font-bold tracking-wider">
                {ident.identifier_value}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {ident.country && (
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                  <Globe className="w-3 h-3 text-slate-500" />
                  {ident.country}
                </span>
              )}

              {ident.is_primary && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Star className="w-3 h-3 fill-cyan-400/30" />
                  Primary
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
