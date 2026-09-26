import React from 'react';
import { RiskStatus } from '../../types';

interface RiskStatusBadgeProps {
  status: RiskStatus | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export const RiskStatusBadge: React.FC<RiskStatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
  className = '',
}) => {
  const getBadgeConfig = () => {
    switch (status) {
      case 'high_attention':
        return {
          icon: '🔴',
          label: 'High Attention',
          classes: 'bg-red-500/10 text-red-400 border-red-500/30',
        };
      case 'potential_conflict':
        return {
          icon: '🟠',
          label: 'Potential Conflict',
          classes: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        };
      case 'verification_required':
        return {
          icon: '🟡',
          label: 'Verification Required',
          classes: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30',
        };
      case 'no_configured_conflict':
        return {
          icon: '🟢',
          label: 'No Configured Conflict',
          classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        };
      case 'insufficient_information':
      default:
        return {
          icon: '⚪',
          label: 'Insufficient Info',
          classes: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
        };
    }
  };

  const { icon, label, classes } = getBadgeConfig();

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3.5 py-1.5 font-medium',
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${classes} ${sizeClasses} ${className}`}
      title={label}
    >
      {showIcon && <span>{icon}</span>}
      <span>{label}</span>
    </span>
  );
};
