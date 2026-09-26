import React from 'react';
import { ShieldCheck, ShieldAlert, AlertCircle } from 'lucide-react';

interface ConfidenceIndicatorProps {
  confidence: number; // 0.0 to 1.0
  method?: string;
  showBar?: boolean;
}

export const ConfidenceIndicator: React.FC<ConfidenceIndicatorProps> = ({
  confidence,
  method,
  showBar = true,
}) => {
  const percentage = Math.round(confidence * 100);

  const getTier = () => {
    if (confidence >= 0.9) {
      return {
        label: 'High Confidence',
        color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        barColor: 'bg-emerald-500',
        icon: <ShieldCheck className="w-4 h-4 text-emerald-600" />,
      };
    }
    if (confidence >= 0.7) {
      return {
        label: 'Possible Match',
        color: 'text-amber-800 bg-amber-50 border-amber-200',
        barColor: 'bg-amber-500',
        icon: <AlertCircle className="w-4 h-4 text-amber-600" />,
      };
    }
    return {
      label: 'Unresolved / Low',
      color: 'text-rose-700 bg-rose-50 border-rose-200',
      barColor: 'bg-rose-500',
      icon: <ShieldAlert className="w-4 h-4 text-rose-600" />,
    };
  };

  const tier = getTier();

  return (
    <div className="space-y-1.5" data-testid="confidence-indicator">
      <div className="flex items-center justify-between gap-2">
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-semibold ${tier.color}`}>
          {tier.icon}
          <span>{tier.label}</span>
          <span className="font-mono">({percentage}%)</span>
        </div>
        {method && (
          <span className="text-[11px] text-slate-500 font-mono capitalize">
            method: {method.replace('_', ' ')}
          </span>
        )}
      </div>

      {showBar && (
        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${tier.barColor}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
};
