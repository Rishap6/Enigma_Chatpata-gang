import React from 'react';
import { ShieldCheck, AlertCircle, HelpCircle, ShieldAlert } from 'lucide-react';
import { EvidenceLevel } from '../../types';

interface ExplainableConfidenceProps {
  confidence: number; // 0.0 to 1.0
  level?: EvidenceLevel;
  method?: string;
  showBar?: boolean;
  className?: string;
}

export const ExplainableConfidence: React.FC<ExplainableConfidenceProps> = ({
  confidence,
  level,
  method,
  showBar = true,
  className = '',
}) => {
  const percentage = Math.round(confidence * 100);

  // Compute tier based on level prop or numeric confidence
  const resolvedLevel: EvidenceLevel =
    level ||
    (confidence >= 0.85
      ? 'high'
      : confidence >= 0.65
      ? 'medium'
      : confidence > 0.0
      ? 'low'
      : 'unknown');

  const config = {
    high: {
      label: 'High Evidence Confidence',
      badgeColor: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
      barColor: 'bg-emerald-500',
      icon: <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />,
    },
    medium: {
      label: 'Medium Evidence Confidence',
      badgeColor: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
      barColor: 'bg-amber-500',
      icon: <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />,
    },
    low: {
      label: 'Low Evidence Confidence',
      badgeColor: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
      barColor: 'bg-rose-500',
      icon: <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />,
    },
    unknown: {
      label: 'Unresolved / Unknown',
      badgeColor: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
      barColor: 'bg-slate-500',
      icon: <HelpCircle className="w-4 h-4 text-slate-400 shrink-0" />,
    },
  }[resolvedLevel];

  return (
    <div
      className={`p-3.5 rounded-xl bg-slate-950/40 border border-slate-800 text-xs ${className}`}
      data-testid="explainable-confidence"
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${config.badgeColor}`}>
          {config.icon}
          <span>{config.label}</span>
          <span className="font-mono">({percentage}%)</span>
        </div>
        {method && (
          <span className="text-[11px] text-slate-400 font-mono capitalize">
            Source: {method.replace(/_/g, ' ')}
          </span>
        )}
      </div>

      {showBar && (
        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mb-2">
          <div
            className={`h-full transition-all duration-300 rounded-full ${config.barColor}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}

      {/* Mandatory Clinical Distinction */}
      <p className="text-[11px] text-slate-400 leading-relaxed border-t border-slate-800/80 pt-2 mt-1">
        <strong className="text-slate-300">Important distinction:</strong> Confidence reflects the available product/ingredient evidence and matching quality. It is{' '}
        <span className="underline decoration-indigo-400 underline-offset-2 text-slate-200">
          not a probability of an allergic reaction
        </span>
        .
      </p>
    </div>
  );
};
