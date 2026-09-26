import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  Camera,
  Flashlight,
  FlashlightOff,
  AlertTriangle,
  RefreshCw,
  X,
  ScanLine,
  FileText,
  Scan,
  Upload,
  Image as ImageIcon,
  Smartphone,
} from 'lucide-react';
import {
  barcodeScannerService,
  BarcodeScanResult,
  CameraPermissionStatus,
} from '../services/barcodeScannerService';

export type ScannerMode = 'barcode' | 'ocr' | 'both';

interface BarcodeScannerProps {
  onDetected: (result: BarcodeScanResult) => void;
  onOCRDetected?: (text: string) => void;
  onError?: (message: string, isPermissionError: boolean) => void;
  onClose?: () => void;
  enabled?: boolean;
  isProcessing?: boolean;
  mode?: ScannerMode;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  onDetected,
  onOCRDetected,
  onError,
  onClose,
  enabled = true,
  isProcessing = false,
  mode = 'barcode',
}) => {
  const scannerContainerId = 'barcode-scanner-viewport';
  const [permissionStatus, setPermissionStatus] = useState<CameraPermissionStatus>('prompt');
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [hasTorch, setHasTorch] = useState(false);
  const [torchActive, setTorchActive] = useState(false);
  const [ocrText, setOcrText] = useState<string>('');
  const [isScanningFile, setIsScanningFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const ocrIntervalRef = useRef<number | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Prevent multiple burst detections of the same barcode
  const processingRef = useRef(false);
  processingRef.current = isProcessing;

  const handlePhotoScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanningFile(true);
    setFileError(null);

    let tempDiv = document.getElementById('barcode-temp-file-scanner');
    if (!tempDiv) {
      tempDiv = document.createElement('div');
      tempDiv.id = 'barcode-temp-file-scanner';
      tempDiv.style.display = 'none';
      document.body.appendChild(tempDiv);
    }

    try {
      const html5QrCode = new Html5Qrcode('barcode-temp-file-scanner', {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.QR_CODE,
        ],
        verbose: false,
      });

      const decodedText = await html5QrCode.scanFile(file, false);
      html5QrCode.clear();

      const norm = decodedText.replace(/[^0-9A-Za-z]/g, '');
      onDetected({
        value: norm,
        format: 'EAN_13',
        normalizedFormat: 'EAN13',
      });
    } catch (err: any) {
      setFileError('Could not decode barcode from photo. Please ensure the barcode is sharp, centered, and well-lit.');
    } finally {
      setIsScanningFile(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const startScanner = async () => {
    setIsInitializing(true);
    setInitError(null);

    try {
      const perm = await barcodeScannerService.requestPermission();
      setPermissionStatus(perm);

      if (perm === 'denied') {
        setIsInitializing(false);
        if (onError) {
          onError('Camera access is required to scan a barcode automatically.', true);
        }
        return;
      }

      // For OCR mode, use native video stream
      if (mode === 'ocr') {
        await startOCRMode();
      } else {
        // Use barcode scanner service for barcode or both modes
        await barcodeScannerService.start(
          scannerContainerId,
          (result) => {
            if (processingRef.current) return;
            processingRef.current = true;
            // Immediately pause hardware camera stream to prevent bursts
            barcodeScannerService.pause();
            onDetected(result);
          },
          (err) => {
            const isPerm = String(err?.message || '').toLowerCase().includes('permission');
            if (onError) onError(err?.message || 'Camera error', isPerm);
          }
        );

        // If 'both' mode, also start OCR in parallel
        if (mode === 'both') {
          await startOCRMode();
        }
      }

      setIsInitializing(false);
      const torchAvail = await barcodeScannerService.hasTorch();
      setHasTorch(torchAvail);
    } catch (err: any) {
      setIsInitializing(false);
      const isPerm = String(err?.message || '').toLowerCase().includes('permission');
      setInitError(err.message || 'Failed to initialize camera scanner');
      if (onError) onError(err.message || 'Failed to initialize camera scanner', isPerm);
    }
  };

  const workerRef = useRef<any>(null);
  const isInitializingWorkerRef = useRef(false);

  const getWorker = async () => {
    if (workerRef.current) return workerRef.current;
    if (isInitializingWorkerRef.current) return null;

    try {
      isInitializingWorkerRef.current = true;
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng');
      workerRef.current = worker;
      return worker;
    } catch (err) {
      console.error('Failed to initialize Tesseract worker:', err);
      return null;
    } finally {
      isInitializingWorkerRef.current = false;
    }
  };

  const startOCRMode = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }

      // Start OCR processing every 1.5 seconds
      startOCRProcessing();
    } catch (err: any) {
      throw new Error('Failed to access camera for OCR: ' + err.message);
    }
  };

  const startOCRProcessing = async () => {
    if (ocrIntervalRef.current) {
      clearInterval(ocrIntervalRef.current);
    }

    // Pre-initialize worker
    getWorker().catch(() => {});

    const processFrame = async () => {
      if (!videoRef.current || processingRef.current) return;
      const vw = videoRef.current.videoWidth;
      const vh = videoRef.current.videoHeight;
      if (!vw || !vh) return;

      try {
        const worker = await getWorker();
        if (!worker) return;

        const canvas = document.createElement('canvas');
        canvas.width = vw;
        canvas.height = vh;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Enhance contrast for sharp text recognition
        ctx.filter = 'contrast(140%) grayscale(100%)';
        ctx.drawImage(videoRef.current, 0, 0, vw, vh);

        const { data: { text } } = await worker.recognize(canvas);

        if (text && text.trim().length > 10) {
          const cleanText = text.trim();
          setOcrText(cleanText);
          if (onOCRDetected) {
            onOCRDetected(cleanText);
          }
        }
      } catch (err) {
        console.error('OCR frame processing error:', err);
      }
    };

    // Process frame every 1.5 seconds
    ocrIntervalRef.current = window.setInterval(processFrame, 1500);
  };

  const stopOCRMode = () => {
    if (ocrIntervalRef.current) {
      clearInterval(ocrIntervalRef.current);
      ocrIntervalRef.current = null;
    }
    if (workerRef.current) {
      const w = workerRef.current;
      workerRef.current = null;
      w.terminate().catch(() => {});
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    if (enabled) {
      startScanner();
    } else {
      barcodeScannerService.stop();
      stopOCRMode();
    }

    return () => {
      barcodeScannerService.stop();
      stopOCRMode();
    };
  }, [enabled, mode]);

  const handleToggleTorch = async () => {
    const nextState = !torchActive;
    const ok = await barcodeScannerService.toggleTorch(nextState);
    if (ok) {
      setTorchActive(nextState);
    }
  };

  // Permission Denied or Camera Error View
  if (permissionStatus === 'denied' || initError) {
    return (
      <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-6 text-center space-y-4 shadow-2xl backdrop-blur-md max-w-md mx-auto">
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handlePhotoScan}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhotoScan}
        />

        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 text-cyan-400 flex items-center justify-center mx-auto border border-cyan-500/30">
          <Smartphone className="w-7 h-7 text-cyan-400" />
        </div>

        <div>
          <h3 className="text-base font-bold text-slate-100">
            {permissionStatus === 'denied' ? 'Camera Permission Blocked' : 'Live Camera Not Available'}
          </h3>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            Mobile browsers require a secure connection for continuous live video stream. You can still scan barcodes instantly using your phone's camera!
          </p>
        </div>

        {fileError && (
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2 text-left">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{fileError}</span>
          </div>
        )}

        <div className="space-y-2.5 pt-1">
          <button
            type="button"
            disabled={isScanningFile}
            onClick={() => photoInputRef.current?.click()}
            className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
          >
            {isScanningFile ? (
              <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
            ) : (
              <Camera className="w-4 h-4 text-slate-950" />
            )}
            <span>{isScanningFile ? 'Scanning Barcode...' : '📸 Snap Photo of Barcode'}</span>
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={isScanningFile}
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span>Upload Photo</span>
            </button>

            <button
              type="button"
              onClick={startScanner}
              className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Live</span>
            </button>
          </div>
        </div>

        <p className="text-[10px] text-slate-500 pt-1">
          💡 Tip: Access via <span className="font-mono text-cyan-400">https://</span> to enable automatic live video scanning.
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-[4/3] sm:aspect-[16/9] max-h-[500px] bg-black rounded-3xl overflow-hidden shadow-2xl border border-slate-800">
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handlePhotoScan}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoScan}
      />

      {/* HTML5 video element - for barcode mode (Html5Qrcode) or OCR mode (native stream) */}
      {mode === 'ocr' ? (
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
        />
      ) : (
        <div id={scannerContainerId} className="w-full h-full object-cover" />
      )}

      {/* Target Scanning Overlay Frame */}
      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
        {/* Dimmed backdrop surround */}
        <div className="relative w-72 h-44 border-2 border-cyan-400/80 rounded-2xl shadow-[0_0_30px_rgba(6,182,212,0.3)] bg-transparent">
          {/* Animated Laser Scanning Line */}
          <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-[pulse_1.5s_ease-in-out_infinite]" />

          {/* Corner Guides */}
          <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-cyan-400 rounded-tl-lg" />
          <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-cyan-400 rounded-tr-lg" />
          <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-cyan-400 rounded-bl-lg" />
          <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-cyan-400 rounded-br-lg" />

          {/* Prompt in Frame */}
          <div className="absolute -bottom-8 left-0 right-0 text-center">
            <span className="text-[11px] font-medium text-slate-200 bg-slate-950/80 px-3 py-1 rounded-full border border-slate-800 backdrop-blur-md">
              {mode === 'ocr' ? 'Align ingredient label within frame' : 'Align barcode within frame'}
            </span>
          </div>
        </div>
      </div>

      {/* OCR Text Preview (if in OCR mode and text detected) */}
      {mode === 'ocr' && ocrText && (
        <div className="absolute bottom-4 left-4 right-4 bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-xl p-3 max-h-32 overflow-y-auto z-10">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-[10px] font-semibold text-violet-400 uppercase tracking-wide">Detected Text</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">{ocrText}</p>
        </div>
      )}

      {/* Bottom Floating Snap Photo / Upload Actions */}
      <div className="absolute bottom-3 left-4 right-4 flex items-center justify-center gap-2 z-10 pointer-events-auto">
        <button
          type="button"
          onClick={() => photoInputRef.current?.click()}
          className="px-3 py-1.5 rounded-full bg-slate-900/85 hover:bg-slate-800 backdrop-blur-md border border-slate-700/80 text-emerald-400 text-[11px] font-semibold flex items-center gap-1.5 shadow-lg transition-all"
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Snap Photo</span>
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-1.5 rounded-full bg-slate-900/85 hover:bg-slate-800 backdrop-blur-md border border-slate-700/80 text-slate-300 hover:text-white text-[11px] font-medium flex items-center gap-1.5 shadow-lg transition-all"
        >
          <Upload className="w-3.5 h-3.5 text-cyan-400" />
          <span>Upload Image</span>
        </button>
      </div>

      {/* Top Floating Controls */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
        {hasTorch && (
          <button
            type="button"
            onClick={handleToggleTorch}
            className={`p-2.5 rounded-full backdrop-blur-md border transition-all ${
              torchActive
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-lg shadow-amber-500/20'
                : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
            title="Toggle Flash / Torch"
          >
            {torchActive ? (
              <Flashlight className="w-4 h-4 fill-amber-300/30" />
            ) : (
              <FlashlightOff className="w-4 h-4" />
            )}
          </button>
        )}

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors ml-auto"
            title="Cancel Scanning"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Loading / Processing Indicator Overlay */}
      {isInitializing && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center gap-3 text-slate-200 z-20">
          <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin" />
          <span className="text-xs font-semibold">Starting camera...</span>
        </div>
      )}

      {isScanningFile && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center gap-3 text-slate-200 z-20">
          <RefreshCw className="w-7 h-7 text-emerald-400 animate-spin" />
          <span className="text-xs font-semibold text-emerald-300">Decoding barcode from photo...</span>
        </div>
      )}

      {isProcessing && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center gap-3 text-slate-200 z-20 animate-in fade-in duration-150">
          <ScanLine className="w-8 h-8 text-cyan-400 animate-pulse" />
          <span className="text-sm font-bold text-cyan-400 tracking-wide">
            Barcode Detected!
          </span>
          <span className="text-xs text-slate-400">Querying product catalog...</span>
        </div>
      )}
    </div>
  );
};
