import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Search,
  Sparkles,
  Layers,
  Shield,
  HelpCircle,
  FileText,
  Code2,
  CheckCircle,
  ChevronRight,
  Database,
  ArrowRight,
} from 'lucide-react';
import { ingredientService } from '../services/ingredientService';
import { UnifiedIngredientAnalysis } from '../types';
import { IngredientRelationshipTree } from '../components/IngredientRelationshipTree';
import { IngredientCategoryBadge } from '../components/IngredientCategoryBadge';
import { SourceStatusBadge } from '../components/SourceStatusBadge';
import { ConfidenceIndicator } from '../components/ConfidenceIndicator';
import { UncertaintyBanner } from '../components/UncertaintyBanner';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';

const SAMPLE_INGREDIENTS = [
  'Whey Protein',
  'INS 471',
  'Gelatin',
  'Maida',
  'Sodium Caseinate',
  'Groundnut',
  'Soy Lecithin',
  'Unknown Ingredient XYZ',
];

export const IngredientExplorerPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAnalysis, setSelectedAnalysis] = useState<UnifiedIngredientAnalysis | null>(null);
  const [showJson, setShowJson] = useState(false);

  // Search autocomplete query
  const { data: searchResults, isFetching: isSearching } = useQuery({
    queryKey: ['ingredient-search', searchTerm],
    queryFn: () => ingredientService.searchIngredients(searchTerm),
    enabled: searchTerm.trim().length >= 2,
    staleTime: 60 * 1000,
  });

  // Analysis mutation
  const analyzeMutation = useMutation({
    mutationFn: (text: string) => ingredientService.analyzeIngredient(text),
  });

  const handleAnalyze = async (textToAnalyze: string) => {
    const term = textToAnalyze.trim();
    if (!term) return;
    setSearchTerm(term);
    try {
      const result = await analyzeMutation.mutateAsync(term);
      setSelectedAnalysis(result);
    } catch {
      // Error handled by mutation state
    }
  };

  const handleSelectSearchResult = (canonicalName: string) => {
    handleAnalyze(canonicalName);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-blue-950 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-indigo-800/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-400/30">
            <Database className="w-3.5 h-3.5" />
            <span>Phase 2 • Knowledge Reasoning Foundation</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Ingredient Intelligence Explorer
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Deterministic normalization, multi-level derivation tracing, source uncertainty
            analysis, and allergen resolution without false assumptions.
          </p>
        </div>
      </div>

      {/* Search & Input Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAnalyze(searchTerm);
          }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              id="ingredient-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search or enter ingredient (e.g., Whey Protein, INS 471, Maida, Gelatin)..."
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all"
            />
          </div>
          <button
            type="submit"
            id="analyze-ingredient-button"
            disabled={!searchTerm.trim() || analyzeMutation.isPending}
            className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-semibold text-sm transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            {analyzeMutation.isPending ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span>Analyze Ingredient</span>
          </button>
        </form>

        {/* Quick Sample Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="text-slate-500 font-medium">Quick Test:</span>
          {SAMPLE_INGREDIENTS.map((sample) => (
            <button
              key={sample}
              type="button"
              onClick={() => handleAnalyze(sample)}
              className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 font-medium transition-colors border border-slate-200/60"
            >
              {sample}
            </button>
          ))}
        </div>

        {/* Live Search Autocomplete Dropdown */}
        {searchResults && searchResults.length > 0 && searchTerm.trim().length >= 2 && !selectedAnalysis && (
          <div className="pt-2 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Database Matches ({searchResults.length})
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {searchResults.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelectSearchResult(item.display_name)}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all text-left"
                >
                  <div>
                    <div className="font-semibold text-sm text-slate-800">{item.display_name}</div>
                    <div className="text-[11px] text-slate-500">
                      {item.matched_alias ? `via alias: "${item.matched_alias}"` : item.canonical_name}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Analysis Results */}
      {analyzeMutation.isPending && (
        <LoadingState message="Analyzing ingredient knowledge, relationships, and origins..." />
      )}

      {analyzeMutation.isError && (
        <ErrorState
          title="Analysis Failed"
          message="Could not analyze ingredient. Ensure backend is running."
          onRetry={() => handleAnalyze(searchTerm)}
        />
      )}

      {selectedAnalysis && !analyzeMutation.isPending && (
        <div className="space-y-6" data-testid="ingredient-analysis-result">
          {/* Top Classification Header */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Raw Query Input
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
                  "{selectedAnalysis.raw_input}"
                </div>
                {selectedAnalysis.matched && selectedAnalysis.normalized_ingredient && (
                  <div className="text-sm text-slate-600 mt-1 flex items-center gap-2">
                    <span>Resolved to Canonical:</span>
                    <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      {selectedAnalysis.normalized_ingredient.display_name}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      ({selectedAnalysis.normalized_ingredient.canonical_name})
                    </span>
                  </div>
                )}
              </div>

              <div className="w-full sm:w-64">
                <ConfidenceIndicator
                  confidence={selectedAnalysis.confidence}
                  method={selectedAnalysis.match?.method}
                />
              </div>
            </div>

            {/* Banners for Unknown or Uncertain */}
            {!selectedAnalysis.matched && (
              <UncertaintyBanner
                type="unknown_ingredient"
                title="Unknown Ingredient"
                message="We could not confidently identify this ingredient from the knowledge base. No false assumptions or hallucinations were made."
                candidate={selectedAnalysis.candidate}
                onSelectCandidate={handleAnalyze}
              />
            )}

            {selectedAnalysis.requires_verification && selectedAnalysis.matched && (
              <UncertaintyBanner
                type="source_uncertain"
                title="🟡 Source Origin Uncertain / Verification Required"
                message="This ingredient (e.g. INS 471) can originate from plant or animal fats. It cannot be classified as definitely vegetarian or definitely non-vegetarian without batch verification."
              />
            )}

            {/* Structured Insights Grid */}
            {selectedAnalysis.matched && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                {/* Categories */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Categories</span>
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedAnalysis.categories.length > 0 ? (
                      selectedAnalysis.categories.map((cat, idx) => (
                        <IngredientCategoryBadge key={idx} category={cat} />
                      ))
                    ) : (
                      <span className="text-xs text-slate-400">None assigned</span>
                    )}
                  </div>
                </div>

                {/* Allergens */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-rose-600" />
                    <span>Allergen Associations</span>
                  </h3>
                  <div className="space-y-1.5">
                    {selectedAnalysis.allergens.length > 0 ? (
                      selectedAnalysis.allergens.map((alg, idx) => (
                        <div
                          key={idx}
                          className="px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-900 font-medium flex items-center justify-between"
                        >
                          <span className="font-semibold">{alg.name}</span>
                          <span className="text-[10px] font-mono opacity-70">
                            {alg.relationship}
                          </span>
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400">No allergen associations</span>
                    )}
                  </div>
                </div>

                {/* Source Intelligence */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Source Intelligence</span>
                  </h3>
                  <div className="space-y-1.5">
                    {selectedAnalysis.sources.length > 0 ? (
                      selectedAnalysis.sources.map((src, idx) => (
                        <SourceStatusBadge
                          key={idx}
                          sourceType={src.type}
                          sourceStatus={src.status}
                          confidence={src.confidence}
                        />
                      ))
                    ) : (
                      <span className="text-xs text-slate-400">Source not documented</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Derivation Relationship Graph */}
          {selectedAnalysis.matched && (
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <ArrowRight className="w-5 h-5 text-indigo-600" />
                    <span>Multi-Level Relationship Traversal</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Recursive ancestry graph showing what this ingredient is derived from.
                  </p>
                </div>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                  {selectedAnalysis.relationship_chains.length} Chains Found
                </span>
              </div>

              <IngredientRelationshipTree
                rootName={selectedAnalysis.normalized_ingredient?.display_name || selectedAnalysis.raw_input}
                chains={selectedAnalysis.relationship_chains}
                directRelationships={selectedAnalysis.relationships}
              />
            </div>
          )}

          {/* Dietary Properties & Summary */}
          {selectedAnalysis.matched && (
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <span>Dietary Properties Evaluation</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-xs text-slate-500 font-medium">Vegetarian Compatibility</div>
                  <div className="text-base font-bold text-slate-900 mt-1 capitalize">
                    {selectedAnalysis.dietary_summary.vegetarian_compatible || 'Unknown'}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-xs text-slate-500 font-medium">Vegan Compatibility</div>
                  <div className="text-base font-bold text-slate-900 mt-1 capitalize">
                    {selectedAnalysis.dietary_summary.vegan_compatible || 'Unknown'}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-xs text-slate-500 font-medium">Animal-Derived Status</div>
                  <div className="text-base font-bold text-slate-900 mt-1 capitalize">
                    {selectedAnalysis.dietary_summary.animal_derived || 'Unknown'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Evidence & Provenance */}
          {selectedAnalysis.evidence && selectedAnalysis.evidence.length > 0 && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500" />
                <span>Knowledge Evidence & Provenance</span>
              </h3>
              <div className="space-y-2">
                {selectedAnalysis.evidence.map((ev, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs flex items-center justify-between"
                  >
                    <div>
                      <span className="font-semibold text-slate-800">{ev.source_name}</span>
                      <span className="text-slate-500 ml-2">({ev.source_type})</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-mono text-[10px] uppercase">
                      Level: {ev.evidence_level}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Phase 6 Contract: Raw JSON Payload Inspector */}
          <div className="bg-slate-900 rounded-2xl p-6 text-white border border-slate-800 shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-bold text-slate-200">
                  Phase 6 Risk Engine Contract (Structured Output)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowJson(!showJson)}
                className="text-xs font-semibold px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                {showJson ? 'Hide JSON' : 'Inspect JSON'}
              </button>
            </div>
            {showJson && (
              <pre className="p-4 rounded-xl bg-black/60 text-emerald-400 font-mono text-xs overflow-x-auto max-h-96 border border-slate-800">
                {JSON.stringify(selectedAnalysis, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
