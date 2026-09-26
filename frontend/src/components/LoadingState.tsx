import React from 'react';

interface LoadingStateProps {
  message?: string;
  variant?: 'card' | 'page' | 'inline';
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  variant = 'page',
}) => {
  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
        <span className="w-3.5 h-3.5 border-2 border-slate-300 border-t-emerald-600 rounded-full animate-spin" />
        <span>{message}</span>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className="card-subtle p-6 animate-pulse space-y-4">
        <div className="h-5 bg-slate-200 rounded-md w-1/3" />
        <div className="space-y-2">
          <div className="h-4 bg-slate-100 rounded-md w-3/4" />
          <div className="h-4 bg-slate-100 rounded-md w-1/2" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center">
      <div className="w-10 h-10 border-3 border-emerald-100 border-t-emerald-600 rounded-full animate-spin mb-3" />
      <p className="text-sm font-medium text-slate-600">{message}</p>
    </div>
  );
};
