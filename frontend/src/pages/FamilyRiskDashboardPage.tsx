import React, { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { riskService } from '../services/riskService';
import { receiptService } from '../services/receiptService';
import { RiskAnalysisResponse, RiskFinding, Receipt, MemberRiskResponse } from '../types';
import { RiskSummaryCards } from '../components/risk/RiskSummaryCards';
import { RiskMatrixGrid } from '../components/risk/RiskMatrixGrid';
import { MemberRiskSection } from '../components/risk/MemberRiskSection';
import { RiskFindingCard } from '../components/risk/RiskFindingCard';
import { RiskExplanationDrawer } from '../components/risk/RiskExplanationDrawer';
import { FamilyRiskInsights } from '../components/risk/FamilyRiskInsights';
import { TerminologyHelper } from '../components/risk/TerminologyHelper';
import { RiskAuditRecord } from '../components/risk/RiskAuditRecord';
import { notificationService } from '../services/notificationService';


export const FamilyRiskDashboardPage: React.FC = () => {
  const { receiptId } = useParams<{ receiptId: string }>();
  const [searchParams] = useSearchParams();
  const findingIdParam = searchParams.get('findingId');

  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [analysis, setAnalysis] = useState<RiskAnalysisResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & State
  const [viewMode, setViewMode] = useState<'matrix' | 'members' | 'findings'>('matrix');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [memberFilter, setMemberFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFinding, setSelectedFinding] = useState<RiskFinding | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [unreadHighAttention, setUnreadHighAttention] = useState<number | null>(null);

  useEffect(() => {
    if (!analysis?.family_id) return;
    notificationService
      .listAlerts(analysis.family_id, {
        status: 'unread',
        type: 'HIGH_ATTENTION',
        limit: 10,
      })
      .then((list) => {
        if (list && typeof list.total === 'number') {
          setUnreadHighAttention(list.total);
        }
      })
      .catch(() => {
        setUnreadHighAttention(0);
      });
  }, [analysis?.family_id]);

  useEffect(() => {
    if (receiptId) {
      loadData(receiptId);
    }
  }, [receiptId]);

  useEffect(() => {
    if (!analysis || !findingIdParam) return;
    const allFindings: RiskFinding[] = analysis.members.flatMap((m) => m.product_results);
    const match = allFindings.find((f) => f.id === findingIdParam);
    if (match) {
      setSelectedFinding(match);
      setIsDrawerOpen(true);
    }
  }, [analysis, findingIdParam]);

  const loadData = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch receipt
      const rcpt = await receiptService.getReceipt(id);
      setReceipt(rcpt);

      // 2. Fetch latest analysis, or trigger if not yet analyzed
      try {
        const latest = await riskService.getLatestReceiptRisk(id);
        setAnalysis(latest);
      } catch (err: unknown) {
        // If not analyzed yet, auto-trigger analysis
        console.log('No previous risk analysis found, triggering new run...');
        const newAnalysis = await riskService.analyzeReceiptRisk(id);
        setAnalysis(newAnalysis);
      }
    } catch (err: unknown) {
      console.error('Failed to load risk analysis:', err);
      const msg = err instanceof Error ? err.message : 'Failed to load family risk analysis';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleReanalyze = async () => {
    if (!receiptId) return;
    setAnalyzing(true);
    setError(null);
    try {
      const refreshed = await riskService.analyzeReceiptRisk(receiptId);
      setAnalysis(refreshed);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Re-analysis failed';
      setError(msg);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleOpenExplanation = (finding: RiskFinding) => {
    setSelectedFinding(finding);
    setIsDrawerOpen(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-slate-400">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
        <p className="text-sm font-medium">Evaluating family grocery safety intelligence...</p>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 rounded-2xl border border-red-500/30 bg-red-950/20 text-center">
        <span className="text-3xl mb-3 block">⚠️</span>
        <h2 className="text-lg font-bold text-red-200 mb-2">Family Risk Analysis Unavailable</h2>
        <p className="text-sm text-slate-400 mb-6">{error || 'Could not evaluate risk for this receipt.'}</p>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => receiptId && loadData(receiptId)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition"
          >
            Retry Analysis
          </button>
          <Link
            to="/receipts"
            className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-sm font-medium transition"
          >
            Back to Receipts
          </Link>
        </div>
      </div>
    );
  }

  // Filter findings for the list view
  const allFindings: RiskFinding[] = analysis.members.flatMap((m: MemberRiskResponse) => m.product_results);
  const filteredFindings = allFindings.filter((f: RiskFinding) => {
    if (statusFilter && f.status !== statusFilter) return false;

    if (memberFilter && f.member_id !== memberFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const pMatch = f.product_name?.toLowerCase().includes(q);
      const mMatch = f.member_name?.toLowerCase().includes(q);
      const tMatch = f.trigger_text?.toLowerCase().includes(q);
      const rMatch = f.risk_type?.toLowerCase().includes(q);
      if (!pMatch && !mMatch && !tMatch && !rMatch) return false;
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-indigo-400 mb-1">
            <span>FAMILY GROCERY ANALYSIS</span>
            <span>•</span>
            <span>VERSION {analysis.analysis_version}</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Family Grocery Risk Intelligence
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Receipt: {receipt?.original_filename || 'Grocery Receipt'} ({analysis.summary.products_analyzed} products, {analysis.summary.members_analyzed} family members evaluated)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={analyzing}
            onClick={handleReanalyze}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 transition disabled:opacity-50"
          >
            {analyzing ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-indigo-400/20 border-t-indigo-400 rounded-full animate-spin" />
                <span>Re-analyzing...</span>
              </>
            ) : (
              <>
                <span>🔄</span>
                <span>Re-analyze</span>
              </>
            )}
          </button>
          <TerminologyHelper />
          <Link
            to={`/receipts/${receiptId}`}
            className="px-4 py-2 rounded-xl border border-slate-800 hover:bg-slate-850 text-slate-400 hover:text-slate-200 text-xs font-medium transition"
          >
            Review Receipt
          </Link>
        </div>
      </div>

      {unreadHighAttention != null && unreadHighAttention > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-sm">
          <span className="text-rose-100">
            {unreadHighAttention} purchase finding{unreadHighAttention === 1 ? '' : 's'} require attention
          </span>
          <Link
            to="/notifications"
            className="text-xs font-bold text-rose-200 hover:text-white underline-offset-2 hover:underline shrink-0"
          >
            View notifications
          </Link>
        </div>
      )}

      {/* Family Safety Executive Insights */}
      <FamilyRiskInsights
        analysis={analysis}
        onFilterStatus={(st) => {
          setStatusFilter(st);
          setViewMode('findings');
        }}
      />

      {/* Summary KPI Cards */}
      <RiskSummaryCards
        summary={analysis.summary}
        activeFilter={statusFilter}
        onFilterChange={setStatusFilter}
      />

      {/* View Mode Switcher & Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="inline-flex rounded-xl p-1 bg-slate-900 border border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('matrix')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'matrix'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              📊 Family Matrix
            </button>
            <button
              type="button"
              onClick={() => setViewMode('members')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'members'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              👨‍👩‍👧 By Member
            </button>
            <button
              type="button"
              onClick={() => setViewMode('findings')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'findings'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              📋 All Findings ({filteredFindings.length})
            </button>
          </div>
        </div>

        {/* Search input */}
        <div className="w-full md:w-72">
          <input
            type="text"
            placeholder="Search product, ingredient, member..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Active Filter Pill */}
      {(statusFilter || memberFilter || searchQuery) && (
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>Active filters:</span>
          {statusFilter && (
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
              Status: {statusFilter.replace(/_/g, ' ')}
              <button type="button" onClick={() => setStatusFilter(null)} className="hover:text-red-400 ml-1">
                ✕
              </button>
            </span>
          )}
          {memberFilter && (
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
              Member filter
              <button type="button" onClick={() => setMemberFilter(null)} className="hover:text-red-400 ml-1">
                ✕
              </button>
            </span>
          )}
          {searchQuery && (
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
              &quot;{searchQuery}&quot;
              <button type="button" onClick={() => setSearchQuery('')} className="hover:text-red-400 ml-1">
                ✕
              </button>
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              setStatusFilter(null);
              setMemberFilter(null);
              setSearchQuery('');
            }}
            className="text-xs text-indigo-400 hover:underline ml-2"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Main View Mode Render */}
      {viewMode === 'matrix' && analysis.matrix && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Click any cell to view the transparent reasoning and Phase 2 knowledge chain.</span>
            <div className="flex items-center gap-3">
              <span>🔴 High Attention</span>
              <span>🟠 Potential Conflict</span>
              <span>🟡 Verification Required</span>
              <span>🟢 No Configured Conflict</span>
            </div>
          </div>
          <RiskMatrixGrid
            matrix={analysis.matrix}
            onSelectFinding={handleOpenExplanation}
          />
        </div>
      )}

      {viewMode === 'members' && (
        <MemberRiskSection
          members={analysis.members}
          selectedMemberId={memberFilter}
          onSelectMember={setMemberFilter}
          onViewExplanation={handleOpenExplanation}
        />
      )}

      {viewMode === 'findings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredFindings.map((finding: RiskFinding, idx: number) => (
            <RiskFindingCard

              key={idx}
              finding={finding}
              onViewExplanation={handleOpenExplanation}
            />
          ))}
          {filteredFindings.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-500 text-sm">
              No risk findings match the selected filter criteria.
            </div>
          )}
        </div>
      )}

      {/* Immutable Audit Record & Provenance */}
      <RiskAuditRecord analysis={analysis} />

      {/* Slide-out Explanation Drawer */}
      <RiskExplanationDrawer
        finding={selectedFinding}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedFinding(null);
        }}
      />
    </div>
  );
};
