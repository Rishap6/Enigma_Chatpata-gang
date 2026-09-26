import React from 'react';
import { BellOff } from 'lucide-react';
import { Link } from 'react-router-dom';

export const NotificationEmptyState: React.FC = () => (
  <div className="py-16 text-center px-4">
    <BellOff className="w-12 h-12 text-slate-300 mx-auto mb-3" />
    <h3 className="text-sm font-bold text-slate-800 mb-1">No household alerts yet</h3>
    <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
      Important purchase findings from family risk analysis will appear here. This is informational
      decision support — not medical advice.
    </p>
    <Link
      to="/receipt/upload"
      className="inline-flex text-xs font-semibold text-emerald-700 hover:text-emerald-800"
    >
      Upload a grocery receipt
    </Link>
  </div>
);
