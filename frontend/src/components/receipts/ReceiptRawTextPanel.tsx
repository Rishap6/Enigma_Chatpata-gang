import React, { useState } from 'react';
import { ChevronDown, ChevronUp, FileText, Copy, Check } from 'lucide-react';

interface ReceiptRawTextPanelProps {
  rawText?: string | null;
  ocrConfidence?: number | null;
}

export const ReceiptRawTextPanel: React.FC<ReceiptRawTextPanelProps> = ({
  rawText,
  ocrConfidence,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!rawText) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900 shadow-sm">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <FileText className="w-4 h-4 text-zinc-500" />
          <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            Raw OCR Text Output
          </span>
          {ocrConfidence !== null && ocrConfidence !== undefined && (
            <span className="text-xs font-mono text-zinc-400">
              ({Math.round(ocrConfidence * 100)}% confidence)
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-zinc-400">
          <span className="text-xs">{isOpen ? 'Hide' : 'Inspect'}</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-950 text-zinc-200">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[11px] font-mono text-zinc-500 uppercase">
              Preserved verbatim from OCR extraction engine
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="text-xs inline-flex items-center gap-1 text-zinc-400 hover:text-white px-2 py-1 rounded bg-zinc-800"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre className="text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto p-2 rounded bg-zinc-900/80 border border-zinc-800">
            {rawText}
          </pre>
        </div>
      )}
    </div>
  );
};
