import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Barcode,
  Search,
  Trash2,
  ExternalLink,
  Edit2,
  Check,
  X,
} from 'lucide-react';
import { ReceiptItem } from '../../types';

interface ReceiptItemCardProps {
  item: ReceiptItem;
  currency?: string;
  onOpenResolution: (item: ReceiptItem, defaultTab?: 'candidates' | 'search' | 'barcode') => void;
  onUpdateItem: (itemId: string, data: { quantity?: number; unit_price?: number; total_price?: number }) => Promise<void>;
  onDeleteItem: (itemId: string) => Promise<void>;
}

export const ReceiptItemCard: React.FC<ReceiptItemCardProps> = ({
  item,
  currency = '₹',
  onOpenResolution,
  onUpdateItem,
  onDeleteItem,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [qty, setQty] = useState(String(item.quantity || 1));
  const [price, setPrice] = useState(String(item.total_price || item.unit_price || ''));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isMatched = Boolean(item.product_id && item.product && !item.requires_selection);
  const isAmbiguous = item.requires_selection;
  const isUnknown = !isMatched && !isAmbiguous;

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      const qVal = parseFloat(qty) || 1.0;
      const pVal = parseFloat(price) || undefined;
      await onUpdateItem(item.id, {
        quantity: qVal,
        total_price: pVal,
        unit_price: pVal && qVal > 0 ? +(pVal / qVal).toFixed(2) : undefined,
      });
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Remove line "${item.raw_text}" from receipt?`)) return;
    setDeleting(true);
    try {
      await onDeleteItem(item.id);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className={`border rounded-xl p-4 transition-all duration-200 ${
        isMatched
          ? 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
          : isAmbiguous
          ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60'
          : 'bg-zinc-50 dark:bg-zinc-900/60 border-dashed border-zinc-300 dark:border-zinc-700'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left Column: Line info & Product details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              #{item.line_number}
            </span>

            {/* Status Badges */}
            {isMatched && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Matched ({Math.round((item.match_confidence || 1) * 100)}%)
              </span>
            )}

            {isAmbiguous && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded-full">
                <AlertTriangle className="w-3.5 h-3.5" />
                Ambiguous ({item.candidate_products?.length || 0} candidates)
              </span>
            )}

            {isUnknown && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-200 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                <HelpCircle className="w-3.5 h-3.5" />
                Unknown Product
              </span>
            )}

            {item.user_corrected && (
              <span className="text-[10px] uppercase font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded">
                User Verified
              </span>
            )}
          </div>

          {/* Raw OCR Line text */}
          <div className="text-xs font-mono text-zinc-500 dark:text-zinc-400 truncate mb-1">
            OCR: &quot;{item.raw_text}&quot;
          </div>

          {/* Matched Product or Placeholder Title */}
          {isMatched && item.product ? (
            <div>
              <Link
                to={`/products/${item.product.id}`}
                className="font-semibold text-base text-zinc-900 dark:text-zinc-100 hover:text-emerald-600 dark:hover:text-emerald-400 inline-flex items-center gap-1 group"
              >
                <span>{item.product.name}</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-600" />
              </Link>
              <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {item.product.brand?.name && <span>{item.product.brand.name}</span>}
                {item.product.pack_size && (
                  <span>
                    • {item.product.pack_size}
                    {item.product.unit}
                  </span>
                )}
                {item.product.category?.name && <span>• {item.product.category.name}</span>}
              </div>
            </div>
          ) : (
            <div className="font-medium text-sm text-zinc-800 dark:text-zinc-200">
              {item.product_name_raw || 'Unidentified Item'}
            </div>
          )}
        </div>

        {/* Right Column: Pricing & Quantity */}
        <div className="text-right shrink-0">
          {!isEditing ? (
            <div>
              <div className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {item.total_price !== null && item.total_price !== undefined
                  ? `${currency}${item.total_price.toFixed(2)}`
                  : item.unit_price !== null && item.unit_price !== undefined
                  ? `${currency}${item.unit_price.toFixed(2)}`
                  : '—'}
              </div>
              <div className="text-xs text-zinc-500">
                Qty: {item.quantity || 1}
                {item.unit_price && item.quantity && item.quantity > 1 && (
                  <span> (@ {currency}{item.unit_price.toFixed(2)})</span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <div>
                <input
                  type="number"
                  step="0.5"
                  min="0.1"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  className="w-14 px-1.5 py-1 text-xs border rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700"
                  placeholder="Qty"
                />
              </div>
              <div>
                <input
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-18 px-1.5 py-1 text-xs border rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700"
                  placeholder="Price"
                />
              </div>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={saving}
                className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700"
                title="Save"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="p-1 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
                title="Cancel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Action Bar for Resolution & Corrections */}
      <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {isAmbiguous && (
            <button
              type="button"
              onClick={() => onOpenResolution(item, 'candidates')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Choose Product ({item.candidate_products?.length || 0})
            </button>
          )}

          {isUnknown && (
            <>
              <button
                type="button"
                onClick={() => onOpenResolution(item, 'barcode')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
              >
                <Barcode className="w-3.5 h-3.5" />
                Scan Barcode
              </button>
              <button
                type="button"
                onClick={() => onOpenResolution(item, 'search')}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors"
              >
                <Search className="w-3.5 h-3.5" />
                Search Catalog
              </button>
            </>
          )}

          {isMatched && (
            <button
              type="button"
              onClick={() => onOpenResolution(item, 'search')}
              className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 inline-flex items-center gap-1"
            >
              Change Product
            </button>
          )}
        </div>

        {/* Edit & Delete Controls */}
        <div className="flex items-center gap-2 ml-auto">
          {!isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 text-xs inline-flex items-center gap-1"
              title="Edit Qty / Price"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Edit</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/40 text-zinc-400 hover:text-red-600 text-xs inline-flex items-center gap-1"
            title="Delete OCR line"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Remove</span>
          </button>
        </div>
      </div>
    </div>
  );
};
