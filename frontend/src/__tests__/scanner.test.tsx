import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ScanProductPage } from '../pages/ScanProductPage';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { ManualBarcodeInput } from '../components/ManualBarcodeInput';
import {
  barcodeScannerService,
  MockBarcodeScannerAdapter,
} from '../services/barcodeScannerService';
import { productService } from '../services/productService';
import {
  normalizeBarcode,
  inferBarcodeFormat,
  mapScannerFormat,
  isValidBarcode,
} from '../utils/barcode';
import { ProductDetail } from '../types';

// Mock productService
vi.mock('../services/productService', () => ({
  productService: {
    lookupProductByIdentifier: vi.fn(),
    getProduct: vi.fn(),
    getProductAnalysis: vi.fn(),
  },
}));

// Sample mock product
const mockBritanniaProduct: ProductDetail = {
  id: 'prod-britannia-123',
  name: 'Britannia NutriChoice Digestive Biscuits',
  normalized_name: 'britannia nutrichoice digestive biscuits',
  description: 'High fibre digestive biscuits',
  brand_id: 'brand-britannia',
  brand: {
    id: 'brand-britannia',
    name: 'Britannia',
    normalized_name: 'britannia',
    created_at: '2026-01-01',
  },
  category_id: 'cat-biscuits',
  category: { id: 'cat-biscuits', name: 'Biscuits & Cookies' },
  barcode: '08901234560010',
  gtin: '08901234560010',
  pack_size: '100',
  unit: 'g',
  serving_size: '25g',
  country: 'India',
  image_url: null,
  ingredients_raw: 'Whole wheat flour, palm oil, wheat bran',
  allergen_statement_raw: 'Contains wheat.',
  cross_contact_statement_raw: null,
  source_name: 'Britannia Catalog',
  source_type: 'curated_dataset',
  confidence: 0.99,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  identifiers: [
    {
      id: 'ident-1',
      product_id: 'prod-britannia-123',
      identifier_type: 'EAN13',
      identifier_value: '08901234560010',
      is_primary: true,
      created_at: '2026-01-01T00:00:00Z',
    },
  ],
  ingredients: [],
  allergen_statements: [],
  data_sources: [],
};

const renderWithProviders = (initialRoute = '/scan') => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/scan" element={<ScanProductPage />} />
          <Route
            path="/products/:productId"
            element={<div data-testid="product-detail-target">Product Detail Target Page</div>}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('Phase 4: Barcode Normalization Utilities', () => {
  it('preserves leading zeros and extracts digits cleanly', () => {
    expect(normalizeBarcode('08901234560010')).toBe('08901234560010');
    expect(normalizeBarcode('  0012345678905  ')).toBe('0012345678905');
    expect(normalizeBarcode('089-0123-4560010')).toBe('08901234560010');
    expect(typeof normalizeBarcode('08901234560010')).toBe('string');
  });

  it('correctly infers barcode formats based on length', () => {
    expect(inferBarcodeFormat('8901234560010')).toBe('EAN13'); // 13 digits
    expect(inferBarcodeFormat('12345678')).toBe('EAN8'); // 8 digits
    expect(inferBarcodeFormat('012345678905')).toBe('UPC'); // 12 digits
    expect(inferBarcodeFormat('08901234560010')).toBe('GTIN'); // 14 digits
  });

  it('maps scanner engine formats to Phase 3 identifier types', () => {
    expect(mapScannerFormat('EAN_13')).toBe('EAN13');
    expect(mapScannerFormat('EAN_8')).toBe('EAN8');
    expect(mapScannerFormat('UPC_A')).toBe('UPC');
    expect(mapScannerFormat('UPC_E')).toBe('UPC');
    expect(mapScannerFormat('CODE_128')).toBe('CODE128');
    expect(mapScannerFormat('UNKNOWN_FORMAT')).toBe('AUTO');
  });

  it('validates barcode strings', () => {
    expect(isValidBarcode('08901234560010')).toBe(true);
    expect(isValidBarcode('12345678')).toBe(true);
    expect(isValidBarcode('123')).toBe(false); // too short
    expect(isValidBarcode('12345678901234567890')).toBe(false); // too long (20 digits > 18)
    expect(isValidBarcode('ABC-INVALID')).toBe(false);
  });
});

describe('Phase 4: ManualBarcodeInput Component', () => {
  it('renders input and validates manual submission with leading zero preserved', () => {
    const handleSearch = vi.fn();
    render(<ManualBarcodeInput onSearch={handleSearch} isLoading={false} />);

    const input = screen.getByPlaceholderText(/Enter barcode digits/i);
    const submitBtn = screen.getByRole('button', { name: /Find Product/i });

    // Type with leading zero (14-digit GTIN-14)
    fireEvent.change(input, { target: { value: '08901234560010' } });
    expect(screen.getByText(/Detected format:/i)).toHaveTextContent('GTIN');

    fireEvent.click(submitBtn);
    expect(handleSearch).toHaveBeenCalledWith('08901234560010', 'GTIN');
  });

  it('allows manual format override', () => {
    const handleSearch = vi.fn();
    render(<ManualBarcodeInput onSearch={handleSearch} />);

    const input = screen.getByPlaceholderText(/Enter barcode digits/i);
    fireEvent.change(input, { target: { value: '012345678905' } });

    // Select explicit UPC format
    const formatSelect = screen.getByRole('combobox');
    fireEvent.change(formatSelect, { target: { value: 'UPC' } });

    const submitBtn = screen.getByRole('button', { name: /Find Product/i });
    fireEvent.click(submitBtn);

    expect(handleSearch).toHaveBeenCalledWith('012345678905', 'UPC');
  });
});

describe('Phase 4: ScanProductPage State Machine & Workflows', () => {
  let mockAdapter: MockBarcodeScannerAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAdapter = new MockBarcodeScannerAdapter();
    barcodeScannerService.setAdapter(mockAdapter);
  });

  afterEach(async () => {
    await barcodeScannerService.stop();
  });

  it('renders scanner page with initial scanning state and camera viewfinder', async () => {
    renderWithProviders('/scan');

    expect(screen.getByText('Scan Product')).toBeInTheDocument();
    expect(screen.getByText(/Align barcode/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Manual barcode entry/i })).toBeInTheDocument();
  });

  it('handles camera permission denied cleanly without crashing', async () => {
    mockAdapter.setMockPermission(false);
    renderWithProviders('/scan');

    await waitFor(() => {
      expect(screen.getByText(/Camera Access Required/i)).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Camera access is required to scan a barcode automatically/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Try Again/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Enter Barcode Manually/i }).length).toBeGreaterThan(0);
  });

  it('detects barcode, preserves leading zeros, looks up product, and navigates to ProductDetailPage', async () => {
    vi.mocked(productService.lookupProductByIdentifier).mockResolvedValueOnce(mockBritanniaProduct);

    renderWithProviders('/scan');

    await waitFor(() => {
      expect(mockAdapter.isScanningActive()).toBe(true);
    });

    // Simulate camera detecting EAN-13 barcode with leading zero
    mockAdapter.simulateScan('08901234560010', 'EAN_13');

    // Should call Phase 3 identifier API with mapped type and preserved string
    await waitFor(() => {
      expect(productService.lookupProductByIdentifier).toHaveBeenCalledWith(
        'EAN13',
        '08901234560010'
      );
    });

    // Should display brief transition feedback
    expect(screen.getByText(/Product Found!/i)).toBeInTheDocument();
    expect(screen.getByText(/08901234560010/i)).toBeInTheDocument();

    // After brief transition, navigates to /products/:id
    await waitFor(
      () => {
        expect(screen.getByTestId('product-detail-target')).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

  it('prevents duplicate scan bursts from triggering multiple API lookups', async () => {
    vi.mocked(productService.lookupProductByIdentifier).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockBritanniaProduct), 50))
    );

    renderWithProviders('/scan');

    await waitFor(() => {
      expect(mockAdapter.isScanningActive()).toBe(true);
    });

    // Fire 5 rapid scans in immediate succession (simulating hardware camera burst)
    mockAdapter.simulateScan('08901234560010', 'EAN_13');
    mockAdapter.simulateScan('08901234560010', 'EAN_13');
    mockAdapter.simulateScan('08901234560010', 'EAN_13');
    mockAdapter.simulateScan('08901234560010', 'EAN_13');
    mockAdapter.simulateScan('08901234560010', 'EAN_13');

    await waitFor(() => {
      expect(productService.lookupProductByIdentifier).toHaveBeenCalledTimes(1);
    });
  });

  it('handles unknown barcode (404) gracefully without fabricating a product', async () => {
    const error404: any = new Error('Product not found');
    error404.response = { status: 404, data: { detail: 'Product identifier not found' } };
    vi.mocked(productService.lookupProductByIdentifier).mockRejectedValueOnce(error404);

    renderWithProviders('/scan');

    await waitFor(() => {
      expect(mockAdapter.isScanningActive()).toBe(true);
    });

    // Scan an unknown barcode
    mockAdapter.simulateScan('0000000000000', 'EAN_13');

    await waitFor(() => {
      expect(screen.getByText(/Product Not Found/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/0000000000000/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Scan Again/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Enter Barcode Manually/i }).length).toBeGreaterThan(0);
    expect(
      screen.getByText(/Ingredient label OCR scanning will be available in a future phase/i)
    ).toBeInTheDocument();

    // Verify retry button resets scan state
    fireEvent.click(screen.getByRole('button', { name: /Scan Again/i }));
    await waitFor(() => {
      expect(screen.getByText(/Align barcode/i)).toBeInTheDocument();
    });
  });

  it('handles manual barcode entry fallback successfully', async () => {
    vi.mocked(productService.lookupProductByIdentifier).mockResolvedValueOnce(mockBritanniaProduct);

    renderWithProviders('/scan');

    // Switch to manual input
    const manualBtn = screen.getByRole('button', { name: /Manual barcode entry/i });
    fireEvent.click(manualBtn);

    const input = screen.getByPlaceholderText(/Enter barcode digits/i);
    fireEvent.change(input, { target: { value: '08901234560010' } });

    // Select explicit EAN13 format from the dropdown
    const formatSelect = screen.getByRole('combobox');
    fireEvent.change(formatSelect, { target: { value: 'EAN13' } });

    const submitBtn = screen.getByRole('button', { name: /Find Product/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(productService.lookupProductByIdentifier).toHaveBeenCalledWith(
        'EAN13',
        '08901234560010'
      );
    });
  });

  it('handles network failure gracefully', async () => {
    const netErr: any = new Error('Network Error');
    vi.mocked(productService.lookupProductByIdentifier).mockRejectedValueOnce(netErr);

    renderWithProviders('/scan');

    await waitFor(() => {
      expect(mockAdapter.isScanningActive()).toBe(true);
    });

    mockAdapter.simulateScan('08901234560010', 'EAN_13');

    await waitFor(() => {
      expect(screen.getByText(/Scan or Lookup Error/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/We need an active internet connection/i)).toBeInTheDocument();
  });
});
