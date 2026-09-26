import React from 'react';
import { Calendar, Filter } from 'lucide-react';

interface DateRangeSelectorProps {
  selectedPeriod: string;
  onSelectPeriod: (period: string) => void;
  startDate?: string;
  endDate?: string;
  onCustomDateChange?: (start: string, end: string) => void;
}

const PRESET_OPTIONS = [
  { id: 'all', label: 'All Time' },
  { id: 'current_month', label: 'Current Month' },
  { id: 'previous_month', label: 'Previous Month' },
  { id: '30d', label: 'Last 30 Days' },
  { id: '90d', label: 'Last 90 Days' },
  { id: '7d', label: 'Last 7 Days' },
];

export const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({
  selectedPeriod,
  onSelectPeriod,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mr-1">
        <Filter className="w-3.5 h-3.5 text-slate-400" />
        <span>Time Range:</span>
      </div>
      <div className="inline-flex flex-wrap items-center p-1 bg-slate-100/80 rounded-xl border border-slate-200/80 gap-1">
        {PRESET_OPTIONS.map((opt) => {
          const isActive = selectedPeriod === opt.id;
          return (
            <button
              key={opt.id}
              id={`period-btn-${opt.id}`}
              onClick={() => onSelectPeriod(opt.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-white text-emerald-800 shadow-2xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
