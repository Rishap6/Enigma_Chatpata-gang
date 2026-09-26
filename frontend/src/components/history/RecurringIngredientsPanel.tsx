import React, { useState } from 'react';
import { Database, GitFork, AlertTriangle, CheckCircle2, ChevronRight, User } from 'lucide-react';
import { RecurringIngredientItem } from '../../types/history';

interface RecurringIngredientsPanelProps {
  directlyObserved: RecurringIngredientItem[];
  relationshipDerived: RecurringIngredientItem[];
}

export const RecurringIngredientsPanel: React.FC<RecurringIngredientsPanelProps> = ({
  directlyObserved,
  relationshipDerived,
}) => {
  const [activeTab, setActiveTab] = useState<'direct' | 'derived'>('direct');

  const items = activeTab === 'direct' ? directlyObserved : relationshipDerived;

  return (
    <div className="card overflow-hidden">
      {/* Header with Tab switcher */}
      <div className="p-4 sm:p-5 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-600" />
            <span>Recurring Ingredients Intelligence</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Aggregated across all household grocery purchases, powered by Phase 2 Knowledge Graph.
          </p>
        </div>

        <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/70">
          <button
            onClick={() => setActiveTab('direct')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'direct'
                ? 'bg-white text-emerald-800 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Directly Observed ({directlyObserved.length})
          </button>
          <button
            onClick={() => setActiveTab('derived')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'derived'
                ? 'bg-white text-emerald-800 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Knowledge Traced ({relationshipDerived.length})
          </button>
        </div>
      </div>

      {/* Ingredient Items Grid */}
      <div className="p-4 sm:p-5">
        {items.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs italic">
            No {activeTab === 'direct' ? 'directly observed' : 'knowledge-derived'} ingredients found for this period.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((ing, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:shadow-xs transition-all space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{ing.ingredient_name}</div>
                    <div className="text-[11px] text-slate-400 font-medium">
                      Appeared in {ing.number_of_products_containing} product(s) ({ing.purchase_events_count} purchase events)
                    </div>
                  </div>
                  {ing.source_uncertainty && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1 shrink-0">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      Uncertain Origin
                    </span>
                  )}
                </div>

                {/* Derivation Path if derived */}
                {ing.is_derived && ing.derivation_path && (
                  <div className="p-2 rounded-lg bg-indigo-50/70 border border-indigo-100 text-[11px] text-indigo-900 flex items-center gap-1.5 font-mono">
                    <GitFork className="w-3 h-3 text-indigo-600 shrink-0" />
                    <span className="truncate">{ing.derivation_path}</span>
                  </div>
                )}

                {/* Affected Members */}
                {ing.affected_members.length > 0 && (
                  <div className="flex items-center gap-1 text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                    <User className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="font-medium truncate">
                      Matches configured requirements for: <strong className="text-slate-800">{ing.affected_members.join(', ')}</strong>
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
