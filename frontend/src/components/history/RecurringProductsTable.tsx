import React from 'react';
import { Package, HelpCircle, ArrowUpRight, ArrowDownRight, Sparkles, User, ExternalLink } from 'lucide-react';
import { RecurringProductItem } from '../../types/history';

interface RecurringProductsTableProps {
  products: RecurringProductItem[];
  onOpenFindingExplanation: (findingId: string) => void;
}

export const RecurringProductsTable: React.FC<RecurringProductsTableProps> = ({
  products,
  onOpenFindingExplanation,
}) => {
  if (products.length === 0) {
    return (
      <div className="card p-8 text-center text-slate-500">
        <Package className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
        <p className="text-sm font-semibold">No recurring products found in this period</p>
        <p className="text-xs text-slate-400 mt-1">Products purchased across multiple receipts will appear here.</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-slate-200/80 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="w-4 h-4 text-emerald-600" />
            <span>Recurring Purchased Products</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Products repeatedly purchased by the household, with personalized member impacts.
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
          {products.length} Products Tracked
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200/80">
            <tr>
              <th className="py-3 px-4">Product & Brand</th>
              <th className="py-3 px-4">Purchases</th>
              <th className="py-3 px-4">Total Spend & Avg</th>
              <th className="py-3 px-4">Affected Members</th>
              <th className="py-3 px-4 text-right">Explainability</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.map((item) => {
              const hasAttention = item.high_attention_events > 0;
              const hasConflict = item.potential_conflict_events > 0;
              const hasVerif = item.verification_required_events > 0;

              return (
                <tr key={item.product_id} className="hover:bg-slate-50/60 transition-colors">
                  {/* Product & Brand */}
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900 text-sm">{item.product_name}</div>
                    {item.brand_name && (
                      <div className="text-[11px] text-slate-400 font-medium">{item.brand_name}</div>
                    )}
                  </td>

                  {/* Purchases */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="font-black text-slate-900 text-sm">{item.purchase_count}x</span>
                    <span className="text-slate-400 text-xs ml-1">({item.number_of_receipts} receipts)</span>
                  </td>

                  {/* Spend & Dynamics */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="font-bold text-slate-900">₹{item.total_spend.toLocaleString()}</div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1">
                      <span>Avg: ₹{item.average_price}</span>
                      {item.price_change !== null && item.price_change !== undefined && (
                        <span className={`inline-flex items-center text-[10px] font-semibold ${
                          item.price_change > 0 ? 'text-rose-600' : item.price_change < 0 ? 'text-emerald-600' : 'text-slate-400'
                        }`}>
                          {item.price_change > 0 ? (
                            <>
                              <ArrowUpRight className="w-3 h-3" />
                              +₹{item.price_change}
                            </>
                          ) : item.price_change < 0 ? (
                            <>
                              <ArrowDownRight className="w-3 h-3" />
                              ₹{item.price_change}
                            </>
                          ) : null}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Affected Members */}
                  <td className="py-3.5 px-4">
                    {item.affected_members.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {item.affected_members.map((mem) => {
                          const memHasAttention = (mem.status_counts['high_attention'] || 0) > 0;
                          const memHasVerif = (mem.status_counts['verification_required'] || 0) > 0;

                          return (
                            <span
                              key={mem.member_id}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                                memHasAttention
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : memHasVerif
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}
                              title={mem.conflict_types.join(', ')}
                            >
                              <User className="w-2.5 h-2.5" />
                              <span>{mem.member_name}</span>
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">No conflicts configured</span>
                    )}
                  </td>

                  {/* Explainability Drilldown */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    {item.sample_finding_id ? (
                      <button
                        onClick={() => onOpenFindingExplanation(item.sample_finding_id!)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 text-xs font-semibold transition-all group"
                      >
                        <Sparkles className="w-3 h-3 text-indigo-500 group-hover:rotate-12 transition-transform" />
                        <span>Why Flagged?</span>
                      </button>
                    ) : (
                      <span className="text-slate-400 text-xs italic">No finding</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
