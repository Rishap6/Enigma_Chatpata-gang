import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { familyService } from '../services/familyService';
import { FamilyMemberCard } from '../components/FamilyMemberCard';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import {
  Users,
  UserPlus,
  Edit2,
  Trash2,
  Check,
  X,
  AlertTriangle,
  HeartHandshake,
} from 'lucide-react';

export const FamilyPage: React.FC = () => {
  const { activeFamily, setActiveFamily } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [showDeleteFamilyModal, setShowDeleteFamilyModal] = useState(false);

  // Fetch full family details including members
  const {
    data: familyData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['familyDetail', activeFamily?.id],
    queryFn: () => familyService.getFamily(activeFamily!.id),
    enabled: !!activeFamily?.id,
  });

  // Update family name mutation
  const updateFamilyMutation = useMutation({
    mutationFn: (name: string) => familyService.updateFamily(activeFamily!.id, name),
    onSuccess: (updated) => {
      setActiveFamily(updated);
      setIsEditingName(false);
      queryClient.invalidateQueries({ queryKey: ['familyDetail', activeFamily?.id] });
      queryClient.invalidateQueries({ queryKey: ['families'] });
      queryClient.invalidateQueries({ queryKey: ['familyDashboard', activeFamily?.id] });
    },
  });

  // Delete family mutation
  const deleteFamilyMutation = useMutation({
    mutationFn: () => familyService.deleteFamily(activeFamily!.id),
    onSuccess: () => {
      setShowDeleteFamilyModal(false);
      setActiveFamily(null);
      queryClient.invalidateQueries({ queryKey: ['families'] });
      navigate('/dashboard');
    },
  });

  const handleStartEdit = () => {
    setEditedName(familyData?.name || activeFamily?.name || '');
    setIsEditingName(true);
  };

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editedName.trim()) return;
    updateFamilyMutation.mutate(editedName.trim());
  };

  if (!activeFamily) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <EmptyState
          title="No active family selected"
          description="Create or select a family from your dashboard to view and manage members."
          action={
            <Link
              to="/dashboard"
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold"
            >
              Go to Dashboard
            </Link>
          }
        />
      </div>
    );
  }

  if (isLoading) {
    return <LoadingState message="Loading family details..." />;
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <ErrorState
          title="Unable to load family"
          message="Could not retrieve family members. Please verify connection."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const members = familyData?.members || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-12 space-y-6">
      {/* Family Header Card */}
      <div className="card-subtle p-6 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center shadow-xs shrink-0">
            <HeartHandshake className="w-7 h-7" />
          </div>

          <div>
            {isEditingName ? (
              <form onSubmit={handleSaveName} className="flex items-center gap-2">
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="px-3 py-1.5 text-lg font-bold border border-emerald-400 rounded-lg focus:outline-hidden ring-2 ring-emerald-500/20"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={updateFamilyMutation.isPending}
                  className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingName(false)}
                  className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                  {familyData?.name}
                </h1>
                <button
                  type="button"
                  onClick={handleStartEdit}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                  title="Rename family"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            )}
            <p className="text-xs text-slate-500 mt-0.5">
              Household ID: <span className="font-mono text-[11px] text-slate-400">{activeFamily.id}</span>
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <Link
            to="/family/add-member"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Member</span>
          </Link>

          <button
            type="button"
            onClick={() => setShowDeleteFamilyModal(true)}
            className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-slate-200 hover:border-rose-200 transition-all"
            title="Delete Family"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Members Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">Household Members</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
              {members.length}
            </span>
          </div>
        </div>

        {members.length === 0 ? (
          <EmptyState
            icon={<Users className="w-8 h-8 text-slate-400" />}
            title="No family members in this household"
            description="Start building your food safety registry by adding your family members."
            action={
              <Link
                to="/family/add-member"
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add First Member</span>
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

      {/* Delete Family Confirm Modal */}
      <ConfirmDialog
        isOpen={showDeleteFamilyModal}
        title={`Delete "${activeFamily.name}"?`}
        message="This action is permanent and will completely delete the family and all configured members, allergies, dietary rules, ingredient exclusions, and emergency contacts."
        details={[
          'All member profiles will be permanently erased',
          'All allergy declarations will be deleted',
          'All custom food rules will be removed',
        ]}
        confirmLabel="Delete Family"
        isDestructive={true}
        isLoading={deleteFamilyMutation.isPending}
        onConfirm={() => deleteFamilyMutation.mutate()}
        onCancel={() => setShowDeleteFamilyModal(false)}
      />
    </div>
  );
};
