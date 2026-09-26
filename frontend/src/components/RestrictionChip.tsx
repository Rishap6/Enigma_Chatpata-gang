import React from 'react';
import { Check, X } from 'lucide-react';

interface RestrictionChipProps {
  label: string;
  selected?: boolean;
  onToggle?: () => void;
  onRemove?: () => void;
  subtext?: string;
  className?: string;
}

export const RestrictionChip: React.FC<RestrictionChipProps> = ({
  label,
  selected = false,
  onToggle,
  onRemove,
  subtext,
  className = '',
}) => {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all select-none ${
        selected
          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs ring-1 ring-emerald-500/20'
          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
      } ${className}`}
    >
      {selected ? (
        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
      ) : (
        <span className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0" />
      )}
      <span className="font-medium capitalize">{label}</span>
      {subtext && <span className="text-[10px] text-slate-500">({subtext})</span>}
      {onRemove && (
        <span
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 p-0.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600"
          role="button"
          aria-label={`Remove ${label}`}
        >
          <X className="w-3 h-3" />
        </span>
      )}
    </button>
  );
};
