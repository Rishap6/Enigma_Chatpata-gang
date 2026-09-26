/**
 * Barcode normalization and format inference utilities.
 * 
 * Rules:
 * - Always preserve digits as strings.
 * - Always preserve leading zeros (e.g. "08901234560010").
 * - Never cast barcode identifiers to JavaScript numbers.
 */

export interface NormalizedBarcode {
  value: string;
  inferredFormat: 'EAN13' | 'EAN8' | 'UPC' | 'GTIN' | 'CODE128' | 'AUTO';
  isValid: boolean;
}

/**
 * Normalizes raw barcode input string:
 * - Trims whitespace
 * - Strips non-digit characters if retail barcode (or preserves alphanumeric for Code 128)
 * - Retains exact string representation with leading zeros
 */
export function normalizeBarcode(raw: string): string {
  if (!raw) return '';
  // Trim spaces and surrounding formatting characters
  const trimmed = raw.trim();
  // If numeric with possible hyphens or spaces, strip hyphens/spaces
  if (/^[\d\s-]+$/.test(trimmed)) {
    return trimmed.replace(/[\s-]+/g, '');
  }
  return trimmed;
}

/**
 * Maps scanner library format names (e.g. from html5-qrcode / ML Kit)
 * to standardized backend identifier types.
 */
export function mapScannerFormat(rawFormat: string): string {
  if (!rawFormat) return 'AUTO';
  const fmt = rawFormat.toUpperCase().replace(/[-_]/g, '');

  if (fmt.includes('EAN13')) return 'EAN13';
  if (fmt.includes('EAN8')) return 'EAN8';
  if (fmt.includes('UPCA') || fmt.includes('UPCE') || fmt.includes('UPC')) return 'UPC';
  if (fmt.includes('CODE128')) return 'CODE128';
  if (fmt.includes('GTIN')) return 'GTIN';

  return 'AUTO';
}

/**
 * Infers barcode standard from character count:
 * - 14 digits -> GTIN-14
 * - 13 digits -> EAN-13
 * - 12 digits -> UPC-A
 * - 8 digits  -> EAN-8
 */
export function inferBarcodeFormat(
  barcode: string
): 'EAN13' | 'EAN8' | 'UPC' | 'GTIN' | 'CODE128' | 'AUTO' {
  const clean = normalizeBarcode(barcode);

  if (/^\d{14}$/.test(clean)) return 'GTIN';
  if (/^\d{13}$/.test(clean)) return 'EAN13';
  if (/^\d{12}$/.test(clean)) return 'UPC';
  if (/^\d{8}$/.test(clean)) return 'EAN8';
  if (/^[A-Za-z0-9\s-]{4,30}$/.test(clean)) return 'CODE128';

  return 'AUTO';
}

/**
 * Validates whether string is a plausible retail barcode.
 */
export function isValidBarcode(barcode: string): boolean {
  const clean = normalizeBarcode(barcode);
  if (!clean || clean.length < 6 || clean.length > 18) return false;
  // Retail product barcodes must contain digits only
  return /^\d{6,18}$/.test(clean);
}

/**
 * Comprehensive parser returning normalized value, format, and validity.
 */
export function parseBarcode(raw: string): NormalizedBarcode {
  const clean = normalizeBarcode(raw);
  const isValid = isValidBarcode(clean);
  const inferredFormat = inferBarcodeFormat(clean);

  return {
    value: clean,
    inferredFormat,
    isValid,
  };
}
