import React from 'react';
import { RelationshipChainItem } from '../types';
import { ArrowDown, AlertTriangle, ShieldCheck, GitCommit } from 'lucide-react';

interface IngredientRelationshipTreeProps {
  rootName: string;
  chains: RelationshipChainItem[];
  directRelationships?: {
    from: string;
    relationship: string;
    to: string;
    confidence: number;
  }[];
  cycleDetected?: boolean;
}

export const IngredientRelationshipTree: React.FC<IngredientRelationshipTreeProps> = ({
  rootName,
  chains,
  directRelationships = [],
  cycleDetected = false,
}) => {
  if (chains.length === 0 && directRelationships.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-500 flex items-center gap-2">
        <GitCommit className="w-4 h-4 text-slate-400" />
        <span>Root baseline ingredient. No derived parent ancestry relationships in database.</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {cycleDetected && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Cyclical derivation detected in ancestry graph. Traversal terminated safely.</span>
        </div>
      )}

      {/* Render Chains */}
      <div className="space-y-4">
        {chains.map((chain, cIdx) => (
          <div
            key={cIdx}
            className="p-4 rounded-xl bg-slate-900 text-white border border-slate-800 shadow-md font-sans"
            data-testid={`relationship-chain-${cIdx}`}
          >
            <div className="flex items-center justify-between mb-3 text-xs text-slate-400 border-b border-slate-800 pb-2">
              <span className="font-semibold text-slate-300 uppercase tracking-wider">
                Derivation Path #{cIdx + 1}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 text-[10px] font-medium border border-emerald-800/60 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Trace Complete
              </span>
            </div>

            <div className="flex flex-col items-start gap-1">
              {chain.path.map((nodeName, nIdx) => {
                const isRoot = nIdx === 0;
                const isTarget = nIdx === chain.path.length - 1;
                const relType =
                  nIdx < chain.relationship_types.length
                    ? chain.relationship_types[nIdx]
                    : 'derived_from';

                return (
                  <React.Fragment key={nIdx}>
                    <div
                      className={`flex items-center gap-3 px-3.5 py-2 rounded-lg w-full transition-all ${
                        isRoot
                          ? 'bg-blue-600/30 border border-blue-500/50 text-blue-100 font-semibold'
                          : isTarget
                          ? 'bg-emerald-900/40 border border-emerald-600/50 text-emerald-200 font-medium'
                          : 'bg-slate-800/80 border border-slate-700/80 text-slate-200'
                      }`}
                    >
                      <div
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          isRoot
                            ? 'bg-blue-400 ring-4 ring-blue-500/20'
                            : isTarget
                            ? 'bg-emerald-400 ring-4 ring-emerald-500/20'
                            : 'bg-slate-400'
                        }`}
                      />
                      <span className="text-sm">{nodeName}</span>
                      {isRoot && (
                        <span className="ml-auto text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/30 text-blue-300">
                          Raw / Selected
                        </span>
                      )}
                      {isTarget && !isRoot && (
                        <span className="ml-auto text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/30 text-emerald-300">
                          Root Origin
                        </span>
                      )}
                    </div>

                    {!isTarget && (
                      <div className="flex items-center gap-2 pl-4 py-1 text-slate-400">
                        <ArrowDown className="w-4 h-4 text-indigo-400" />
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700">
                          {relType}
                        </span>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
