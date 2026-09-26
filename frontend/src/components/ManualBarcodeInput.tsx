import React, { useState } from 'react';
import { Search, Barcode, CheckCircle2, AlertCircle } from 'lucide-react';
import { inferBarcodeFormat, normalizeBarcode, isValidBarcode } from '../utils/barcode';

interface ManualBarcodeInputProps {
  onSubmit?: (barcode: string, format: string) => void;
  onSearch?: (barcode: string, format: string) => void;
  isLoading?: boolean;
}

const FORMAT_OPTIONS = [
  { value: 'AUTO', label: 'Auto Detect' },
  { value: 'EAN13', label: 'EAN-13 (13 digits)' },
  { value: 'EAN8', label: 'EAN-8 (8 digits)' },
  { value: 'UPC', label: 'UPC-A (12 digits)' },
  { value: 'GTIN', label: 'GTIN-14 (14 digits)' },
];

export const ManualBarcodeInput: React.FC<ManualBarcodeInputProps> = ({
  onSubmit,
  onSearch,
  isLoading = false,
}) => {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('AUTO');
  const [validationError, setValidationError] = useState<string | null>(null);

  const cleanBarcode = normalizeBarcode(barcodeInput);
  const inferred = inferBarcodeFormat(cleanBarcode);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!cleanBarcode) {
      setValidationError('Please enter a barcode number.');
      return;
    }

    if (!isValidBarcode(cleanBarcode)) {
      setValidationError('Please enter a valid retail barcode (8 to 14 digits).');
      return;
    }

    const finalFormat = selectedFormat === 'AUTO' ? inferred : selectedFormat;
    if (onSearch) {
      onSearch(cleanBarcode, finalFormat);
    } else if (onSubmit) {
      onSubmit(cleanBarcode, finalFormat);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Barcode className="w-4 h-4 text-cyan-400" />
            Product Barcode / GTIN Number
          </span>
          {cleanBarcode && (
            <span className="text-[11px] font-mono text-cyan-400 font-normal">
              Detected format: {inferred} ({cleanBarcode.length} chars)
            </span>
          )}
        </label>

        <div className="relative">
          <input
            type="text"
            value={barcodeInput}
            onChange={(e) => {
              setBarcodeInput(e.target.value);
              if (validationError) setValidationError(null);
            }}
            placeholder="Enter barcode digits (e.g. 08901234560010)"
            className={`w-full bg-slate-950/80 border rounded-xl px-4 py-2.5 text-sm font-mono tracking-wider text-slate-100 placeholder-slate-500 focus:outline-none transition-colors ${
              validationError
                ? 'border-rose-500 focus:border-rose-400'
                : 'border-slate-700/80 focus:border-cyan-500'
            }`}
          />
        </div>

          {validationError && (
          <p className="text-xs text-rose-400 flex items-center gap-1 mt-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{validationError}</span>
          </p>
        )}

        {/* Quick-fill GTIN codes from new_products_gtin.csv */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          <span className="text-[10px] text-slate-500 flex items-center gap-1">Quick fill:</span>
          {[
            { label: 'Snickers', gtin: '8906002482481' },
            { label: 'Kurkure', gtin: '8901491100519' },
            { label: "Lay's", gtin: '8901491100267' },
            { label: 'Hide&Seek', gtin: '8901719116520' },
            { label: 'Triple Bar', gtin: '8906010916077' },
          ].map((item) => (
            <button
              key={item.gtin}
              type="button"
              onClick={() => { setBarcodeInput(item.gtin); if (validationError) setValidationError(null); }}
              className="px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 text-[10px] font-medium border border-cyan-500/20 transition-colors"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-slate-400 block mb-1.5">
            Identifier Standard
          </label>
          <select
            value={selectedFormat}
            onChange={(e) => setSelectedFormat(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
          >
            {FORMAT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            disabled={!cleanBarcode || isLoading}
            className="w-full py-2 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-cyan-950/40 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Search className="w-4 h-4" />
            <span>{isLoading ? 'Looking up...' : 'Find Product'}</span>
          </button>
        </div>
      </div>
    </form>
  );
};
