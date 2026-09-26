import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { historyService } from '../services/historyService';
import { riskService } from '../services/riskService';
import {
  HistoricalSummaryCards,
  HistoricalCoverageCard,
  RecurringProductsTable,
  RecurringIngredientsPanel,
  MemberHistoryImpact,
  RecurringFindingsPanel,
  PeriodComparisonCard,
  MonthlyFamilyReport,
  PurchaseHistoryTimeline,
  DateRangeSelector,
} from '../components/history';
import { RiskExplanationDrawer } from '../components/risk/RiskExplanationDrawer';
import { RiskFinding, RiskStatus, RiskType } from '../types';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import {
  History,
  RotateCw,
  Sparkles,
  Package,
  Database,
  Users,
  Calendar,
  FileText,
  ArrowLeftRight,
  TrendingUp,
} from 'lucide-react';

export const FamilyGroceryHistoryPage: React.FC = () => {
  const { activeFamily } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<
    'overview' | 'products' | 'ingredients' | 'members' | 'comparison' | 'report' | 'timeline'
  >('overview');

  useEffect(() => {
    if (searchParams.get('tab') === 'patterns') {
      setActiveTab('overview');
    }
  }, [searchParams]);
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);

  // Sync / refresh mutation
  const refreshMutation = useMutation({
    mutationFn: () => historyService.refresh(activeFamily!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groceryHistory'] });
    },
  });

  // Query unified overview
  const {
    data: overviewData,
    isLoading: overviewLoading,
    error: overviewError,
    refetch: refetchOverview,
  } = useQuery({
    queryKey: ['groceryHistory', 'overview', activeFamily?.id, selectedPeriod],
    queryFn: () => historyService.getOverview(activeFamily!.id, { period: selectedPeriod }),
    enabled: !!activeFamily?.id,
  });

  // Query products
  const { data: productsData } = useQuery({
    queryKey: ['groceryHistory', 'products', activeFamily?.id, selectedPeriod],
    queryFn: () => historyService.getProducts(activeFamily!.id, { period: selectedPeriod }),
    enabled: !!activeFamily?.id && (activeTab === 'overview' || activeTab === 'products'),
  });

  // Query ingredients
  const { data: ingredientsData } = useQuery({
    queryKey: ['groceryHistory', 'ingredients', activeFamily?.id, selectedPeriod],
    queryFn: () => historyService.getIngredients(activeFamily!.id, { period: selectedPeriod }),
    enabled: !!activeFamily?.id && activeTab === 'ingredients',
  });

  // Query members
  const { data: membersData } = useQuery({
    queryKey: ['groceryHistory', 'members', activeFamily?.id, selectedPeriod],
    queryFn: () => historyService.getMembers(activeFamily!.id, { period: selectedPeriod }),
    enabled: !!activeFamily?.id && activeTab === 'members',
  });

  // Query period comparison
  const { data: comparisonData } = useQuery({
    queryKey: ['groceryHistory', 'comparison', activeFamily?.id, selectedPeriod],
    queryFn: () =>
      historyService.getComparison(
        activeFamily!.id,
        selectedPeriod === '7d' ? '7d' : selectedPeriod === '30d' ? '30d' : 'current_month'
      ),
    enabled: !!activeFamily?.id && activeTab === 'comparison',
  });

  // Query monthly report
  const { data: reportData } = useQuery({
    queryKey: ['groceryHistory', 'report', activeFamily?.id],
    queryFn: () => historyService.getReport(activeFamily!.id),
    enabled: !!activeFamily?.id && activeTab === 'report',
  });

  // Query Phase 7 explainability if a finding is clicked
  const { data: findingExplanation } = useQuery({
    queryKey: ['findingExplanation', selectedFindingId],
    queryFn: () => riskService.getFindingExplanation(selectedFindingId!),
    enabled: !!selectedFindingId,
  });

  // Synthesized finding for Phase 7 RiskExplanationDrawer
  const synthesizedFinding: RiskFinding | null = findingExplanation
    ? {
        id: findingExplanation.finding_id || selectedFindingId || '',
        member_id: findingExplanation.member_id || '',
        member_name: findingExplanation.member_name || undefined,
        product_id: findingExplanation.product_id || '',
        product_name: findingExplanation.product_name || undefined,
        status: (findingExplanation.status as RiskStatus) || 'potential_conflict',
        risk_type: (findingExplanation.conflict_type as RiskType) || 'direct_allergen',
        severity: findingExplanation.severity || 'medium',
        title: findingExplanation.headline || findingExplanation.title || 'Historical Finding',
        summary: findingExplanation.summary || '',
        trigger_text: findingExplanation.trigger,
        matched_rule: findingExplanation.configured_requirement || findingExplanation.rule,
        reason: findingExplanation.reason || findingExplanation.summary,
        confidence: findingExplanation.confidence,
        attention_score: findingExplanation.attention_score || 0,
        requires_verification: findingExplanation.requires_verification || false,
        cross_contact: findingExplanation.cross_contact || false,
        source_uncertainty: findingExplanation.source_uncertainty || false,
        ingredient_path: (findingExplanation.ingredient_chain || []).map((step, idx) => ({
          step_number: idx + 1,
          ingredient_name: step,
        })),
        evidence: (findingExplanation.evidence || []).map(ev => ({
          evidence_type: ev.evidence_type,
          description: ev.description || ev.snippet,
          confidence: ev.confidence,
          evidence_id: ev.evidence_id,
        })),
        explainability: findingExplanation,
      }
    : null;

  if (!activeFamily) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <EmptyState
          icon={<History className="w-8 h-8 text-slate-400" />}
          title="No Active Family Selected"
          description="Please select or configure a family profile to view longitudinal grocery purchase intelligence."
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100/70 text-emerald-800 border border-emerald-200 text-xs font-bold uppercase tracking-wider mb-2">
            <History className="w-3.5 h-3.5" />
            <span>Phase 8 Grocery Intelligence</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <span>Historical Grocery & Safety Trends</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Longitudinal intelligence analyzing household grocery purchases over time. Identifies recurring products,
            persistent ingredients, and personalized family requirements without assuming consumption.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-2xs inline-flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${refreshMutation.isPending ? 'animate-spin text-emerald-600' : ''}`} />
            <span>{refreshMutation.isPending ? 'Syncing...' : 'Sync History'}</span>
          </button>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <DateRangeSelector
          selectedPeriod={selectedPeriod}
          onSelectPeriod={setSelectedPeriod}
        />
        <div className="text-xs text-slate-500 font-medium">
          Family: <strong className="text-slate-800">{activeFamily.name}</strong>
        </div>
      </div>

      {overviewLoading ? (
        <LoadingState variant="page" />
      ) : overviewError ? (
        <ErrorState
          title="Error Loading Grocery History"
          message="Could not retrieve historical purchase data for this family profile."
          onRetry={refetchOverview}
        />
      ) : !overviewData || overviewData.summary.total_receipts === 0 ? (
        <div className="card p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
            <History className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-lg font-bold text-slate-900">No Grocery Purchase History Yet</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Upload scanned grocery receipts or analyze saved receipts to unlock longitudinal recurring product intelligence,
              derived ingredient trends, and period comparisons.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Executive Summary Cards */}
          <HistoricalSummaryCards summary={overviewData.summary} />

          {/* Navigation Tabs */}
          <div className="border-b border-slate-200/80 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2.5 border-b-2 text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === 'overview'
                  ? 'border-emerald-600 text-emerald-700 bg-emerald-50/30'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Overview & Patterns</span>
            </button>

            <button
              onClick={() => setActiveTab('products')}
              className={`px-4 py-2.5 border-b-2 text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === 'products'
                  ? 'border-emerald-600 text-emerald-700 bg-emerald-50/30'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Recurring Products</span>
            </button>

            <button
              onClick={() => setActiveTab('ingredients')}
              className={`px-4 py-2.5 border-b-2 text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === 'ingredients'
                  ? 'border-emerald-600 text-emerald-700 bg-emerald-50/30'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Ingredients Intelligence</span>
            </button>

            <button
              onClick={() => setActiveTab('members')}
              className={`px-4 py-2.5 border-b-2 text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === 'members'
                  ? 'border-emerald-600 text-emerald-700 bg-emerald-50/30'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Member Impact</span>
            </button>

            <button
              onClick={() => setActiveTab('comparison')}
              className={`px-4 py-2.5 border-b-2 text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === 'comparison'
                  ? 'border-emerald-600 text-emerald-700 bg-emerald-50/30'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>Period Comparison</span>
            </button>

            <button
              onClick={() => setActiveTab('report')}
              className={`px-4 py-2.5 border-b-2 text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === 'report'
                  ? 'border-emerald-600 text-emerald-700 bg-emerald-50/30'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Monthly Report</span>
            </button>

            <button
              onClick={() => setActiveTab('timeline')}
              className={`px-4 py-2.5 border-b-2 text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === 'timeline'
                  ? 'border-emerald-600 text-emerald-700 bg-emerald-50/30'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Purchase Timeline</span>
            </button>
          </div>

          {/* Tab 1: Overview & Patterns */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Coverage and Data Quality Indicator */}
              <HistoricalCoverageCard coverage={overviewData.coverage} />

              {/* Recurring Attention Patterns */}
              <RecurringFindingsPanel
                patterns={overviewData.recurring_patterns}
                onOpenFindingExplanation={(fid) => setSelectedFindingId(fid)}
              />

              {/* Top Recurring Products Preview */}
              <RecurringProductsTable
                products={productsData ? productsData.recurring_products : overviewData.top_recurring_products}
                onOpenFindingExplanation={(fid) => setSelectedFindingId(fid)}
              />

              {/* Timeline Preview */}
              <PurchaseHistoryTimeline timeline={overviewData.timeline} />
            </div>
          )}

          {/* Tab 2: Recurring Products */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              <RecurringProductsTable
                products={productsData ? productsData.recurring_products : overviewData.top_recurring_products}
                onOpenFindingExplanation={(fid) => setSelectedFindingId(fid)}
              />
            </div>
          )}

          {/* Tab 3: Ingredients Intelligence */}
          {activeTab === 'ingredients' && ingredientsData && (
            <div className="space-y-6">
              <RecurringIngredientsPanel
                directlyObserved={ingredientsData.directly_observed}
                relationshipDerived={ingredientsData.relationship_derived}
              />
            </div>
          )}

          {/* Tab 4: Member Impact */}
          {activeTab === 'members' && membersData && (
            <div className="space-y-6">
              <MemberHistoryImpact
                memberData={membersData}
                onOpenFindingExplanation={(fid) => setSelectedFindingId(fid)}
              />
            </div>
          )}

          {/* Tab 5: Period Comparison */}
          {activeTab === 'comparison' && comparisonData && (
            <div className="space-y-6">
              <PeriodComparisonCard
                comparison={comparisonData}
                selectedPeriod={selectedPeriod}
                onPeriodChange={setSelectedPeriod}
              />
            </div>
          )}

          {/* Tab 6: Monthly Report */}
          {activeTab === 'report' && reportData && (
            <div className="space-y-6">
              <MonthlyFamilyReport report={reportData} />
            </div>
          )}

          {/* Tab 7: Purchase Timeline */}
          {activeTab === 'timeline' && (
            <div className="space-y-6">
              <PurchaseHistoryTimeline timeline={overviewData.timeline} />
            </div>
          )}
        </>
      )}

      {/* Phase 7 Explainability Drawer Integration */}
      <RiskExplanationDrawer
        isOpen={!!selectedFindingId && !!findingExplanation}
        onClose={() => setSelectedFindingId(null)}
        finding={synthesizedFinding}
      />
    </div>
  );
};

export default FamilyGroceryHistoryPage;
