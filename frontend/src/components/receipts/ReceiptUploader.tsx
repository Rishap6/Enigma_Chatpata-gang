import React, { useState, useRef } from 'react';
import {
  Upload,
  Camera,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileText,
  Sparkles,
  X,
} from 'lucide-react';

interface ReceiptUploaderProps {
  onFileSelect: (file: File) => Promise<void>;
  onUseDemoReceipt?: () => Promise<void>;
  isUploading?: boolean;
  uploadProgressText?: string;
  errorMessage?: string | null;
}

export const ReceiptUploader: React.FC<ReceiptUploaderProps> = ({
  onFileSelect,
  onUseDemoReceipt,
  isUploading = false,
  uploadProgressText = 'Uploading receipt...',
  errorMessage = null,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const processSelectedFile = (file: File) => {
    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const handleUploadClick = async () => {
    if (!selectedFile) return;
    await onFileSelect(selectedFile);
  };

  const clearSelection = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-sm">
      {/* Hidden file inputs: standard gallery/desktop picker & environment camera capture */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {errorMessage && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block">OCR or Upload Failed</span>
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      {/* Selected File Preview Mode */}
      {selectedFile ? (
        <div className="space-y-6">
          <div className="relative rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-950 flex items-center justify-center min-h-[300px] max-h-[450px]">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Receipt Preview"
                className="max-h-[450px] w-auto object-contain mx-auto"
              />
            ) : (
              <div className="text-center p-8 text-zinc-400">
                <FileText className="w-16 h-16 mx-auto mb-2 text-zinc-500" />
                <p className="font-medium text-sm">{selectedFile.name}</p>
                <p className="text-xs text-zinc-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
              </div>
            )}

            {!isUploading && (
              <button
                type="button"
                onClick={clearSelection}
                className="absolute top-4 right-4 p-2 bg-black/70 hover:bg-black text-white rounded-full transition-colors shadow-lg"
                title="Remove image"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              type="button"
              disabled={isUploading}
              onClick={handleUploadClick}
              className="w-full sm:flex-1 py-3.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm hover:shadow-emerald-900/20 transition-all flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{uploadProgressText}</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Process Receipt & Extract Groceries</span>
                </>
              )}
            </button>

            {!isUploading && (
              <button
                type="button"
                onClick={clearSelection}
                className="w-full sm:w-auto py-3.5 px-5 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium text-sm transition-colors"
              >
                Change Photo
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Empty / Dropzone Mode */
        <div className="space-y-6">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all duration-200 ${
              isDragOver
                ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                : 'border-zinc-300 dark:border-zinc-700 hover:border-emerald-500/70 hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
            }`}
          >
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900 flex items-center justify-center mx-auto mb-4 text-emerald-600 dark:text-emerald-400">
              <Upload className="w-8 h-8" />
            </div>

            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Upload or Snap Your Grocery Receipt
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mt-1 mb-6">
              Take a photo or upload an image of your supermarket receipt. Our OCR engine will segment grocery items and match them to our allergen catalog.
            </p>

            {/* Primary Action Buttons: Mobile camera vs Gallery */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="w-full sm:flex-1 py-3 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <Camera className="w-4 h-4" />
                Take Photo
              </button>

              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="w-full sm:flex-1 py-3 px-5 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-semibold text-sm shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <ImageIcon className="w-4 h-4" />
                Upload Image
              </button>
            </div>

            <p className="text-[11px] text-zinc-400 mt-4">
              Supported formats: JPEG, PNG, WEBP • Up to 15MB
            </p>
          </div>

          {/* Quick Demo Receipt Trigger */}
          {onUseDemoReceipt && (
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-center">
              <button
                type="button"
                disabled={isUploading}
                onClick={onUseDemoReceipt}
                className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:underline py-2"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Or Try Demo Grocery Receipt (NutriChoice, Atta, Ketchup)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
