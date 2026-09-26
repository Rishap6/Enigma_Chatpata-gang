import React from 'react';
import { Trash2 } from 'lucide-react';

interface PreferenceCardProps {
  title: string;
  badge?: string;
  description?: string;
  icon?: React.ReactNode;
  onDelete?: () => void;
  className?: string;
}

export const PreferenceCard: React.FC<PreferenceCardProps> = ({
  title,
  badge,
  description,
  icon,
  onDelete,
  className = '',
}) => {
  return (
    <div
      className={`p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all flex items-start justify-between gap-3 shadow-2xs ${className}`}
    >
      <div className="flex items-start gap-3">
        {icon && (
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
            {icon}
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-800 capitalize">{title}</span>
            {badge && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 capitalize">
                {badge}
              </span>
            )}
          </div>
          {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
        </div>
      </div>

      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
          title="Delete item"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
