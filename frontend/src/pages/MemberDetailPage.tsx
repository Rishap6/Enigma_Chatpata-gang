import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { memberService } from '../services/memberService';
import { AllergyBadge } from '../components/AllergyBadge';
import { RestrictionChip } from '../components/RestrictionChip';
import { PreferenceCard } from '../components/PreferenceCard';
import { ContactCard } from '../components/ContactCard';
import { SectionCard } from '../components/SectionCard';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  ShieldAlert,
  Utensils,
  Ban,
  SlidersHorizontal,
  BookOpen,
  PhoneCall,
  BellRing,
  Code2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

export const MemberDetailPage: React.FC = () => {
  const { memberId } = useParams<{ memberId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showJsonModal, setShowJsonModal] = useState(false);

  // Fetch full member details
  const {
    data: member,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['member', memberId],
    queryFn: () => memberService.getMember(memberId!),
    enabled: !!memberId,
  });

  // Fetch future engine requirements format
  const { data: futureReqs } = useQuery({
    queryKey: ['futureRequirements', memberId],
    queryFn: () => memberService.getFutureEngineRequirements(memberId!),
    enabled: !!memberId && showJsonModal,
  });

  // Delete member mutation
  const deleteMemberMutation = useMutation({
    mutationFn: () => memberService.deleteMember(memberId!),
    onSuccess: () => {
      setShowDeleteModal(false);
      queryClient.invalidateQueries({ queryKey: ['familyDetail'] });
      queryClient.invalidateQueries({ queryKey: ['familyDashboard'] });
      navigate('/family');
    },
  });

  if (isLoading) {
    return <LoadingState message="Loading member requirements..." />;
  }

  if (error || !member) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <ErrorState
          title="Member not found"
          message="Could not load the requested family member. They may have been removed or you do not have permission."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const notifs = member.notification_preferences || {
    in_app_enabled: true,
    push_enabled: true,
    whatsapp_enabled: false,
    emergency_call_enabled: false,
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-12 space-y-6">
      {/* Top Navigation & Actions */}
      <div className="flex items-center justify-between">
        <Link
          to="/family"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Family</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowJsonModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-medium text-slate-700 transition-all"
            title="Inspect Phase 5/6 Machine Readable Payload"
          >
            <Code2 className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Engine Payload</span>
          </button>

          <Link
            to={`/family/member/${member.id}/edit`}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-all"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit Profile</span>
          </Link>

          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-slate-200 hover:border-rose-200 transition-all"
            title="Delete member"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Member Header Banner */}
      <div className="card-subtle p-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center font-bold text-2xl shadow-sm shrink-0">
            {member.avatar ? (
              <img
                src={member.avatar}
                alt={member.name}
                className="w-full h-full object-cover rounded-2xl"
              />
            ) : (
              <span>{member.name.charAt(0).toUpperCase()}</span>
            )}
          </div>

          <div className="flex-1">
            <h1 className="text-2xl font-black tracking-tight">{member.name}</h1>
            <div className="flex items-center gap-2 text-xs text-slate-300 mt-1 capitalize font-medium">
              {member.relationship && <span>{member.relationship}</span>}
              {member.relationship && member.age !== null && <span>•</span>}
              {member.age !== null && member.age !== undefined && <span>Age {member.age}</span>}
            </div>
            {member.notes && (
              <p className="text-xs text-slate-400 mt-2 max-w-xl italic">"{member.notes}"</p>
            )}
          </div>
        </div>
      </div>

      {/* Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. ALLERGIES */}
        <SectionCard
          title="Allergies"
          subtitle="Declared ingredients that cause clinical or severe allergic reactions"
          icon={<ShieldAlert className="w-5 h-5 text-rose-600" />}
          badge={
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
              {member.allergies.length}
            </span>
          }
        >
          {member.allergies.length === 0 ? (
            <div className="text-xs text-slate-400 italic py-2">No allergies configured.</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {member.allergies.map((allergy) => (
                <AllergyBadge
                  key={allergy.id}
                  name={allergy.name}
                  severity={allergy.severity}
                  notes={allergy.notes}
                />
              ))}
            </div>
          )}
        </SectionCard>

        {/* 2. DIETARY RESTRICTIONS */}
        <SectionCard
          title="Dietary Restrictions"
          subtitle="Philosophical, religious, or health diet parameters"
          icon={<Utensils className="w-5 h-5 text-emerald-600" />}
          badge={
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
              {member.dietary_rules.length}
            </span>
          }
        >
          {member.dietary_rules.length === 0 ? (
            <div className="text-xs text-slate-400 italic py-2">No dietary restrictions configured.</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {member.dietary_rules.map((rule) => (
                <RestrictionChip
                  key={rule.id}
                  label={rule.label || rule.rule_value}
                  selected={true}
                />
              ))}
            </div>
          )}
        </SectionCard>

        {/* 3. INGREDIENT EXCLUSIONS */}
        <SectionCard
          title="Ingredient Exclusions"
          subtitle="Specific ingredients this member intentionally avoids"
          icon={<Ban className="w-5 h-5 text-amber-600" />}
          badge={
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
              {member.ingredient_exclusions.length}
            </span>
          }
        >
          {member.ingredient_exclusions.length === 0 ? (
            <div className="text-xs text-slate-400 italic py-2">No ingredient exclusions configured.</div>
          ) : (
            <div className="space-y-2">
              {member.ingredient_exclusions.map((exclusion) => (
                <div
                  key={exclusion.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between"
                >
                  <span className="text-xs font-semibold text-slate-800 capitalize">
                    {exclusion.ingredient_name}
                  </span>
                  {exclusion.reason && (
                    <span className="text-[11px] text-slate-500 italic">{exclusion.reason}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* 4. NUTRITION PREFERENCES */}
        <SectionCard
          title="Nutrition Preferences"
          subtitle="Wellness and health-conscious food guidelines"
          icon={<SlidersHorizontal className="w-5 h-5 text-indigo-600" />}
          badge={
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
              {member.nutrition_preferences.length}
            </span>
          }
        >
          {member.nutrition_preferences.length === 0 ? (
            <div className="text-xs text-slate-400 italic py-2">No nutrition preferences configured.</div>
          ) : (
            <div className="space-y-2">
              {member.nutrition_preferences.map((pref) => (
                <PreferenceCard
                  key={pref.id}
                  title={pref.preference_type.replace('_', ' ')}
                  badge={pref.preference_value}
                />
              ))}
            </div>
          )}
        </SectionCard>

        {/* 5. CUSTOM RULES */}
        <SectionCard
          title="Custom Food Rules"
          subtitle="Raw member-authored rules for future risk evaluation"
          icon={<BookOpen className="w-5 h-5 text-purple-600" />}
          className="md:col-span-2"
          badge={
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
              {member.custom_rules.length}
            </span>
          }
        >
          {member.custom_rules.length === 0 ? (
            <div className="text-xs text-slate-400 italic py-2">No custom rules added yet.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {member.custom_rules.map((rule) => (
                <div
                  key={rule.id}
                  className="p-3.5 rounded-xl bg-purple-50/50 border border-purple-100 text-xs text-purple-950 font-medium"
                >
                  "{rule.rule_text}"
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* 6. EMERGENCY CONTACTS */}
        <SectionCard
          title="Emergency Contacts"
          subtitle="Family contacts associated with high-risk alerts"
          icon={<PhoneCall className="w-5 h-5 text-blue-600" />}
          badge={
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
              {member.emergency_contacts.length}
            </span>
          }
        >
          {member.emergency_contacts.length === 0 ? (
            <div className="text-xs text-slate-400 italic py-2">No emergency contacts configured.</div>
          ) : (
            <div className="space-y-3">
              {member.emergency_contacts.map((contact) => (
                <ContactCard key={contact.id} contact={contact} />
              ))}
            </div>
          )}
        </SectionCard>

        {/* 7. NOTIFICATION PREFERENCES */}
        <SectionCard
          title="Alert Channels"
          subtitle="Future notification routing settings"
          icon={<BellRing className="w-5 h-5 text-teal-600" />}
        >
          <div className="space-y-2.5">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
              <span className="font-medium text-slate-700">In-App Notifications</span>
              {notifs.in_app_enabled ? (
                <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                  <CheckCircle2 className="w-4 h-4" /> Enabled
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-slate-400">
                  <XCircle className="w-4 h-4" /> Disabled
                </span>
              )}
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
              <span className="font-medium text-slate-700">Push Notifications</span>
              {notifs.push_enabled ? (
                <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                  <CheckCircle2 className="w-4 h-4" /> Enabled
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-slate-400">
                  <XCircle className="w-4 h-4" /> Disabled
                </span>
              )}
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
              <span className="font-medium text-slate-700">WhatsApp Alerts</span>
              {notifs.whatsapp_enabled ? (
                <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                  <CheckCircle2 className="w-4 h-4" /> Enabled
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-slate-400">
                  <XCircle className="w-4 h-4" /> Disabled
                </span>
              )}
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
              <span className="font-medium text-slate-700">Emergency Call Alerts</span>
              {notifs.emergency_call_enabled ? (
                <span className="inline-flex items-center gap-1 text-rose-600 font-semibold">
                  <CheckCircle2 className="w-4 h-4" /> Enabled
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-slate-400">
                  <XCircle className="w-4 h-4" /> Disabled
                </span>
              )}
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Delete Member Confirmation Modal */}
      <ConfirmDialog
        isOpen={showDeleteModal}
        title={`Remove ${member.name}?`}
        message="This will remove the family member's configured:"
        details={[
          'Allergies and severity history',
          'Dietary restrictions and rules',
          'Ingredient exclusions',
          'Emergency safety contacts',
        ]}
        confirmLabel="Remove Member"
        isDestructive={true}
        isLoading={deleteMemberMutation.isPending}
        onConfirm={() => deleteMemberMutation.mutate()}
        onCancel={() => setShowDeleteModal(false)}
      />

      {/* Future Engine JSON Payload Modal */}
      {showJsonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl border border-slate-200 p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Future Phase 5/6 Consumable Format</h3>
                <p className="text-xs text-slate-500">
                  Structured representation ready for the risk and ingredient analysis engine.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowJsonModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-semibold px-2 py-1 rounded-lg"
              >
                Close
              </button>
            </div>

            <pre className="p-4 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl overflow-x-auto max-h-[380px]">
              {JSON.stringify(futureReqs || member, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
