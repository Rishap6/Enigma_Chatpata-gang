import React from 'react';
import { AllergySeverity } from '../types';
import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

interface AllergyBadgeProps {
  name: string;
  severity: AllergySeverity;
  notes?: string | null;
  onRemove?: () => void;
  showIcon?: boolean;
}

export const AllergyBadge: React.FC<AllergyBadgeProps> = ({
  name,
  severity,
  notes,
  onRemove,
  showIcon = true,
}) => {
  const getSeverityStyles = (sev: AllergySeverity) => {
    switch (sev) {
      case 'severe':
        return {
          bg: 'bg-rose-50 text-rose-700 border-rose-200/80',
          dot: 'bg-rose-500',
          icon: <AlertCircle className="w-3.5 h-3.5 text-rose-600" />,
          label: 'Severe',
        };
      case 'moderate':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-200/80',
          dot: 'bg-amber-500',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />,
          label: 'Moderate',
        };
      case 'mild':
      default:
        return {
          bg: 'bg-blue-50 text-blue-700 border-blue-200/80',
          dot: 'bg-blue-500',
          icon: <Info className="w-3.5 h-3.5 text-blue-600" />,
          label: 'Mild',
        };
    }
  };

  const style = getSeverityStyles(severity);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${style.bg} transition-all shadow-xs`}
      title={notes || `${name} (${style.label})`}
    >
      {showIcon && style.icon}
      <span className="font-semibold">{name}</span>
      <span className="opacity-75 text-[10px] uppercase tracking-wider">({style.label})</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 p-0.5 rounded-full hover:bg-black/10 focus:outline-hidden"
          aria-label={`Remove allergy ${name}`}
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
};
