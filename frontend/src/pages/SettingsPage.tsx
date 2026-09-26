import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/api';
import { familyService } from '../services/familyService';
import { SectionCard } from '../components/SectionCard';
import {
  User,
  ShieldCheck,
  Sparkles,
  Server,
  LogOut,
  RefreshCw,
  CheckCircle2,
  Lock,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, activeFamily, setActiveFamily, switchDemoUser, logout } = useAuth();
  const queryClient = useQueryClient();
  const [switching, setSwitching] = useState(false);

  // Health check query
  const {
    data: health,
    isLoading: healthLoading,
    refetch: refetchHealth,
  } = useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const resp = await apiClient.get('/health', { baseURL: `http://${window.location.hostname}:8000` });
      return resp.data;
    },
    retry: 1,
  });

  // Seed demo data mutation
  const seedMutation = useMutation({
    mutationFn: familyService.seedDemoData,
    onSuccess: (newFamily) => {
      setActiveFamily(newFamily);
      queryClient.invalidateQueries({ queryKey: ['families'] });
      queryClient.invalidateQueries({ queryKey: ['familyDashboard'] });
      alert(`Demo family "${newFamily.name}" successfully seeded!`);
    },
  });

  const handleSwitchUser = async (userType: 'demo' | 'other_user') => {
    setSwitching(true);
    try {
      await switchDemoUser(userType);
      queryClient.clear();
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 md:pb-12 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Application Settings</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage your account, test multi-user isolation, and check backend health.
        </p>
      </div>

      {/* User Account Info */}
      <SectionCard
        title="User Account"
        subtitle="Current authenticated session"
        icon={<User className="w-5 h-5 text-emerald-600" />}
        action={
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        }
      >
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Email:</span>
            <span className="font-semibold text-slate-900">{user?.email || 'demo@familyfood.local'}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">User ID:</span>
            <span className="font-mono text-slate-600 text-[11px]">{user?.id || '—'}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Active Household:</span>
            <span className="font-semibold text-emerald-700">{activeFamily?.name || 'None selected'}</span>
          </div>
        </div>
      </SectionCard>

      {/* Live Data Isolation & Multi-User Switcher */}
      <SectionCard
        title="Security & Cross-User Isolation Demonstration"
        subtitle="Verify that User A cannot see or manipulate User B's family data"
        icon={<Lock className="w-5 h-5 text-indigo-600" />}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            The platform strictly enforces database & API-level authorization. Switch between test accounts to confirm that families, members, allergies, and emergency contacts are strictly isolated:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleSwitchUser('demo')}
              disabled={switching}
              className={`p-4 rounded-xl border text-left transition-all ${
                user?.email?.includes('demo')
                  ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-900">User Account A (Alice)</span>
                {user?.email?.includes('demo') && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Active
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">demo@familyfood.local</p>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchUser('other_user')}
              disabled={switching}
              className={`p-4 rounded-xl border text-left transition-all ${
                user?.email?.includes('other')
                  ? 'border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-900">User Account B (Bob)</span>
                {user?.email?.includes('other') && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                    Active
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">other@familyfood.local</p>
            </button>
          </div>
        </div>
      </SectionCard>

      {/* Development Demo Seed Data */}
      <SectionCard
        title="Development Seed Data"
        subtitle="Quickly populate a complete family test dataset"
        icon={<Sparkles className="w-5 h-5 text-amber-500" />}
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-600">
            Seeds a realistic fictional family ("Demo Family") with:
          </p>
          <ul className="text-xs text-slate-500 space-y-1 list-disc list-inside">
            <li><strong>Father</strong> (Peanut Allergy Severe, Vegetarian, Gelatin exclusion, Reduce sodium)</li>
            <li><strong>Mother</strong> (Low sodium, Reduce sugar, Vegetarian)</li>
            <li><strong>Child</strong> (Milk / Lactose allergy Moderate, Dairy-free)</li>
            <li><strong>Grandmother</strong> (Gluten-free, Wheat allergy Severe, Animal-derived exclusion rule)</li>
          </ul>

          <button
            type="button"
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>{seedMutation.isPending ? 'Seeding Demo Data...' : 'Seed Demo Family Data'}</span>
          </button>
        </div>
      </SectionCard>

      {/* Backend API Health Status */}
      <SectionCard
        title="API Health & Connectivity"
        subtitle="Verification of backend service status"
        icon={<Server className="w-5 h-5 text-teal-600" />}
        action={
          <button
            type="button"
            onClick={() => refetchHealth()}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            title="Refresh status"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        }
      >
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-3 h-3 rounded-full ${
                health?.status === 'ok' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <div>
              <div className="text-xs font-bold text-slate-800">
                {healthLoading
                  ? 'Checking health...'
                  : health?.status === 'ok'
                  ? 'FastAPI Backend Online'
                  : 'Backend Offline / Connecting...'}
              </div>
              <div className="text-[11px] text-slate-500">
                {health?.service || 'service: family-food-intelligence'} • v{health?.version || '1.0.0'}
              </div>
            </div>
          </div>

          {health?.status === 'ok' && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-semibold">
              <CheckCircle2 className="w-4 h-4" /> Status OK
            </span>
          )}
        </div>
      </SectionCard>
    </div>
  );
};
