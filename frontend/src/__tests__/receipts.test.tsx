import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';

import { ReceiptUploadPage } from '../pages/ReceiptUploadPage';
import { ReceiptReviewPage } from '../pages/ReceiptReviewPage';
import { ReceiptHistoryPage } from '../pages/ReceiptHistoryPage';
import { ReceiptProcessingStatusView } from '../components/receipts/ReceiptProcessingStatus';
import { ReceiptCoverageCard } from '../components/receipts/ReceiptCoverageCard';
import { ReceiptSummary } from '../components/receipts/ReceiptSummary';
import { ReceiptItemCard } from '../components/receipts/ReceiptItemCard';
import { ReceiptRawTextPanel } from '../components/receipts/ReceiptRawTextPanel';
import { ReceiptItemResolutionModal } from '../components/receipts/ReceiptItemResolutionModal';
import { receiptService } from '../services/receiptService';
import { productService } from '../services/productService';
import { Receipt, ReceiptItem, ReceiptCoverageSummary, Product } from '../types';

vi.mock('../services/receiptService', () => ({
  receiptService: {
    uploadReceipt: vi.fn(),
    processReceipt: vi.fn(),
    getReceipts: vi.fn(),
    getReceipt: vi.fn(),
    getReceiptItems: vi.fn(),
    getReceiptAnalysis: vi.fn(),
    updateReceiptItem: vi.fn(),
    resolveReceiptItemProduct: vi.fn(),
    resolveReceiptItemBarcode: vi.fn(),
    addManualItem: vi.fn(),
    deleteReceiptItem: vi.fn(),
    getImageUrl: vi.fn((id: string) => `/api/receipts/${id}/image`),
  },
}));

vi.mock('../services/productService', () => ({
  productService: {
    getProducts: vi.fn(),
    getProduct: vi.fn(),
  },
}));

const mockMatchedProduct: Product = {
  id: 'prod-nutri-1',
  name: 'Britannia NutriChoice Digestive Biscuit',
  normalized_name: 'britannia nutrichoice digestive biscuit',
  brand_id: 'brand-1',
  brand: { id: 'brand-1', name: 'Britannia', normalized_name: 'britannia', created_at: '' },
  category_id: 'cat-1',
  category: { id: 'cat-1', name: 'Biscuits', slug: 'biscuits', created_at: '' },
  barcode: '8901063012347',
  gtin: '08901063012347',
  pack_size: '100',
  unit: 'g',
  serving_size: '25g',
  country: 'India',
  confidence: 0.98,
  is_active: true,
  created_at: '',
  updated_at: '',
  identifiers: [],
  ingredients: [],
  allergen_statements: [],
  data_sources: [],
};

const mockMatchedItem: ReceiptItem = {
  id: 'item-1',
  receipt_id: 'receipt-101',
  line_number: 1,
  raw_text: 'BRIT NUTR CHC 40G 40.00',
  product_name_raw: 'BRIT NUTR CHC 40G',
  product_name_normalized: 'brit nutr chc 40g',
  quantity: 1,
  unit_price: 40.0,
  total_price: 40.0,
  currency: 'INR',
  product_id: 'prod-nutri-1',
  product: mockMatchedProduct,
  candidate_products: [],
  match_method: 'exact_alias',
  match_confidence: 0.96,
  requires_selection: false,
  requires_verification: false,
  user_corrected: false,
};

const mockAmbiguousItem: ReceiptItem = {
  id: 'item-2',
  receipt_id: 'receipt-101',
  line_number: 2,
  raw_text: 'CHOC BIS 40 40.00',
  product_name_raw: 'CHOC BIS 40',
  product_name_normalized: 'choc bis 40',
  quantity: 1,
  unit_price: 40.0,
  total_price: 40.0,
  currency: 'INR',
  product_id: null,
  product: null,
  candidate_products: [mockMatchedProduct],
  match_method: 'fuzzy',
  match_confidence: 0.72,
  requires_selection: true,
  requires_verification: false,
  user_corrected: false,
};

const mockUnknownItem: ReceiptItem = {
  id: 'item-3',
  receipt_id: 'receipt-101',
  line_number: 3,
  raw_text: 'XYZ MYSTERY ITEM 99.00',
  product_name_raw: 'XYZ MYSTERY ITEM',
  product_name_normalized: 'xyz mystery item',
  quantity: 1,
  unit_price: 99.0,
  total_price: 99.0,
  currency: 'INR',
  product_id: null,
  product: null,
  candidate_products: [],
  match_method: null,
  match_confidence: null,
  requires_selection: false,
  requires_verification: true,
  user_corrected: false,
};

const mockReceipt: Receipt = {
  id: 'receipt-101',
  owner_user_id: 'user-alice-1',
  family_id: null,
  original_filename: 'september_groceries.png',
  image_url: '/api/receipts/receipt-101/image',
  ocr_text: 'DEMO STORE\nBRIT NUTR CHC 40G 40.00\nCHOC BIS 40 40.00\nXYZ MYSTERY ITEM 99.00\nTOTAL 179.00',
  processing_status: 'partial',
  ocr_confidence: 0.94,
  purchase_date: '2026-09-20T00:00:00Z',
  currency: 'INR',
  subtotal: 179.0,
  tax: 0.0,
  total_amount: 179.0,
  items: [mockMatchedItem, mockAmbiguousItem, mockUnknownItem],
  events: [
    { id: 'ev-1', receipt_id: 'receipt-101', stage: 'upload', status: 'completed', duration_ms: 12, created_at: '' },
    { id: 'ev-2', receipt_id: 'receipt-101', stage: 'ocr', status: 'completed', duration_ms: 180, created_at: '' },
    { id: 'ev-3', receipt_id: 'receipt-101', stage: 'match', status: 'completed', duration_ms: 45, created_at: '' },
  ],
  coverage: {
    total_items: 3,
    matched: 1,
    ambiguous: 1,
    unknown: 1,
    coverage_ratio: 0.33,
  },
  created_at: '2026-09-20T10:00:00Z',
  updated_at: '2026-09-20T10:01:00Z',
};

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
};

describe('Phase 5: Grocery Receipt Intelligence & Product Extraction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders ReceiptUploadPage with title, camera, and gallery upload options', () => {
    renderWithProviders(<ReceiptUploadPage />);

    expect(screen.getByText('Scan Grocery Receipt')).toBeDefined();
    expect(screen.getByText('Take Photo')).toBeDefined();
    expect(screen.getByText('Upload Image')).toBeDefined();
    expect(screen.getByText(/Tips for accurate OCR product matching/i)).toBeDefined();
  });

  it('renders ReceiptProcessingStatusView with progress stages and OCR confidence', () => {
    renderWithProviders(
      <ReceiptProcessingStatusView
        status="processing"
        ocrConfidence={0.92}
        events={mockReceipt.events}
      />
    );

    expect(screen.getByText('Processing Grocery Receipt')).toBeDefined();
    expect(screen.getByText('92%')).toBeDefined();
    expect(screen.getByText('Uploading receipt...')).toBeDefined();
    expect(screen.getByText('Reading receipt text (OCR)...')).toBeDefined();
  });

  it('renders ReceiptCoverageCard with coverage ratio and action required status', () => {
    const coverage: ReceiptCoverageSummary = {
      total_items: 10,
      matched: 8,
      ambiguous: 1,
      unknown: 1,
      coverage_ratio: 0.8,
    };

    renderWithProviders(<ReceiptCoverageCard coverage={coverage} readyForPhase6={false} />);

    expect(screen.getByText('80% Products Identified')).toBeDefined();
    expect(screen.getByText('2 items need review')).toBeDefined();
    expect(screen.getByText('Total Items')).toBeDefined();
    expect(screen.getByText('8')).toBeDefined();
  });

  it('renders ReceiptCoverageCard as Ready for family analysis when coverage is complete', () => {
    const completeCoverage: ReceiptCoverageSummary = {
      total_items: 5,
      matched: 5,
      ambiguous: 0,
      unknown: 0,
      coverage_ratio: 1.0,
    };

    renderWithProviders(<ReceiptCoverageCard coverage={completeCoverage} readyForPhase6={true} />);

    expect(screen.getByText('100% Products Identified')).toBeDefined();
    expect(screen.getByText('Ready for family analysis')).toBeDefined();
  });

  it('renders ReceiptSummary with totals, items, and Confirm button', () => {
    const onConfirm = vi.fn();
    const onAdd = vi.fn();

    renderWithProviders(
      <ReceiptSummary
        receipt={mockReceipt}
        coverage={mockReceipt.coverage!}
        onConfirmList={onConfirm}
        onAddManualItem={onAdd}
      />
    );

    expect(screen.getByText('september_groceries.png')).toBeDefined();
    expect(screen.getByText(/Total: ₹179.00/i)).toBeDefined();
    expect(screen.getByText('Confirm Grocery List')).toBeDefined();
    expect(screen.getByText('Add Item Manually')).toBeDefined();

    fireEvent.click(screen.getByText('Confirm Grocery List'));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('renders matched item card with product link, price, and confidence badge', () => {
    const onResolve = vi.fn();
    const onUpdate = vi.fn();
    const onDelete = vi.fn();

    renderWithProviders(
      <ReceiptItemCard
        item={mockMatchedItem}
        onOpenResolution={onResolve}
        onUpdateItem={onUpdate}
        onDeleteItem={onDelete}
      />
    );

    expect(screen.getByText('Britannia NutriChoice Digestive Biscuit')).toBeDefined();
    expect(screen.getByText('Matched (96%)')).toBeDefined();
    expect(screen.getByText('₹40.00')).toBeDefined();
    expect(screen.getByText(/OCR: "BRIT NUTR CHC 40G 40.00"/i)).toBeDefined();
  });

  it('renders ambiguous item card with Choose Product button', () => {
    const onResolve = vi.fn();
    const onUpdate = vi.fn();
    const onDelete = vi.fn();

    renderWithProviders(
      <ReceiptItemCard
        item={mockAmbiguousItem}
        onOpenResolution={onResolve}
        onUpdateItem={onUpdate}
        onDeleteItem={onDelete}
      />
    );

    expect(screen.getByText(/Ambiguous \(1 candidates\)/i)).toBeDefined();
    const chooseBtn = screen.getByText(/Choose Product/i);
    expect(chooseBtn).toBeDefined();

    fireEvent.click(chooseBtn);
    expect(onResolve).toHaveBeenCalledWith(mockAmbiguousItem, 'candidates');
  });

  it('renders unknown item card with Scan Barcode and Search Catalog options', () => {
    const onResolve = vi.fn();
    const onUpdate = vi.fn();
    const onDelete = vi.fn();

    renderWithProviders(
      <ReceiptItemCard
        item={mockUnknownItem}
        onOpenResolution={onResolve}
        onUpdateItem={onUpdate}
        onDeleteItem={onDelete}
      />
    );

    expect(screen.getByText('Unknown Product')).toBeDefined();
    expect(screen.getByText('Scan Barcode')).toBeDefined();
    expect(screen.getByText('Search Catalog')).toBeDefined();

    fireEvent.click(screen.getByText('Scan Barcode'));
    expect(onResolve).toHaveBeenCalledWith(mockUnknownItem, 'barcode');
  });

  it('renders ReceiptItemResolutionModal and allows selecting candidate product', async () => {
    const onSelect = vi.fn();
    const onResolveBarcode = vi.fn();
    const onClose = vi.fn();

    renderWithProviders(
      <ReceiptItemResolutionModal
        item={mockAmbiguousItem}
        isOpen={true}
        onClose={onClose}
        initialTab="candidates"
        onSelectProduct={onSelect}
        onResolveBarcode={onResolveBarcode}
      />
    );

    expect(screen.getByText('Resolve Grocery Product')).toBeDefined();
    expect(screen.getByText('Britannia NutriChoice Digestive Biscuit')).toBeDefined();

    const selectBtn = screen.getByText('Select');
    fireEvent.click(selectBtn);

    await waitFor(() => {
      expect(onSelect).toHaveBeenCalledWith('prod-nutri-1');
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('renders ReceiptRawTextPanel and expands to show OCR text', () => {
    renderWithProviders(
      <ReceiptRawTextPanel rawText="BRIT NUTR CHC 40G 40.00" ocrConfidence={0.94} />
    );

    expect(screen.getByText('Raw OCR Text Output')).toBeDefined();
    expect(screen.getByText('Inspect')).toBeDefined();

    fireEvent.click(screen.getByText('Raw OCR Text Output'));
    expect(screen.getByText('BRIT NUTR CHC 40G 40.00')).toBeDefined();
  });

  it('renders ReceiptHistoryPage with receipts list', async () => {
    vi.mocked(receiptService.getReceipts).mockResolvedValueOnce({
      items: [mockReceipt],
      total: 1,
      page: 1,
      page_size: 50,
      pages: 1,
    });

    renderWithProviders(<ReceiptHistoryPage />);

    await waitFor(() => {
      expect(screen.getByText('Grocery Receipts')).toBeDefined();
      expect(screen.getByText('september_groceries.png')).toBeDefined();
    });
  });
});
