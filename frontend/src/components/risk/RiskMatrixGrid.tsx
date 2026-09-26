import React from 'react';
import { FamilyRiskMatrixCell, RiskFinding } from '../../types';

interface RiskMatrixGridProps {
  matrix: FamilyRiskMatrixCell[];
  onSelectFinding: (finding: RiskFinding) => void;
}

export const RiskMatrixGrid: React.FC<RiskMatrixGridProps> = ({
  matrix,
  onSelectFinding,
}) => {
  // Extract distinct family members and products
  const memberMap = new Map<string, string>();
  const productMap = new Map<string, string>();

  matrix.forEach((cell) => {
    memberMap.set(cell.member_id, cell.member_name);
    productMap.set(cell.product_id, cell.product_name);
  });

  const memberIds = Array.from(memberMap.keys());
  const productIds = Array.from(productMap.keys());

  // Index cells by (productId, memberId)
  const cellLookup = new Map<string, FamilyRiskMatrixCell>();
  matrix.forEach((c) => {
    cellLookup.set(`${c.product_id}:${c.member_id}`, c);
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'high_attention':
        return '🔴';
      case 'potential_conflict':
        return '🟠';
      case 'verification_required':
        return '🟡';
      case 'no_configured_conflict':
        return '🟢';
      case 'insufficient_information':
      default:
        return '⚪';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'high_attention':
        return 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20 text-red-300';
      case 'potential_conflict':
        return 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20 text-amber-300';
      case 'verification_required':
        return 'bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20 text-yellow-300';
      case 'no_configured_conflict':
        return 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-300';
      case 'insufficient_information':
      default:
        return 'bg-slate-800/40 border-slate-700 hover:bg-slate-800 text-slate-400';
    }
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60 shadow-lg">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-800 bg-slate-950/80">
            <th className="py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider min-w-[200px]">
              Purchased Product
            </th>
            {memberIds.map((mId) => (
              <th
                key={mId}
                className="py-3 px-4 text-xs font-semibold text-slate-300 text-center uppercase tracking-wider min-w-[120px]"
              >
                <div className="flex flex-col items-center">
                  <div className="w-7 h-7 rounded-full bg-indigo-950 border border-indigo-700/50 flex items-center justify-center text-xs font-bold text-indigo-300 mb-1">
                    {memberMap.get(mId)?.charAt(0) || 'M'}
                  </div>
                  <span>{memberMap.get(mId)}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {productIds.map((pId) => {
            const prodName = productMap.get(pId) || 'Product';
            return (
              <tr key={pId} className="hover:bg-slate-800/30 transition-colors">
                <td className="py-3 px-4 text-sm font-medium text-slate-200">
                  <div className="truncate max-w-[240px]" title={prodName}>
                    {prodName}
                  </div>
                </td>
                {memberIds.map((mId) => {
                  const cell = cellLookup.get(`${pId}:${mId}`);
                  if (!cell) {
                    return (
                      <td key={mId} className="py-2.5 px-3 text-center text-slate-600">
                        -
                      </td>
                    );
                  }

                  const topFinding = cell.findings[0];

                  return (
                    <td key={mId} className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => topFinding && onSelectFinding(topFinding)}
                        title={`${cell.member_name} - ${cell.product_name}: ${cell.top_finding_title || cell.status}`}
                        className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-transform active:scale-95 ${getStatusBg(
                          cell.status
                        )}`}
                      >
                        <span className="text-base">{getStatusIcon(cell.status)}</span>
                        {cell.findings_count > 1 && (
                          <span className="text-[10px] font-bold opacity-80">
                            +{cell.findings_count}
                          </span>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
