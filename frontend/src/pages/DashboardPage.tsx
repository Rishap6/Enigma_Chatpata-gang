import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { familyService } from '../services/familyService';
import { FamilyMemberCard } from '../components/FamilyMemberCard';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import {
  Users,
  ShieldAlert,
  Utensils,
  BookOpen,
  UserPlus,
  Sparkles,
  Heart,
  PlusCircle,
  ScanLine,
  Receipt as ReceiptIcon,
  ArrowRight,
  Calendar,
  History as HistoryIcon,
} from 'lucide-react';
import { receiptService } from '../services/receiptService';
import { historyService } from '../services/historyService';
import { notificationService } from '../services/notificationService';
import { formatNotificationType } from '../components/notifications/notificationUtils';
import { Bell } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user, activeFamily, setActiveFamily } = useAuth();
  const queryClient = useQueryClient();
  const [newFamilyName, setNewFamilyName] = useState('');
  const [isCreatingFamily, setIsCreatingFamily] = useState(false);

  // Fetch recent grocery receipts for dashboard
  const { data: recentReceiptsData } = useQuery({
    queryKey: ['recent-receipts'],
    queryFn: () => receiptService.getReceipts({ page: 1, page_size: 3 }),
  });

  const { data: recentAlerts } = useQuery({
    queryKey: ['notifications-recent-dashboard', activeFamily?.id],
    queryFn: () => notificationService.listAlerts(activeFamily!.id, { limit: 3 }),
    enabled: !!activeFamily?.id,
  });

  const { data: alertUnreadCount = 0 } = useQuery({
    queryKey: ['notifications-unread', activeFamily?.id],
    queryFn: () => notificationService.getUnreadCount(activeFamily!.id),
    enabled: !!activeFamily?.id,
  });

  // Fetch active family grocery history summary
  const { data: historySummary } = useQuery({
    queryKey: ['groceryHistorySummary', activeFamily?.id],
    queryFn: () => historyService.getSummary(activeFamily!.id, { period: 'all' }),
    enabled: !!activeFamily?.id,
  });

  // Fetch all families for user
  const {
    data: families,
    isLoading: familiesLoading,
    error: familiesError,
    refetch: refetchFamilies,
  } = useQuery({
    queryKey: ['families'],
    queryFn: familyService.listFamilies,
  });

  // Automatically update active family if not set
  React.useEffect(() => {
    if (families && families.length > 0 && !activeFamily) {
      setActiveFamily(families[0]);
    }
  }, [families, activeFamily, setActiveFamily]);

  // Fetch active family dashboard stats
  const {
    data: dashboardData,
    isLoading: dashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard,
  } = useQuery({
    queryKey: ['familyDashboard', activeFamily?.id],
    queryFn: () => familyService.getFamilyDashboard(activeFamily!.id),
    enabled: !!activeFamily?.id,
  });

  // Seed demo data mutation
  const seedMutation = useMutation({
    mutationFn: familyService.seedDemoData,
    onSuccess: (newFamily) => {
      setActiveFamily(newFamily);
      queryClient.invalidateQueries({ queryKey: ['families'] });
      queryClient.invalidateQueries({ queryKey: ['familyDashboard'] });
    },
  });

  // Create family mutation
  const createFamilyMutation = useMutation({
    mutationFn: (name: string) => familyService.createFamily(name),
    onSuccess: (newFamily) => {
      setActiveFamily(newFamily);
      setNewFamilyName('');
      setIsCreatingFamily(false);
      queryClient.invalidateQueries({ queryKey: ['families'] });
    },
  });

  const handleCreateFamily = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFamilyName.trim()) return;
    createFamilyMutation.mutate(newFamilyName.trim());
  };

  if (familiesLoading) {
    return <LoadingState message="Loading your family food safety intelligence..." />;
  }

  if (familiesError) {
    return (
      <ErrorState
        title="Could not load family data"
        message="Please check your backend connection and try again."
        onRetry={() => refetchFamilies()}
      />
    );
  }

  // If user has no family yet, show onboarding / create family state
  if (!families || families.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12">
        <div className="card-subtle p-8 text-center bg-white shadow-sm border-slate-200">
          <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <Heart className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Welcome to Family Food Safety</h2>
          <p className="text-sm text-slate-600 mt-2 mb-6">
            Configure your household's allergies, dietary restrictions, exclusions, and safety rules once.
          </p>

          <form onSubmit={handleCreateFamily} className="space-y-4 max-w-sm mx-auto text-left">
            <div>
              <label htmlFor="familyName" className="block text-xs font-semibold text-slate-700 mb-1">
                Family or Household Name
              </label>
              <input
                id="familyName"
                type="text"
                placeholder="e.g. Khatri Family"
                value={newFamilyName}
                onChange={(e) => setNewFamilyName(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={createFamilyMutation.isPending || !newFamilyName.trim()}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-xs"
            >
              {createFamilyMutation.isPending ? 'Creating...' : 'Create Family Profile'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-xs text-slate-500 mb-3">Want to explore with pre-configured data?</p>
            <button
              type="button"
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>{seedMutation.isPending ? 'Seeding Demo Data...' : 'Load Demo Family (Father, Mother, Child, Grandmother)'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const stats = dashboardData?.stats || {
    total_members: 0,
    total_allergies: 0,
    total_dietary_restrictions: 0,
    total_custom_rules: 0,
    total_ingredient_exclusions: 0,
  };

  const members = dashboardData?.members || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-12 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-700 to-teal-800 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-emerald-100 text-xs font-medium mb-3 backdrop-blur-xs">
            <ShieldAlert className="w-3.5 h-3.5 text-emerald-300" />
            <span>Family Food Safety Intelligence</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {activeFamily?.name || 'My Family'}
          </h1>
          <p className="text-emerald-100 text-xs sm:text-sm mt-1">
            Centralized dietary profiles, allergy alerts, and safety contacts for all household members.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 relative z-10">
          <Link
            to="/receipt/upload"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 rounded-xl text-xs font-bold shadow-md transition-all active:scale-98"
          >
            <ReceiptIcon className="w-4 h-4 text-slate-950" />
            <span>Upload Grocery Receipt</span>
          </Link>

          <Link
            to="/scan"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold backdrop-blur-xs transition-all active:scale-98"
          >
            <ScanLine className="w-4 h-4" />
            <span>Scan Barcode</span>
          </Link>

          <Link
            to="/family/add-member"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-emerald-800 hover:bg-emerald-50 rounded-xl text-xs font-bold shadow-xs transition-all active:scale-98"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Family Member</span>
          </Link>

          <Link
            to="/family"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-semibold backdrop-blur-xs transition-all"
          >
            <Users className="w-4 h-4" />
            <span>Manage Family</span>
          </Link>
        </div>

        {/* Decorative background circle */}
        <div className="absolute -right-12 -bottom-16 w-64 h-64 rounded-full bg-emerald-500/10 pointer-events-none" />
      </div>

      {/* Stats Summary Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="card-subtle p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{stats.total_members}</div>
            <div className="text-xs text-slate-500 font-medium">Family Members</div>
          </div>
        </div>

        <div className="card-subtle p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
          <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{stats.total_allergies}</div>
            <div className="text-xs text-slate-500 font-medium">Configured Allergies</div>
          </div>
        </div>

        <div className="card-subtle p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
            <Utensils className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{stats.total_dietary_restrictions}</div>
            <div className="text-xs text-slate-500 font-medium">Dietary Restrictions</div>
          </div>
        </div>

        <div className="card-subtle p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{stats.total_custom_rules}</div>
            <div className="text-xs text-slate-500 font-medium">Custom Rules</div>
          </div>
        </div>
      </div>

      {/* Family Members Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Family Members</h2>
            <p className="text-xs text-slate-500">
              Overview of all profiles and configured food safety requirements
            </p>
          </div>
          <Link
            to="/family/add-member"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Member</span>
          </Link>
        </div>

        {dashboardLoading ? (
          <LoadingState variant="card" />
        ) : members.length === 0 ? (
          <EmptyState
            icon={<Users className="w-8 h-8 text-slate-400" />}
            title="No family members added yet"
            description="Add your first household member to begin tracking allergies, dietary restrictions, and emergency contacts."
            action={
              <Link
                to="/family/add-member"
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add Family Member</span>
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map((member) => (
              <FamilyMemberCard key={member.id} member={member} />
            ))}
          </div>
        )}
      </div>

      {/* Recent Grocery Receipts Section (Phase 5) */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <ReceiptIcon className="w-5 h-5 text-emerald-600" />
              <span>Recent Grocery Receipts</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Household grocery purchases extracted automatically from paper supermarket receipts.
            </p>
          </div>
          <Link
            to="/receipts"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentReceiptsData?.items && recentReceiptsData.items.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {recentReceiptsData.items.map((r) => (
              <Link
                key={r.id}
                to={`/receipts/${r.id}`}
                className="p-4 rounded-xl border border-slate-200 hover:border-emerald-500 bg-slate-50/50 hover:bg-white transition-all shadow-2xs group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-sm text-slate-800 group-hover:text-emerald-600 truncate">
                    {r.original_filename || 'Grocery Receipt'}
                  </span>
                  <span
                    className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                      r.processing_status === 'processed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : r.processing_status === 'partial'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {r.processing_status}
                  </span>
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-2">
                  <Calendar className="w-3 h-3" />
                  <span>
                    {r.purchase_date
                      ? new Date(r.purchase_date).toLocaleDateString()
                      : new Date(r.created_at).toLocaleDateString()}
                  </span>
                  <span>•</span>
                  <span>{r.items?.length || 0} items</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/40">
            <ReceiptIcon className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-xs text-slate-500 mb-3">No grocery receipts uploaded yet.</p>
            <Link
              to="/receipt/upload"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold shadow-xs hover:bg-emerald-700"
            >
              Upload Receipt
            </Link>
          </div>
        )}
      </div>

      {/* Phase 9: Recent household alerts */}
      {activeFamily && (
        <div className="card p-5 border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Recent alerts</h3>
            </div>
            <span className="text-xs font-semibold text-slate-500">{alertUnreadCount} unread</span>
          </div>
          {recentAlerts && recentAlerts.items.length > 0 ? (
            <ul className="space-y-2 mb-3">
              {recentAlerts.items.map((n) => (
                <li key={n.id} className="text-xs text-slate-600 flex flex-wrap gap-x-1">
                  <span className="font-semibold text-slate-800">{n.product_name || n.title}</span>
                  {n.member_name && <span>— {n.member_name}</span>}
                  <span className="text-slate-400">— {formatNotificationType(n.type)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500 mb-3">No household alerts yet.</p>
          )}
          <Link
            to="/notifications"
            className="text-xs font-bold text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1"
          >
            View all notifications
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* Grocery History Quick Widget (Phase 8) */}
      {historySummary && historySummary.total_receipts > 0 && (
        <div className="card p-5 bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 border border-emerald-900/60 shadow-md">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Longitudinal Grocery Intelligence</span>
            </div>
            <h3 className="text-base font-black tracking-tight text-white flex items-center gap-2">
              <HistoryIcon className="w-4 h-4 text-emerald-400" />
              <span>Household Grocery Safety History</span>
            </h3>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300 pt-1">
              <span><strong>{historySummary.total_receipts}</strong> receipts analyzed</span>
              <span>•</span>
              <span><strong>{historySummary.recurring_products_count}</strong> products purchased repeatedly</span>
              <span>•</span>
              <span><strong>{historySummary.verification_required_count}</strong> purchases required verification</span>
              <span>•</span>
              <span><strong>{historySummary.high_attention_count}</strong> high-attention findings</span>
            </div>
          </div>

          <Link
            to="/history"
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-900/30 inline-flex items-center gap-1.5 shrink-0 self-start md:self-center transition-all"
          >
            <span>View Grocery History</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
};
