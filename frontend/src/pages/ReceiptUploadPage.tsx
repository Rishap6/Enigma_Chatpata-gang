import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ReceiptUploader } from '../components/receipts/ReceiptUploader';
import { ReceiptProcessingStatusView } from '../components/receipts/ReceiptProcessingStatus';
import { receiptService } from '../services/receiptService';
import { Receipt, ReceiptProcessingStatus } from '../types';
import { ArrowLeft, Sparkles, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ReceiptUploadPage: React.FC = () => {
  const navigate = useNavigate();
  const [processingStatus, setProcessingStatus] = useState<ReceiptProcessingStatus>('uploaded');
  const [activeReceipt, setActiveReceipt] = useState<Receipt | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('Uploading receipt...');

  // Helper to create a synthetic demo grocery receipt image using HTML5 Canvas
  const createDemoReceiptBlob = async (): Promise<File> => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 900;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#111827';
      ctx.font = 'bold 26px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('DEMO FAMILY GROCERY', 300, 70);

      ctx.font = '16px monospace';
      ctx.fillText('BANGALORE SUPERSTORE #104', 300, 105);
      ctx.fillText('TEL: 080-23456789 • GSTIN: 29ABCDE1234F1Z5', 300, 130);
      ctx.fillText('DATE: 2026-09-20   TIME: 14:32', 300, 155);

      ctx.beginPath();
      ctx.setLineDash([6, 4]);
      ctx.moveTo(40, 180);
      ctx.lineTo(560, 180);
      ctx.strokeStyle = '#9ca3af';
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.font = 'bold 18px monospace';
      ctx.fillText('ITEM', 40, 215);
      ctx.textAlign = 'right';
      ctx.fillText('PRICE (INR)', 560, 215);

      ctx.beginPath();
      ctx.moveTo(40, 230);
      ctx.lineTo(560, 230);
      ctx.stroke();

      const items = [
        ['BRIT NUTR CHC 40G', '40.00'],
        ['AASH ATT 5KG', '320.00'],
        ['KISS TOM KETCHUP', '150.00'],
        ['DEMO PROTEIN BAR', '90.00'],
      ];

      ctx.font = '18px monospace';
      let y = 270;
      items.forEach(([name, price]) => {
        ctx.textAlign = 'left';
        ctx.fillText(name, 40, y);
        ctx.textAlign = 'right';
        ctx.fillText(price, 560, y);
        y += 45;
      });

      ctx.beginPath();
      ctx.moveTo(40, y);
      ctx.lineTo(560, y);
      ctx.stroke();
      y += 40;

      const totals = [
        ['SUBTOTAL', '600.00'],
        ['CGST 2.5%', '15.00'],
        ['SGST 2.5%', '15.00'],
        ['TOTAL', '630.00'],
        ['CARD', '630.00'],
      ];

      totals.forEach(([label, amount]) => {
        ctx.font = label === 'TOTAL' ? 'bold 22px monospace' : '18px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(label, 40, y);
        ctx.textAlign = 'right';
        ctx.fillText(amount, 560, y);
        y += 35;
      });

      ctx.textAlign = 'center';
      ctx.font = 'italic 16px monospace';
      ctx.fillText('THANK YOU FOR SHOPPING WITH US!', 300, y + 40);
    }

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        const file = new File([blob || new Blob()], 'demo_grocery_receipt.png', {
          type: 'image/png',
        });
        resolve(file);
      }, 'image/png');
    });
  };

  const handleUploadAndProcess = async (file: File) => {
    setIsProcessing(true);
    setErrorMessage(null);
    setProcessingStatus('processing');
    setStatusMessage('Uploading receipt to secure vault...');

    try {
      // 1. Upload file
      const uploadedReceipt = await receiptService.uploadReceipt(file);
      setActiveReceipt(uploadedReceipt);

      // 2. Trigger OCR & matching pipeline
      setStatusMessage('Extracting lines and matching product catalog...');
      const processed = await receiptService.processReceipt(uploadedReceipt.id);
      setActiveReceipt(processed);
      setProcessingStatus(processed.processing_status);

      // 3. Briefly show completion state then navigate to review
      setTimeout(() => {
        navigate(`/receipts/${processed.id}`);
      }, 800);
    } catch (err: unknown) {
      console.error('Receipt processing failed:', err);
      const msg = err instanceof Error ? err.message : 'Receipt upload or processing failed';
      setErrorMessage(msg);
      setProcessingStatus('failed');
      setIsProcessing(false);
    }
  };

  const handleDemoReceipt = async () => {
    const demoFile = await createDemoReceiptBlob();
    await handleUploadAndProcess(demoFile);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {/* Top Navigation */}
      <div className="flex items-center justify-between mb-6">
        <Link
          to="/receipts"
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Receipt History
        </Link>

        <span className="text-xs text-zinc-400 font-mono">Phase 5 Receipt Engine</span>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
          Scan Grocery Receipt
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Upload or capture your paper supermarket receipt to automatically identify purchased products, prices, and food ingredients.
        </p>
      </div>

      {/* Dynamic Processing Status tracker when running */}
      {isProcessing ? (
        <div className="space-y-6">
          <ReceiptProcessingStatusView
            status={processingStatus}
            events={activeReceipt?.events}
            ocrConfidence={activeReceipt?.ocr_confidence}
          />
        </div>
      ) : (
        /* Upload Component */
        <ReceiptUploader
          onFileSelect={handleUploadAndProcess}
          onUseDemoReceipt={handleDemoReceipt}
          isUploading={isProcessing}
          uploadProgressText={statusMessage}
          errorMessage={errorMessage}
        />
      )}

      {/* Helpful Hint Callout */}
      <div className="mt-8 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 dark:text-zinc-400 flex items-start gap-3">
        <HelpCircle className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
        <div>
          <span className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-0.5">
            Tips for accurate OCR product matching
          </span>
          Make sure the receipt is flat and well-lit. Product names and prices should be clearly visible. Our system automatically filters out non-food lines such as GST, subtotal, and card payment info.
        </div>
      </div>
    </div>
  );
};
