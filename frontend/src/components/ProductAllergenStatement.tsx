import React from 'react';
import { AlertCircle, AlertTriangle, Factory, ShieldAlert } from 'lucide-react';
import { ProductAllergenStatement as StatementType } from '../types';

interface ProductAllergenStatementProps {
  statements: StatementType[];
  rawCrossContact?: string | null;
}

export const ProductAllergenStatement: React.FC<ProductAllergenStatementProps> = ({
  statements,
  rawCrossContact,
}) => {
  if ((!statements || statements.length === 0) && !rawCrossContact) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 text-center text-xs text-slate-500">
        No manufacturer allergen statements registered for this product.
      </div>
    );
  }

  return (
    <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
      <div className="pb-3 border-b border-slate-800">
        <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-cyan-400" />
          Manufacturer Allergen & Advisory Statements
        </h4>
        <p className="text-xs text-slate-400 mt-0.5">
          Structured label disclosures (advisories are preserved verbatim without personalized risk scoring)
        </p>
      </div>

      <div className="space-y-3">
        {statements.map((stmt) => {
          const isContains = stmt.statement_type === 'contains';
          const isMayContain = stmt.statement_type === 'may_contain';
          const isFacility = stmt.statement_type === 'manufactured_in_facility';

          return (
            <div
              key={stmt.id}
              className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs ${
                isContains
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  : isMayContain
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
              }`}
            >
              {isContains && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
              {isMayContain && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />}
              {isFacility && <Factory className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />}

              <div className="space-y-0.5">
                <span className="font-semibold block uppercase tracking-wider text-[10px] opacity-80">
                  {stmt.statement_type.replace(/_/g, ' ')}
                </span>
                <p className="font-medium text-slate-100">{stmt.statement_text}</p>
              </div>
            </div>
          );
        })}

        {rawCrossContact && !statements.some((s) => s.statement_type === 'cross_contact') && (
          <div className="p-3.5 rounded-xl border bg-amber-500/10 border-amber-500/30 text-amber-300 flex items-start gap-3 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold block uppercase tracking-wider text-[10px] opacity-80">
                Cross Contact Advisory
              </span>
              <p className="font-medium text-slate-100">{rawCrossContact}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
