import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { memberService } from '../services/memberService';
import { allergyService } from '../services/allergyService';
import { dietaryRuleService } from '../services/dietaryRuleService';
import { ingredientExclusionService } from '../services/ingredientExclusionService';
import { preferenceService } from '../services/preferenceService';
import { contactService } from '../services/contactService';
import { notificationService } from '../services/notificationService';
import { AllergySeverity } from '../types';
import { AllergyBadge } from '../components/AllergyBadge';
import { SeveritySelector } from '../components/SeveritySelector';
import { SectionCard } from '../components/SectionCard';
import { ToggleRow } from '../components/ToggleRow';
import { FormField } from '../components/FormField';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import {
  ArrowLeft,
  User,
  ShieldAlert,
  Utensils,
  Ban,
  SlidersHorizontal,
  PhoneCall,
  BellRing,
  Plus,
  Trash2,
  Check,
} from 'lucide-react';

const COMMON_ALLERGIES = [
  'Peanut',
  'Tree Nut',
  'Milk',
  'Egg',
  'Wheat',
  'Soy',
  'Fish',
  'Shellfish',
  'Sesame',
];

export const EditMemberPage: React.FC = () => {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Basic Info Form State
  const [name, setName] = useState('');
  const [age, setAge] = useState<string>('');
  const [relationship, setRelationship] = useState('');
  const [notes, setNotes] = useState('');

  // New item inputs
  const [newAllergyName, setNewAllergyName] = useState('');
  const [newAllergySeverity, setNewAllergySeverity] = useState<AllergySeverity>('moderate');
  const [newAllergyNotes, setNewAllergyNotes] = useState('');

  const [newDietaryValue, setNewDietaryValue] = useState('');
  const [newDietaryLabel, setNewDietaryLabel] = useState('');

  const [newExclusionName, setNewExclusionName] = useState('');
  const [newExclusionReason, setNewExclusionReason] = useState('');

  const [newPrefType, setNewPrefType] = useState('reduce_sugar');
  const [newPrefVal, setNewPrefVal] = useState('true');

  const [newCustomRuleText, setNewCustomRuleText] = useState('');

  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactWhatsapp, setContactWhatsapp] = useState('');
  const [contactRelationship, setContactRelationship] = useState('Mother');
  const [contactPrimary, setContactPrimary] = useState(false);

  // Fetch Member
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

  useEffect(() => {
    if (member) {
      setName(member.name || '');
      setAge(member.age !== null && member.age !== undefined ? String(member.age) : '');
      setRelationship(member.relationship || 'other');
      setNotes(member.notes || '');
    }
  }, [member]);

  const invalidateMember = () => {
    queryClient.invalidateQueries({ queryKey: ['member', memberId] });
    queryClient.invalidateQueries({ queryKey: ['familyDetail'] });
    queryClient.invalidateQueries({ queryKey: ['familyDashboard'] });
  };

  // Mutations
  const updateBasicMutation = useMutation({
    mutationFn: () =>
      memberService.updateMember(memberId!, {
        name: name.trim(),
        age: age !== '' ? parseInt(age, 10) : null,
        relationship: relationship.trim() || undefined,
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => invalidateMember(),
  });

  // Allergy mutations
  const addAllergyMutation = useMutation({
    mutationFn: (data: { name: string; severity: AllergySeverity; notes?: string }) =>
      allergyService.addAllergy(memberId!, data),
    onSuccess: () => {
      setNewAllergyName('');
      setNewAllergyNotes('');
      invalidateMember();
    },
  });

  const updateAllergySeverityMutation = useMutation({
    mutationFn: ({ id, severity }: { id: string; severity: AllergySeverity }) =>
      allergyService.updateAllergy(id, { severity }),
    onSuccess: () => invalidateMember(),
  });

  const deleteAllergyMutation = useMutation({
    mutationFn: (id: string) => allergyService.deleteAllergy(id),
    onSuccess: () => invalidateMember(),
  });

  // Dietary mutations
  const addDietaryMutation = useMutation({
    mutationFn: (data: { rule_type: string; rule_value: string; label?: string }) =>
      dietaryRuleService.addDietaryRule(memberId!, data),
    onSuccess: () => {
      setNewDietaryValue('');
      setNewDietaryLabel('');
      invalidateMember();
    },
  });

  const deleteDietaryMutation = useMutation({
    mutationFn: (id: string) => dietaryRuleService.deleteDietaryRule(id),
    onSuccess: () => invalidateMember(),
  });

  // Ingredient Exclusion mutations
  const addExclusionMutation = useMutation({
    mutationFn: (data: { ingredient_name: string; reason?: string }) =>
      ingredientExclusionService.addExclusion(memberId!, data),
    onSuccess: () => {
      setNewExclusionName('');
      setNewExclusionReason('');
      invalidateMember();
    },
  });

  const deleteExclusionMutation = useMutation({
    mutationFn: (id: string) => ingredientExclusionService.deleteExclusion(id),
    onSuccess: () => invalidateMember(),
  });

  // Preference & Custom Rule mutations
  const addPrefMutation = useMutation({
    mutationFn: (data: { preference_type: string; preference_value: string }) =>
      preferenceService.addNutritionPreference(memberId!, data),
    onSuccess: () => invalidateMember(),
  });

  const deletePrefMutation = useMutation({
    mutationFn: (id: string) => preferenceService.deleteNutritionPreference(id),
    onSuccess: () => invalidateMember(),
  });

  const addRuleMutation = useMutation({
    mutationFn: (data: { rule_text: string }) => preferenceService.addCustomRule(memberId!, data),
    onSuccess: () => {
      setNewCustomRuleText('');
      invalidateMember();
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (id: string) => preferenceService.deleteCustomRule(id),
    onSuccess: () => invalidateMember(),
  });

  // Emergency contact mutations
  const addContactMutation = useMutation({
    mutationFn: () =>
      contactService.addContact(memberId!, {
        name: contactName.trim(),
        phone: contactPhone.trim() || undefined,
        whatsapp_number: contactWhatsapp.trim() || undefined,
        relationship: contactRelationship.trim() || undefined,
        is_primary: contactPrimary,
      }),
    onSuccess: () => {
      setContactName('');
      setContactPhone('');
      setContactWhatsapp('');
      invalidateMember();
    },
  });

  const deleteContactMutation = useMutation({
    mutationFn: (id: string) => contactService.deleteContact(id),
    onSuccess: () => invalidateMember(),
  });

  // Notification settings mutation
  const updateNotifMutation = useMutation({
    mutationFn: (data: any) => notificationService.updatePreferences(memberId!, data),
    onSuccess: () => invalidateMember(),
  });

  if (isLoading) return <LoadingState message="Loading profile editor..." />;
  if (error || !member) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <ErrorState title="Member not found" onRetry={() => refetch()} />
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 md:pb-12 space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Link
          to={`/family/member/${member.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Member Profile</span>
        </Link>
        <span className="text-xs text-slate-400">All edits save directly</span>
      </div>

      <h1 className="text-2xl font-bold text-slate-900">Edit {member.name}'s Profile</h1>

      {/* 1. Basic Info Section */}
      <SectionCard
        title="Basic Information"
        icon={<User className="w-5 h-5 text-emerald-600" />}
        action={
          <button
            type="button"
            onClick={() => updateBasicMutation.mutate()}
            disabled={updateBasicMutation.isPending || !name.trim()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{updateBasicMutation.isPending ? 'Saving...' : 'Save Info'}</span>
          </button>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FormField label="Name" required>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
            />
          </FormField>

          <FormField label="Age">
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              min="0"
              max="150"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
            />
          </FormField>

          <FormField label="Relationship">
            <input
              type="text"
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
            />
          </FormField>
        </div>

        <div className="mt-3">
          <FormField label="Notes">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
            />
          </FormField>
        </div>
      </SectionCard>

      {/* 2. Allergies Section */}
      <SectionCard
        title="Manage Allergies"
        subtitle="Update severity or add/remove allergies"
        icon={<ShieldAlert className="w-5 h-5 text-rose-600" />}
      >
        <div className="space-y-4">
          {/* Existing Allergies */}
          {member.allergies.length > 0 ? (
            <div className="space-y-2.5">
              {member.allergies.map((allergy) => (
                <div
                  key={allergy.id}
                  className="p-3 rounded-xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="flex items-center gap-2">
                    <AllergyBadge name={allergy.name} severity={allergy.severity} />
                    {allergy.notes && <span className="text-[11px] text-slate-500 italic">({allergy.notes})</span>}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-48">
                      <SeveritySelector
                        value={allergy.severity}
                        onChange={(sev) =>
                          updateAllergySeverityMutation.mutate({ id: allergy.id, severity: sev })
                        }
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteAllergyMutation.mutate(allergy.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                      title="Delete allergy"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No allergies configured.</p>
          )}

          {/* Add New Allergy Inline */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
            <span className="text-xs font-bold text-slate-800">+ Add Allergy</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Allergy name (e.g. Peanut, Milk)"
                value={newAllergyName}
                onChange={(e) => setNewAllergyName(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
              />
              <input
                type="text"
                placeholder="Notes / reaction"
                value={newAllergyNotes}
                onChange={(e) => setNewAllergyNotes(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1">
                <SeveritySelector value={newAllergySeverity} onChange={setNewAllergySeverity} />
              </div>
              <button
                type="button"
                onClick={() =>
                  addAllergyMutation.mutate({
                    name: newAllergyName.trim(),
                    severity: newAllergySeverity,
                    notes: newAllergyNotes.trim() || undefined,
                  })
                }
                disabled={!newAllergyName.trim()}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shrink-0"
              >
                Add Allergy
              </button>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* 3. Dietary Restrictions Section */}
      <SectionCard
        title="Dietary Restrictions"
        icon={<Utensils className="w-5 h-5 text-emerald-600" />}
      >
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {member.dietary_rules.map((rule) => (
              <span
                key={rule.id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200"
              >
                <span>{rule.label || rule.rule_value}</span>
                <button
                  type="button"
                  onClick={() => deleteDietaryMutation.mutate(rule.id)}
                  className="hover:text-rose-600 p-0.5 rounded-full"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <input
              type="text"
              placeholder="e.g. Vegetarian, Halal, Gluten-free"
              value={newDietaryLabel}
              onChange={(e) => {
                setNewDietaryLabel(e.target.value);
                setNewDietaryValue(e.target.value.toLowerCase().replace(/\s+/g, '_'));
              }}
              className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
            />
            <button
              type="button"
              onClick={() =>
                addDietaryMutation.mutate({
                  rule_type: 'dietary',
                  rule_value: newDietaryValue.trim(),
                  label: newDietaryLabel.trim(),
                })
              }
              disabled={!newDietaryLabel.trim()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shrink-0"
            >
              Add Restriction
            </button>
          </div>
        </div>
      </SectionCard>

      {/* 4. Ingredient Exclusions Section */}
      <SectionCard
        title="Ingredient Exclusions"
        icon={<Ban className="w-5 h-5 text-amber-600" />}
      >
        <div className="space-y-3">
          <div className="space-y-2">
            {member.ingredient_exclusions.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-slate-800 capitalize">{item.ingredient_name}</span>
                  {item.reason && <span className="text-slate-500 ml-2 italic">({item.reason})</span>}
                </div>
                <button
                  type="button"
                  onClick={() => deleteExclusionMutation.mutate(item.id)}
                  className="text-slate-400 hover:text-rose-600 p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100">
            <input
              type="text"
              placeholder="Ingredient name (e.g. Gelatin)"
              value={newExclusionName}
              onChange={(e) => setNewExclusionName(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
            />
            <input
              type="text"
              placeholder="Reason (e.g. Personal preference)"
              value={newExclusionReason}
              onChange={(e) => setNewExclusionReason(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
            />
          </div>
          <button
            type="button"
            onClick={() =>
              addExclusionMutation.mutate({
                ingredient_name: newExclusionName.trim(),
                reason: newExclusionReason.trim() || undefined,
              })
            }
            disabled={!newExclusionName.trim()}
            className="w-full py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white rounded-xl text-xs font-semibold"
          >
            Add Exclusion
          </button>
        </div>
      </SectionCard>

      {/* 5. Custom Food Rules */}
      <SectionCard
        title="Custom Food Rules"
        icon={<SlidersHorizontal className="w-5 h-5 text-purple-600" />}
      >
        <div className="space-y-3">
          {member.custom_rules.map((rule) => (
            <div
              key={rule.id}
              className="p-3 rounded-xl bg-purple-50/50 border border-purple-100 flex items-center justify-between text-xs"
            >
              <span className="font-medium text-purple-950">"{rule.rule_text}"</span>
              <button
                type="button"
                onClick={() => deleteRuleMutation.mutate(rule.id)}
                className="text-purple-400 hover:text-rose-600 p-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <input
              type="text"
              placeholder="e.g. Avoid products containing onion or garlic"
              value={newCustomRuleText}
              onChange={(e) => setNewCustomRuleText(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
            />
            <button
              type="button"
              onClick={() => addRuleMutation.mutate({ rule_text: newCustomRuleText.trim() })}
              disabled={!newCustomRuleText.trim()}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shrink-0"
            >
              Add Rule
            </button>
          </div>
        </div>
      </SectionCard>

      {/* 6. Emergency Contacts */}
      <SectionCard
        title="Emergency Contacts"
        icon={<PhoneCall className="w-5 h-5 text-blue-600" />}
      >
        <div className="space-y-3">
          {member.emergency_contacts.map((contact) => (
            <div
              key={contact.id}
              className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between shadow-2xs"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">{contact.name}</span>
                  {contact.is_primary && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      Primary
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                  {contact.phone || contact.whatsapp_number} ({contact.relationship})
                </div>
              </div>
              <button
                type="button"
                onClick={() => deleteContactMutation.mutate(contact.id)}
                className="text-slate-400 hover:text-rose-600 p-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {/* Add contact */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
            <span className="text-xs font-bold text-slate-800">+ Add Emergency Contact</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Name"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
              />
              <input
                type="text"
                placeholder="Relationship (e.g. Mother)"
                value={contactRelationship}
                onChange={(e) => setContactRelationship(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
              />
              <input
                type="tel"
                placeholder="Phone (+91XXXXXXXXXX)"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-mono"
              />
              <input
                type="tel"
                placeholder="WhatsApp (+91XXXXXXXXXX)"
                value={contactWhatsapp}
                onChange={(e) => setContactWhatsapp(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-mono"
              />
            </div>
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-1.5 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={contactPrimary}
                  onChange={(e) => setContactPrimary(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded-sm"
                />
                <span>Set as primary contact</span>
              </label>
              <button
                type="button"
                onClick={() => addContactMutation.mutate()}
                disabled={!contactName.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl text-xs font-semibold"
              >
                Add Contact
              </button>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* 7. Notification Settings */}
      <SectionCard
        title="Notification Settings"
        icon={<BellRing className="w-5 h-5 text-teal-600" />}
      >
        <div className="space-y-2">
          <ToggleRow
            label="In-App Notifications"
            checked={notifs.in_app_enabled}
            onChange={(val) => updateNotifMutation.mutate({ in_app_enabled: val })}
          />
          <ToggleRow
            label="Push Notifications"
            checked={notifs.push_enabled}
            onChange={(val) => updateNotifMutation.mutate({ push_enabled: val })}
          />
          <ToggleRow
            label="WhatsApp Alerts"
            checked={notifs.whatsapp_enabled}
            onChange={(val) => updateNotifMutation.mutate({ whatsapp_enabled: val })}
          />
          <ToggleRow
            label="Emergency Call Alerts"
            checked={notifs.emergency_call_enabled}
            onChange={(val) => updateNotifMutation.mutate({ emergency_call_enabled: val })}
          />
        </div>
      </SectionCard>
    </div>
  );
};
