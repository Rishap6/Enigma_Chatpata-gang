import React from 'react';
import { Database, ShieldCheck, ExternalLink, Calendar } from 'lucide-react';
import { ProductDataSource } from '../types';

interface ProductSourceCardProps {
  sources: ProductDataSource[];
}

export const ProductSourceCard: React.FC<ProductSourceCardProps> = ({ sources }) => {
  if (!sources || sources.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 text-center text-xs text-slate-500">
        No provenance records attached to this product.
      </div>
    );
  }

  return (
    <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
          <Database className="w-4 h-4 text-cyan-400" />
          Data Provenance & Sources ({sources.length})
        </h4>
        <span className="text-[11px] text-slate-400">Verifiable Audit Trail</span>
      </div>

      <div className="space-y-3">
        {sources.map((src) => {
          const confPercent = Math.round(src.confidence * 100);
          return (
            <div
              key={src.id}
              className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200">{src.source_name}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 capitalize">
                  {src.source_type.replace('_', ' ')}
                </span>
              </div>

              {src.reference && (
                <p className="text-slate-400 text-xs">{src.reference}</p>
              )}

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-800/50">
                <div className="flex items-center gap-1 text-slate-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{confPercent}% confidence</span>
                </div>

                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{new Date(src.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
