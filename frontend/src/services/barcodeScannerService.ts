import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { mapScannerFormat, normalizeBarcode } from '../utils/barcode';

export interface BarcodeScanResult {
  value: string;
  format: string;
  normalizedFormat: string;
}

export type CameraPermissionStatus = 'granted' | 'denied' | 'prompt' | 'unavailable';

export interface IBarcodeScannerAdapter {
  checkPermission(): Promise<CameraPermissionStatus>;
  requestPermission(): Promise<CameraPermissionStatus>;
  start(
    elementId: string,
    onScan: (result: BarcodeScanResult) => void,
    onError?: (err: Error) => void
  ): Promise<void>;
  stop(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  hasTorch(): Promise<boolean>;
  toggleTorch(enabled: boolean): Promise<boolean>;
  isScanning(): boolean;
}

/**
 * Standard Web & Capacitor Android HTML5 Camera Adapter
 */
export class Html5QrcodeScannerAdapter implements IBarcodeScannerAdapter {
  private scanner: Html5Qrcode | null = null;
  private scanning = false;
  private paused = false;
  private currentElementId: string | null = null;

  async checkPermission(): Promise<CameraPermissionStatus> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return 'unavailable';
      }
      if (navigator.permissions && navigator.permissions.query) {
        const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
        if (result.state === 'granted') return 'granted';
        if (result.state === 'denied') return 'denied';
        return 'prompt';
      }
      return 'prompt';
    } catch {
      return 'prompt';
    }
  }

  async requestPermission(): Promise<CameraPermissionStatus> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return 'unavailable';
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      // Stop stream immediately after permission grant
      stream.getTracks().forEach((track) => track.stop());
      return 'granted';
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        return 'denied';
      }
      return 'unavailable';
    }
  }

  async start(
    elementId: string,
    onScan: (result: BarcodeScanResult) => void,
    onError?: (err: Error) => void
  ): Promise<void> {
    if (this.scanning) {
      await this.stop();
    }

    this.currentElementId = elementId;
    this.scanner = new Html5Qrcode(elementId, {
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

    const config = {
      fps: 15,
      qrbox: { width: 280, height: 160 },
      aspectRatio: 1.777778, // 16:9 standard
    };

    try {
      await this.scanner.start(
        { facingMode: 'environment' },
        config,
        (decodedText, decodedResult) => {
          if (this.paused) return;

          const rawFmt = decodedResult.result.format?.formatName || 'EAN_13';
          const normVal = normalizeBarcode(decodedText);
          const mappedFmt = mapScannerFormat(rawFmt);

          onScan({
            value: normVal,
            format: rawFmt,
            normalizedFormat: mappedFmt,
          });
        },
        (errorMessage) => {
          // Frame evaluation frame drop (normal while seeking barcode)
          // Only emit on hard critical errors
        }
      );
      this.scanning = true;
      this.paused = false;
    } catch (err: any) {
      this.scanning = false;
      if (onError) {
        onError(err instanceof Error ? err : new Error(String(err)));
      }
      throw err;
    }
  }

  async stop(): Promise<void> {
    if (this.scanner && this.scanning) {
      try {
        await this.scanner.stop();
        this.scanner.clear();
      } catch (err) {
        // Ignore already stopped error
      }
    }
    this.scanning = false;
    this.paused = false;
    this.scanner = null;
    this.currentElementId = null;
  }

  async pause(): Promise<void> {
    if (this.scanner && this.scanning) {
      try {
        this.scanner.pause(true);
        this.paused = true;
      } catch {
        this.paused = true;
      }
    }
  }

  async resume(): Promise<void> {
    if (this.scanner && this.scanning) {
      try {
        this.scanner.resume();
        this.paused = false;
      } catch {
        this.paused = false;
      }
    }
  }

  async hasTorch(): Promise<boolean> {
    if (!this.scanner || !this.scanning) return false;
    try {
      const capabilities = this.scanner.getRunningTrackCapabilities();
      return Boolean((capabilities as any)?.torch);
    } catch {
      return false;
    }
  }

  async toggleTorch(enabled: boolean): Promise<boolean> {
    if (!this.scanner || !this.scanning) return false;
    try {
      await this.scanner.applyVideoConstraints({
        advanced: [{ torch: enabled } as any],
      });
      return true;
    } catch {
      return false;
    }
  }

  isScanning(): boolean {
    return this.scanning;
  }
}

/**
 * Mock Barcode Scanner Adapter for Vitest and Simulated Browser environments
 */
export class MockBarcodeScannerAdapter implements IBarcodeScannerAdapter {
  private scanning = false;
  private paused = false;
  private onScanCallback: ((result: BarcodeScanResult) => void) | null = null;
  private onErrorCallback: ((err: Error) => void) | null = null;
  private mockPermission: CameraPermissionStatus = 'granted';
  private torchOn = false;

  setMockPermission(status: CameraPermissionStatus | boolean) {
    if (typeof status === 'boolean') {
      this.mockPermission = status ? 'granted' : 'denied';
    } else {
      this.mockPermission = status;
    }
  }

  isScanningActive(): boolean {
    return this.scanning;
  }

  async checkPermission(): Promise<CameraPermissionStatus> {
    return this.mockPermission;
  }

  async requestPermission(): Promise<CameraPermissionStatus> {
    return this.mockPermission;
  }

  async start(
    elementId: string,
    onScan: (result: BarcodeScanResult) => void,
    onError?: (err: Error) => void
  ): Promise<void> {
    if (this.mockPermission === 'denied') {
      const err = new Error('Permission denied to use camera');
      if (onError) onError(err);
      throw err;
    }
    this.scanning = true;
    this.paused = false;
    this.onScanCallback = onScan;
    this.onErrorCallback = onError || null;
  }

  async stop(): Promise<void> {
    this.scanning = false;
    this.paused = false;
    this.onScanCallback = null;
    this.onErrorCallback = null;
  }

  async pause(): Promise<void> {
    this.paused = true;
  }

  async resume(): Promise<void> {
    this.paused = false;
  }

  async hasTorch(): Promise<boolean> {
    return true;
  }

  async toggleTorch(enabled: boolean): Promise<boolean> {
    this.torchOn = enabled;
    return true;
  }

  isScanning(): boolean {
    return this.scanning;
  }

  // Test helper: simulate camera scan trigger
  simulateScan(value: string, format = 'EAN_13') {
    if (this.scanning && !this.paused && this.onScanCallback) {
      this.onScanCallback({
        value: normalizeBarcode(value),
        format,
        normalizedFormat: mapScannerFormat(format),
      });
    }
  }

  simulateError(error: Error) {
    if (this.onErrorCallback) {
      this.onErrorCallback(error);
    }
  }
}

/**
 * Singleton Service controlling active scanner adapter
 */
class BarcodeScannerServiceManager {
  private adapter: IBarcodeScannerAdapter;

  constructor() {
    this.adapter = new Html5QrcodeScannerAdapter();
  }

  setAdapter(customAdapter: IBarcodeScannerAdapter) {
    if (this.adapter.isScanning()) {
      this.adapter.stop();
    }
    this.adapter = customAdapter;
  }

  getAdapter(): IBarcodeScannerAdapter {
    return this.adapter;
  }

  async checkPermission(): Promise<CameraPermissionStatus> {
    return this.adapter.checkPermission();
  }

  async requestPermission(): Promise<CameraPermissionStatus> {
    return this.adapter.requestPermission();
  }

  async start(
    elementId: string,
    onScan: (result: BarcodeScanResult) => void,
    onError?: (err: Error) => void
  ): Promise<void> {
    return this.adapter.start(elementId, onScan, onError);
  }

  async stop(): Promise<void> {
    return this.adapter.stop();
  }

  async pause(): Promise<void> {
    return this.adapter.pause();
  }

  async resume(): Promise<void> {
    return this.adapter.resume();
  }

  async hasTorch(): Promise<boolean> {
    return this.adapter.hasTorch();
  }

  async toggleTorch(enabled: boolean): Promise<boolean> {
    return this.adapter.toggleTorch(enabled);
  }

  isScanning(): boolean {
    return this.adapter.isScanning();
  }
}

export const barcodeScannerService = new BarcodeScannerServiceManager();
