import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { riskService } from '../services/riskService';
import { MemberRiskResponse, RiskFinding } from '../types';
import { RiskFindingCard } from '../components/risk/RiskFindingCard';
import { RiskExplanationDrawer } from '../components/risk/RiskExplanationDrawer';
import { TerminologyHelper } from '../components/risk/TerminologyHelper';


export const MemberRiskDetailPage: React.FC = () => {
  const { receiptId, memberId } = useParams<{ receiptId: string; memberId: string }>();

  const [memberRisk, setMemberRisk] = useState<MemberRiskResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFinding, setSelectedFinding] = useState<RiskFinding | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  useEffect(() => {
    if (receiptId && memberId) {
      loadMemberRisk(receiptId, memberId);
    }
  }, [receiptId, memberId]);

  const loadMemberRisk = async (rId: string, mId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await riskService.getReceiptMemberRisk(rId, mId);
      setMemberRisk(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load member risk profile';
      setError(msg);
    } finally {
      setLoading(false);
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
        <p className="text-sm font-medium">Loading member risk profile...</p>
      </div>
    );
  }

  if (error || !memberRisk) {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 rounded-2xl border border-red-500/30 bg-red-950/20 text-center">
        <span className="text-3xl mb-3 block">⚠️</span>
        <h2 className="text-lg font-bold text-red-200 mb-2">Member Findings Unavailable</h2>
        <p className="text-sm text-slate-400 mb-6">{error || 'Could not load data for this family member.'}</p>
        <Link
          to={`/risk/receipts/${receiptId}`}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition"
        >
          Back to Family Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Navigation & Header */}
      <div>
        <Link
          to={`/risk/receipts/${receiptId}`}
          className="text-xs text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1 mb-2"
        >
          <span>←</span>
          <span>Back to Family Dashboard</span>
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-indigo-950 border border-indigo-700/50 flex items-center justify-center text-sm font-bold text-indigo-300">
                {memberRisk.member_name.charAt(0)}
              </div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">
                {memberRisk.member_name}&apos;s Grocery Risk Results
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Personalized findings evaluated across all purchased items in this grocery run.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs flex-wrap">
            <span className="px-3 py-1.5 rounded-lg bg-red-950/40 border border-red-800/40 text-red-300 font-bold">
              🔴 {memberRisk.summary.high} High Attention
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-amber-950/40 border border-amber-800/40 text-amber-300 font-bold">
              🟠 {memberRisk.summary.potential} Potential
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-yellow-950/40 border border-yellow-800/40 text-yellow-300 font-bold">
              🟡 {memberRisk.summary.verification} Verify
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 font-bold">
              🟢 {memberRisk.summary.no_conflict} Clear
            </span>
            <TerminologyHelper />
          </div>
        </div>
      </div>

      {/* Product Findings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {memberRisk.product_results.map((finding: RiskFinding, idx: number) => (
          <RiskFindingCard
            key={idx}
            finding={finding}
            onViewExplanation={handleOpenExplanation}
          />
        ))}

      </div>

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
