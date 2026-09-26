import React, { useState } from 'react';
import { ClipboardCheck, FileCheck, Shield, ChevronDown, ChevronUp, Clock, Hash } from 'lucide-react';
import { RiskAnalysisResponse } from '../../types';

interface RiskAuditRecordProps {
  analysis: RiskAnalysisResponse;
  className?: string;
}

export const RiskAuditRecord: React.FC<RiskAuditRecordProps> = ({ analysis, className = '' }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const formattedDate = analysis.analysis_timestamp
    ? new Date(analysis.analysis_timestamp).toLocaleString()
    : 'Recent Analysis';

  const pipelineStages = [
    { name: '1. Direct Allergen Evaluation', desc: 'Exact string & synonym matching against member allergy profiles' },
    { name: '2. Graph Derivation Traversal', desc: 'Recursive ancestor ingredient queries across Phase 2 knowledge graph' },
    { name: '3. Precautionary Cross-Contact', desc: 'Parsing packaging facility statements without false recipe inclusion' },
    { name: '4. Dietary Property Alignment', desc: 'Vegetarian, vegan, dairy-free, and gluten-free rule checking' },
    { name: '5. Dual-Source Uncertainty', desc: 'Additive origin ambiguity verification without fabricated defaults' },
    { name: '6. Nutrition & Custom Constraints', desc: 'Deterministic sodium, sugar, and family custom rule evaluation' },
    { name: '7. Conflict Priority Resolution', desc: 'Deterministic sorting: high_attention > potential_conflict > verification_required' },
  ];

  return (
    <div
      className={`rounded-2xl bg-slate-900/90 border border-slate-800 p-4 text-xs text-slate-300 shadow-md ${className}`}
      data-testid="risk-audit-record"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <ClipboardCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm">Audit Record & Reasoning Engine Provenance</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">
                {analysis.analysis_version}
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              Immutable analysis artifact run on {formattedDate}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition font-medium cursor-pointer"
          aria-expanded={isExpanded}
        >
          <span>{isExpanded ? 'Hide Trace' : 'View Audit Trail'}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-slate-800 space-y-4 animate-in fade-in">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
              <span className="text-slate-500 block mb-0.5 flex items-center gap-1">
                <Hash className="w-3 h-3" /> Analysis ID:
              </span>
              <span className="font-mono text-slate-200 break-all">{analysis.id}</span>
            </div>

            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
              <span className="text-slate-500 block mb-0.5 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Timestamp:
              </span>
              <span className="font-mono text-slate-200">{formattedDate}</span>
            </div>

            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
              <span className="text-slate-500 block mb-0.5">Family Scope:</span>
              <span className="font-mono text-slate-200 break-all">{analysis.family_id}</span>
            </div>

            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
              <span className="text-slate-500 block mb-0.5">Receipt Artifact:</span>
              <span className="font-mono text-slate-200 break-all">{analysis.receipt_id}</span>
            </div>
          </div>

          {/* Engine Pipeline Stages Evaluated */}
          <div>
            <h5 className="font-semibold text-slate-300 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
              <FileCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>Deterministic Evaluators Executed</span>
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {pipelineStages.map((stage, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800 text-[11px] flex flex-col justify-center"
                >
                  <span className="font-semibold text-slate-200">{stage.name}</span>
                  <span className="text-slate-400 text-[10px] mt-0.5">{stage.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Clinician & Decision-Support Notice */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
            <Shield className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <p>
              <strong className="text-slate-200">Regulatory & Safety Standard Notice:</strong> This audit trail proves that findings were generated through transparent, non-probabilistic knowledge graph traversal and rule evaluation. No proprietary &ldquo;black box&rdquo; predictions or biological anaphylaxis estimates were computed.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
