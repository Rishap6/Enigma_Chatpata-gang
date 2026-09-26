import React from 'react';
import { AllergySeverity } from '../types';

interface SeveritySelectorProps {
  value: AllergySeverity;
  onChange: (severity: AllergySeverity) => void;
}

export const SeveritySelector: React.FC<SeveritySelectorProps> = ({ value, onChange }) => {
  const options: { id: AllergySeverity; label: string; activeClass: string; desc: string }[] = [
    {
      id: 'mild',
      label: 'Mild',
      activeClass: 'bg-blue-600 text-white shadow-xs',
      desc: 'Minor discomfort',
    },
    {
      id: 'moderate',
      label: 'Moderate',
      activeClass: 'bg-amber-600 text-white shadow-xs',
      desc: 'Significant reaction',
    },
    {
      id: 'severe',
      label: 'Severe',
      activeClass: 'bg-rose-600 text-white shadow-xs',
      desc: 'Anaphylaxis risk',
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
      {options.map((opt) => {
        const isSelected = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`py-2 px-3 rounded-lg text-xs font-medium transition-all text-center ${
              isSelected
                ? opt.activeClass
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <div className="font-semibold">{opt.label}</div>
            <div className={`text-[10px] opacity-80 hidden sm:block ${isSelected ? 'text-white' : 'text-slate-500'}`}>
              {opt.desc}
            </div>
          </button>
        );
      })}
    </div>
  );
};
