import React from 'react';
import { CheckCircle2, Clock, Loader2, AlertCircle } from 'lucide-react';
import { ReceiptProcessingEvent, ReceiptProcessingStatus } from '../../types';

interface ReceiptProcessingStatusProps {
  status: ReceiptProcessingStatus;
  events?: ReceiptProcessingEvent[];
  ocrConfidence?: number | null;
}

const STAGES = [
  { id: 'upload', label: 'Uploading receipt...' },
  { id: 'ocr', label: 'Reading receipt text (OCR)...' },
  { id: 'parse', label: 'Finding grocery items & prices...' },
  { id: 'match', label: 'Identifying catalog products...' },
  { id: 'complete', label: 'Preparing your grocery list...' },
];

export const ReceiptProcessingStatusView: React.FC<ReceiptProcessingStatusProps> = ({
  status,
  events = [],
  ocrConfidence,
}) => {
  // Derive active stage from status or events
  const completedStages = new Set(
    events.filter((e) => e.status === 'completed').map((e) => e.stage)
  );

  const isFailed = status === 'failed';
  const isDone = status === 'processed' || status === 'partial';

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            {!isDone && !isFailed && <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />}
            {isDone && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
            {isFailed && <AlertCircle className="w-5 h-5 text-red-500" />}
            {status === 'processing' && 'Processing Grocery Receipt'}
            {status === 'processed' && 'Receipt Successfully Processed'}
            {status === 'partial' && 'Processed with Items Needing Review'}
            {status === 'uploaded' && 'Receipt Uploaded'}
            {status === 'failed' && 'OCR Processing Failed'}
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {status === 'processing' && 'Analyzing image, segmenting grocery lines, and matching food catalog...'}
            {status === 'processed' && 'All grocery items have been successfully identified.'}
            {status === 'partial' && 'Some items are ambiguous or unknown and require your confirmation.'}
            {status === 'failed' && "We couldn't read enough of this receipt. Please try another image."}
          </p>
        </div>

        {ocrConfidence !== undefined && ocrConfidence !== null && (
          <div className="text-right">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider block">OCR Confidence</span>
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {Math.round(ocrConfidence * 100)}%
            </span>
          </div>
        )}
      </div>

      {/* Progress pipeline tracker */}
      <div className="space-y-3 mt-4">
        {STAGES.map((s, idx) => {
          const isCompleted = isDone || completedStages.has(s.id);
          const isCurrent = !isDone && !isFailed && !isCompleted && idx === completedStages.size;

          return (
            <div
              key={s.id}
              className={`flex items-center justify-between text-sm py-2 px-3 rounded-lg transition-colors ${
                isCurrent
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-medium border border-emerald-200 dark:border-emerald-800'
                  : isCompleted
                  ? 'text-zinc-700 dark:text-zinc-300'
                  : 'text-zinc-400 dark:text-zinc-600'
              }`}
            >
              <div className="flex items-center gap-3">
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : isCurrent ? (
                  <Loader2 className="w-4 h-4 text-emerald-600 animate-spin shrink-0" />
                ) : (
                  <Clock className="w-4 h-4 text-zinc-300 dark:text-zinc-700 shrink-0" />
                )}
                <span>{s.label}</span>
              </div>

              {/* Show duration or event msg if available */}
              {events.find((e) => e.stage === s.id && e.duration_ms) && (
                <span className="text-xs text-zinc-400">
                  {events.find((e) => e.stage === s.id)?.duration_ms}ms
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
