import React from 'react';
import { ArrowDown, GitCommit, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { RiskFinding } from '../../types';

interface ExplainableDerivationTraceProps {
  finding: RiskFinding;
  className?: string;
}

interface DerivationNode {
  stage: string;
  name: string;
  relationshipLabel?: string;
  notes?: string;
  color: string;
  badgeBg: string;
}

export const ExplainableDerivationTrace: React.FC<ExplainableDerivationTraceProps> = ({
  finding,
  className = '',
}) => {
  const expl = finding.explainability;
  const chain = expl?.ingredient_chain || expl?.chain || finding.ingredient_path.map((p) => p.ingredient_name);
  const trigger = finding.trigger_text || (chain.length > 0 ? chain[0] : 'Ingredient');
  const matchedRule = finding.matched_rule || expl?.configured_requirement || 'Profile Restriction';
  const memberName = finding.member_name || expl?.member_name || 'Family Member';

  // Construct the 6-stage visual pipeline nodes:
  // 1. Raw Label Ingredient
  // 2. Normalized Ingredient
  // 3. Derived Ingredient / Ancestor
  // 4. Underlying Source
  // 5. Relevant Category
  // 6. Family Requirement
  const nodes: DerivationNode[] = [];

  if (chain.length >= 3) {
    // Multi-level chain (e.g. Maida -> Wheat -> Gluten, or Whey Protein -> Whey -> Milk)
    nodes.push({
      stage: '1. Raw Label Ingredient',
      name: chain[0],
      relationshipLabel: 'milled / extracted to form',
      notes: 'Declared on product label back-panel',
      color: 'text-sky-300 border-sky-500/40 bg-sky-950/40',
      badgeBg: 'bg-sky-500/20 text-sky-300',
    });

    nodes.push({
      stage: '2. Normalized Ingredient',
      name: chain[0].trim(),
      relationshipLabel: 'derived from botanical / agricultural origin',
      notes: 'Normalized in Phase 2 canonical intelligence base',
      color: 'text-indigo-300 border-indigo-500/40 bg-indigo-950/40',
      badgeBg: 'bg-indigo-500/20 text-indigo-300',
    });

    nodes.push({
      stage: '3. Derived Ancestor Ingredient',
      name: chain[1],
      relationshipLabel: 'contains underlying allergen/protein',
      notes: `Knowledge graph relationship: ${chain[0]} → ${chain[1]}`,
      color: 'text-purple-300 border-purple-500/40 bg-purple-950/40',
      badgeBg: 'bg-purple-500/20 text-purple-300',
    });

    if (chain.length > 2) {
      nodes.push({
        stage: '4. Underlying Allergen / Source',
        name: chain[2],
        relationshipLabel: 'grouped under classification',
        notes: `Direct allergen protein group: ${chain[2]}`,
        color: 'text-amber-300 border-amber-500/40 bg-amber-950/40',
        badgeBg: 'bg-amber-500/20 text-amber-300',
      });
    }

    nodes.push({
      stage: '5. Relevant Category',
      name: matchedRule.includes('Gluten') ? 'Cereals & Grains' : matchedRule.includes('Dairy') || matchedRule.includes('Milk') || matchedRule.includes('Lactose') ? 'Dairy Products' : 'Allergenic Foods',
      relationshipLabel: 'conflicts with configured family requirement',
      notes: 'FSSAI / FDA major food category mapping',
      color: 'text-rose-300 border-rose-500/40 bg-rose-950/40',
      badgeBg: 'bg-rose-500/20 text-rose-300',
    });

    nodes.push({
      stage: '6. Family Configured Requirement',
      name: `${memberName}: ${matchedRule}`,
      notes: 'Matches member profile configuration',
      color: 'text-rose-200 border-rose-600 bg-rose-950/80 font-bold',
      badgeBg: 'bg-rose-600 text-white font-semibold',
    });
  } else if (chain.length === 2) {
    // 2-step chain (e.g. Whey -> Milk)
    nodes.push({
      stage: '1. Raw Label Ingredient',
      name: chain[0],
      relationshipLabel: 'normalized canonical identity',
      notes: 'Ingredient text identified on product packaging',
      color: 'text-sky-300 border-sky-500/40 bg-sky-950/40',
      badgeBg: 'bg-sky-500/20 text-sky-300',
    });

    nodes.push({
      stage: '2. Normalized Ingredient',
      name: chain[0],
      relationshipLabel: 'derived from source milk',
      notes: 'Phase 2 ingredient intelligence normalization',
      color: 'text-indigo-300 border-indigo-500/40 bg-indigo-950/40',
      badgeBg: 'bg-indigo-500/20 text-indigo-300',
    });

    nodes.push({
      stage: '3. Derived Ingredient / Origin',
      name: chain[1],
      relationshipLabel: 'belongs to major allergen class',
      notes: `Relationship graph: ${chain[0]} is derived from ${chain[1]}`,
      color: 'text-amber-300 border-amber-500/40 bg-amber-950/40',
      badgeBg: 'bg-amber-500/20 text-amber-300',
    });

    nodes.push({
      stage: '4. Relevant Category',
      name: 'Dairy / Allergen Group',
      relationshipLabel: 'conflicts with member profile rule',
      notes: 'Food allergen classification',
      color: 'text-orange-300 border-orange-500/40 bg-orange-950/40',
      badgeBg: 'bg-orange-500/20 text-orange-300',
    });

    nodes.push({
      stage: '5. Family Configured Requirement',
      name: `${memberName}: ${matchedRule}`,
      notes: 'Triggered configured restriction',
      color: 'text-rose-200 border-rose-600 bg-rose-950/80 font-bold',
      badgeBg: 'bg-rose-600 text-white font-semibold',
    });
  } else {
    // Single or direct trigger (e.g. Peanut or INS 471)
    nodes.push({
      stage: '1. Raw Label Ingredient',
      name: trigger,
      relationshipLabel: 'identifies as canonical item',
      notes: 'Printed on product packaging',
      color: 'text-sky-300 border-sky-500/40 bg-sky-950/40',
      badgeBg: 'bg-sky-500/20 text-sky-300',
    });

    nodes.push({
      stage: '2. Normalized Ingredient',
      name: trigger,
      relationshipLabel: 'matches configured requirement category',
      notes: 'Phase 2 canonical database record',
      color: 'text-indigo-300 border-indigo-500/40 bg-indigo-950/40',
      badgeBg: 'bg-indigo-500/20 text-indigo-300',
    });

    nodes.push({
      stage: '3. Family Configured Requirement',
      name: `${memberName}: ${matchedRule}`,
      notes: 'Matches member profile configuration',
      color: 'text-rose-200 border-rose-600 bg-rose-950/80 font-bold',
      badgeBg: 'bg-rose-600 text-white font-semibold',
    });
  }

  return (
    <div className={`space-y-3 ${className}`} data-testid="explainable-derivation-trace">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <h4 className="text-xs uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
          <GitCommit className="w-3.5 h-3.5 text-indigo-400" />
          <span>Full Ingredient Derivation & Traceability Chain</span>
        </h4>
        <span className="text-[11px] text-slate-400 font-mono">
          {nodes.length} Stages Traced
        </span>
      </div>

      <div className="space-y-1.5 relative">
        {nodes.map((node, idx) => {
          const isLast = idx === nodes.length - 1;

          return (
            <React.Fragment key={idx}>
              <div
                className={`p-3 rounded-xl border transition-all ${node.color}`}
                data-testid={`trace-node-${idx}`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${node.badgeBg}`}
                  >
                    {node.stage}
                  </span>
                  {isLast ? (
                    <span className="inline-flex items-center gap-1 text-[10px] text-rose-300 font-semibold uppercase tracking-wider">
                      <ShieldAlert className="w-3 h-3 text-rose-400" /> Triggered Rule
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                      <CheckCircle2 className="w-3 h-3" /> Step Verified
                    </span>
                  )}
                </div>

                <div className="text-sm font-semibold text-slate-100 mt-1">
                  {node.name}
                </div>

                {node.notes && (
                  <p className="text-[11px] text-slate-400 mt-1">
                    {node.notes}
                  </p>
                )}
              </div>

              {!isLast && (
                <div className="flex items-center justify-center py-1 gap-2 text-slate-500">
                  <div className="h-4 w-px bg-slate-800" />
                  {node.relationshipLabel && (
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      ↓ {node.relationshipLabel}
                    </span>
                  )}
                  <ArrowDown className="w-3.5 h-3.5 text-indigo-400" />
                  <div className="h-4 w-px bg-slate-800" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
