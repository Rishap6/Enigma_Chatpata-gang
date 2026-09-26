import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  PackageSearch,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Sparkles,
  Layers,
  ScanLine,
} from 'lucide-react';
import { productService } from '../services/productService';
import { ProductCard } from '../components/ProductCard';
import { ProductMatchPanel } from '../components/ProductMatchPanel';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';

export const ProductExplorerPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [page, setPage] = useState(1);
  const [showMatcher, setShowMatcher] = useState(false);
  const pageSize = 12;

  // Metadata queries for filters
  const { data: brands = [] } = useQuery({
    queryKey: ['product-brands'],
    queryFn: productService.getBrands,
    staleTime: 5 * 60 * 1000,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['product-categories'],
    queryFn: productService.getCategories,
    staleTime: 5 * 60 * 1000,
  });

  // Products paginated query
  const {
    data: productData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['products-list', page, pageSize, searchTerm, selectedBrand, selectedCategory],
    queryFn: () =>
      productService.getProducts({
        page,
        page_size: pageSize,
        search: searchTerm.trim() || undefined,
        brand: selectedBrand || undefined,
        category: selectedCategory || undefined,
      }),
    staleTime: 30 * 1000,
  });

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setPage(1);
  };

  const handleBrandChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedBrand(e.target.value);
    setPage(1);
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCategory(e.target.value);
    setPage(1);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedBrand('');
    setSelectedCategory('');
    setPage(1);
  };

  const hasActiveFilters = Boolean(searchTerm || selectedBrand || selectedCategory);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <PackageSearch className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
                Product Intelligence Explorer
              </h1>
              <p className="text-sm text-slate-400">
                Single source of truth for normalized food products, barcodes, and label ingredients
              </p>
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2.5">
          <Link
            to="/scan"
            className="px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all bg-emerald-600 hover:bg-emerald-500 text-white shadow-md active:scale-98"
          >
            <ScanLine className="w-4 h-4" />
            <span>Scan Barcode</span>
          </Link>

          <button
            onClick={() => setShowMatcher(!showMatcher)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all border ${
              showMatcher
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-lg shadow-cyan-950/40'
                : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-600'
            }`}
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>{showMatcher ? 'Hide Match Simulator' : 'Test Product Match / OCR'}</span>
          </button>
        </div>
      </div>

      {/* Product Match Simulator (Collapsible) */}
      {showMatcher && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-300">
          <ProductMatchPanel />
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search products by name or barcode..."
              className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          {/* Brand Filter */}
          <div className="sm:col-span-3">
            <select
              value={selectedBrand}
              onChange={handleBrandChange}
              className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
            >
              <option value="">All Brands</option>
              {brands.map((b) => (
                <option key={b.id} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="sm:col-span-3">
            <select
              value={selectedCategory}
              onChange={handleCategoryChange}
              className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
              <span>Filtering active</span>
            </div>
            <button
              onClick={clearFilters}
              className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Product Content Area */}
      {isLoading ? (
        <LoadingState message="Loading product intelligence knowledge base..." />
      ) : isError ? (
        <ErrorState
          message="Failed to load product intelligence catalog. Please try again."
          onRetry={() => refetch()}
        />
      ) : !productData || productData.items.length === 0 ? (
        <EmptyState
          title="No Products Found"
          description={
            hasActiveFilters
              ? 'No products matched your search or filters. Try clearing your filters or searching another keyword.'
              : 'The product knowledge base contains no active records.'
          }
          action={
            hasActiveFilters ? (
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold rounded-xl transition-colors"
              >
                Clear Filters
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-6">
          {/* Count and Pagination Header */}
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>
              Showing {productData.items.length} of {productData.total} products
            </span>
            <span>
              Page {productData.page} of {productData.pages}
            </span>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {productData.items.map((prod) => (
              <ProductCard key={prod.id} product={prod} />
            ))}
          </div>

          {/* Pagination Controls */}
          {productData.pages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-6">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <span className="text-xs font-mono text-slate-400 px-3 py-1 bg-slate-900/60 rounded-md border border-slate-800">
                {page} / {productData.pages}
              </span>

              <button
                onClick={() => setPage((p) => Math.min(p + 1, productData.pages))}
                disabled={page >= productData.pages}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
