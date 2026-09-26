import React from 'react';
import { Database, FileText, BookOpen, Layers, CheckCircle2 } from 'lucide-react';
import { RiskEvidenceItem, EvidenceLevel } from '../../types';

interface EvidencePanelProps {
  evidence: RiskEvidenceItem[];
  className?: string;
}

export const EvidencePanel: React.FC<EvidencePanelProps> = ({ evidence, className = '' }) => {
  if (!evidence || evidence.length === 0) {
    return (
      <div className="p-3 text-xs text-slate-400 bg-slate-950/40 rounded-xl border border-slate-800">
        No specific secondary evidence records attached to this finding.
      </div>
    );
  }

  const getLevelBadge = (level: EvidenceLevel) => {
    switch (level) {
      case 'high':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            High Quality
          </span>
        );
      case 'medium':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Medium Quality
          </span>
        );
      case 'low':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20">
            Low Quality
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-500/10 text-slate-400 border border-slate-500/20">
            Unverified
          </span>
        );
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'canonical_database':
        return <Database className="w-3.5 h-3.5 text-indigo-400" />;
      case 'product_label':
        return <FileText className="w-3.5 h-3.5 text-sky-400" />;
      case 'literature_reference':
        return <BookOpen className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <Layers className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className={`space-y-2.5 ${className}`} data-testid="evidence-panel">
      <div className="flex items-center justify-between">
        <h4 className="text-xs uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
          <span>Evidence Sources & Provenance ({evidence.length})</span>
        </h4>
        <span className="text-[11px] text-slate-500">Verified references only</span>
      </div>

      <div className="space-y-2">
        {evidence.map((item, idx) => (
          <div
            key={idx}
            className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition"
            data-testid={`evidence-item-${idx}`}
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2">
                {getTypeIcon(item.evidence_type)}
                <span className="text-xs font-semibold text-slate-200">{item.source}</span>
                <span className="text-[10px] text-slate-400 font-mono">
                  [{item.evidence_type.replace(/_/g, ' ')}]
                </span>
              </div>
              <div className="flex items-center gap-2">
                {getLevelBadge(item.level)}
                {item.confidence !== undefined && item.confidence !== null && (
                  <span className="text-[11px] text-slate-400 font-mono">
                    {Math.round(item.confidence * 100)}% match
                  </span>
                )}
              </div>
            </div>

            {/* Statement / Description Snippet */}
            <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-2 rounded-lg border border-slate-800/80 my-1.5">
              &ldquo;{item.snippet || item.description}&rdquo;
            </p>

            {/* Citation Reference if available */}
            {item.reference && (
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-1 font-mono">
                <span className="text-slate-500">Citation:</span>
                <span className="text-indigo-300 bg-indigo-950/40 px-1.5 py-0.5 rounded">
                  {item.reference}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
