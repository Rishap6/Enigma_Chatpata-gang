import React from 'react';
import { HelpCircle, CheckCircle2, AlertCircle } from 'lucide-react';

interface SourceStatusBadgeProps {
  sourceType: string;
  sourceStatus: 'known' | 'possible' | 'unknown' | string;
  confidence?: number;
}

export const SourceStatusBadge: React.FC<SourceStatusBadgeProps> = ({
  sourceType,
  sourceStatus,
  confidence,
}) => {
  const getStatusConfig = () => {
    switch (sourceStatus.toLowerCase()) {
      case 'known':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
          label: 'Known Source',
        };
      case 'possible':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          icon: <AlertCircle className="w-3.5 h-3.5 text-amber-600" />,
          label: 'Possible Source',
        };
      case 'unknown':
      default:
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-300',
          icon: <HelpCircle className="w-3.5 h-3.5 text-slate-500" />,
          label: 'Uncertain / Unknown',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium ${config.bg}`}
      data-testid="source-status-badge"
    >
      {config.icon}
      <span className="font-semibold capitalize">{sourceType}</span>
      <span className="opacity-75">({config.label})</span>
      {confidence !== undefined && (
        <span className="text-[10px] font-mono opacity-60 ml-auto">
          {Math.round(confidence * 100)}%
        </span>
      )}
    </div>
  );
};
