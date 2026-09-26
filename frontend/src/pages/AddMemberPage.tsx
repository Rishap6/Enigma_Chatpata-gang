import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { memberService } from '../services/memberService';
import {
  MemberCreateFull,
  AllergyCreate,
  AllergySeverity,
  DietaryRuleCreate,
  IngredientExclusionCreate,
  NutritionPreferenceCreate,
  CustomRuleCreate,
  EmergencyContactCreate,
} from '../types';
import { AllergyBadge } from '../components/AllergyBadge';
import { RestrictionChip } from '../components/RestrictionChip';
import { SeveritySelector } from '../components/SeveritySelector';
import { ToggleRow } from '../components/ToggleRow';
import { FormField } from '../components/FormField';
import {
  User,
  ShieldAlert,
  Utensils,
  Ban,
  SlidersHorizontal,
  PhoneCall,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  AlertCircle,
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

const COMMON_DIETARY = [
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'gluten_free', label: 'Gluten-Free' },
  { value: 'dairy_free', label: 'Dairy-Free' },
  { value: 'egg_free', label: 'Egg-Free' },
  { value: 'nut_free', label: 'Nut-Free' },
];

const COMMON_PREFERENCES = [
  { type: 'reduce_sugar', label: 'Reduce Sugar' },
  { type: 'reduce_sodium', label: 'Reduce Sodium' },
  { type: 'increase_protein', label: 'Increase Protein' },
  { type: 'weight_management', label: 'Weight Management' },
];

export const AddMemberPage: React.FC = () => {
  const { activeFamily } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Wizard Step (1 to 7)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const totalSteps = 7;

  // Step 1: Basic Info
  const [name, setName] = useState('');
  const [age, setAge] = useState<string>('');
  const [relationship, setRelationship] = useState('other');
  const [avatar, setAvatar] = useState('');
  const [notes, setNotes] = useState('');
  const [basicErrors, setBasicErrors] = useState<{ [key: string]: string }>({});

  // Step 2: Allergies
  const [allergies, setAllergies] = useState<AllergyCreate[]>([]);
  const [customAllergyName, setCustomAllergyName] = useState('');
  const [customAllergySeverity, setCustomAllergySeverity] = useState<AllergySeverity>('severe');
  const [customAllergyNotes, setCustomAllergyNotes] = useState('');

  // Step 3: Dietary Restrictions
  const [dietaryRules, setDietaryRules] = useState<DietaryRuleCreate[]>([]);
  const [customDietary, setCustomDietary] = useState('');

  // Step 4: Ingredient Exclusions
  const [exclusions, setExclusions] = useState<IngredientExclusionCreate[]>([]);
  const [newExclusionName, setNewExclusionName] = useState('');
  const [newExclusionReason, setNewExclusionReason] = useState('');

  // Step 5: Preferences & Custom Rules
  const [preferences, setPreferences] = useState<NutritionPreferenceCreate[]>([]);
  const [customRules, setCustomRules] = useState<CustomRuleCreate[]>([]);
  const [newCustomRuleText, setNewCustomRuleText] = useState('');

  // Step 6: Emergency Contact & Notifications
  const [hasEmergencyContact, setHasEmergencyContact] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactWhatsapp, setContactWhatsapp] = useState('');
  const [contactRelationship, setContactRelationship] = useState('Mother');
  const [contactIsPrimary, setContactIsPrimary] = useState(true);
  const [contactError, setContactError] = useState('');

  // Notifications
  const [inAppEnabled, setInAppEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [emergencyCallEnabled, setEmergencyCallEnabled] = useState(false);

  // Mutation
  const createMemberMutation = useMutation({
    mutationFn: (payload: MemberCreateFull) =>
      memberService.createMember(activeFamily!.id, payload),
    onSuccess: (newMember) => {
      queryClient.invalidateQueries({ queryKey: ['familyDetail', activeFamily?.id] });
      queryClient.invalidateQueries({ queryKey: ['familyDashboard', activeFamily?.id] });
      queryClient.invalidateQueries({ queryKey: ['families'] });
      navigate(`/family/member/${newMember.id}`);
    },
  });

  // Step 1 Validation
  const validateStep1 = () => {
    const errs: { [key: string]: string } = {};
    if (!name.trim()) {
      errs.name = 'Member name is required';
    }
    if (age !== '') {
      const parsedAge = parseInt(age, 10);
      if (isNaN(parsedAge) || parsedAge < 0 || parsedAge > 150) {
        errs.age = 'Age must be between 0 and 150';
      }
    }
    setBasicErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!validateStep1()) return;
    }
    if (currentStep === 6 && hasEmergencyContact) {
      if (!contactName.trim()) {
        setContactError('Contact name is required if contact is enabled');
        return;
      }
    }
    setContactError('');
    if (currentStep < totalSteps) {
      setCurrentStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Allergy Helpers
  const handleToggleCommonAllergy = (allergyName: string) => {
    const existingIndex = allergies.findIndex(
      (a) => a.name.toLowerCase() === allergyName.toLowerCase()
    );
    if (existingIndex >= 0) {
      setAllergies(allergies.filter((_, idx) => idx !== existingIndex));
    } else {
      setAllergies([
        ...allergies,
        { name: allergyName, severity: 'severe', notes: '' },
      ]);
    }
  };

  const handleAddCustomAllergy = () => {
    if (!customAllergyName.trim()) return;
    setAllergies([
      ...allergies,
      {
        name: customAllergyName.trim(),
        severity: customAllergySeverity,
        notes: customAllergyNotes.trim() || undefined,
      },
    ]);
    setCustomAllergyName('');
    setCustomAllergyNotes('');
  };

  const handleUpdateAllergySeverity = (idx: number, severity: AllergySeverity) => {
    const updated = [...allergies];
    updated[idx].severity = severity;
    setAllergies(updated);
  };

  // Dietary Helpers
  const handleToggleDietary = (ruleValue: string, label: string) => {
    const exists = dietaryRules.some((d) => d.rule_value === ruleValue);
    if (exists) {
      setDietaryRules(dietaryRules.filter((d) => d.rule_value !== ruleValue));
    } else {
      setDietaryRules([
        ...dietaryRules,
        { rule_type: 'dietary', rule_value: ruleValue, label },
      ]);
    }
  };

  const handleAddCustomDietary = () => {
    if (!customDietary.trim()) return;
    setDietaryRules([
      ...dietaryRules,
      {
        rule_type: 'dietary',
        rule_value: customDietary.trim().toLowerCase().replace(/\s+/g, '_'),
        label: customDietary.trim(),
      },
    ]);
    setCustomDietary('');
  };

  // Ingredient Exclusions Helpers
  const handleAddExclusion = () => {
    if (!newExclusionName.trim()) return;
    setExclusions([
      ...exclusions,
      {
        ingredient_name: newExclusionName.trim(),
        reason: newExclusionReason.trim() || undefined,
      },
    ]);
    setNewExclusionName('');
    setNewExclusionReason('');
  };

  // Preferences Helpers
  const handleTogglePreference = (prefType: string) => {
    const exists = preferences.some((p) => p.preference_type === prefType);
    if (exists) {
      setPreferences(preferences.filter((p) => p.preference_type !== prefType));
    } else {
      setPreferences([...preferences, { preference_type: prefType, preference_value: 'true' }]);
    }
  };

  // Custom Rules Helpers
  const handleAddCustomRule = () => {
    if (!newCustomRuleText.trim()) return;
    setCustomRules([...customRules, { rule_text: newCustomRuleText.trim() }]);
    setNewCustomRuleText('');
  };

  // Final Submission
  const handleSubmit = () => {
    if (!validateStep1()) {
      setCurrentStep(1);
      return;
    }

    const contacts: EmergencyContactCreate[] = [];
    if (hasEmergencyContact && contactName.trim()) {
      contacts.push({
        name: contactName.trim(),
        phone: contactPhone.trim() || undefined,
        whatsapp_number: contactWhatsapp.trim() || undefined,
        relationship: contactRelationship.trim() || undefined,
        is_primary: contactIsPrimary,
      });
    }

    const payload: MemberCreateFull = {
      name: name.trim(),
      age: age !== '' ? parseInt(age, 10) : undefined,
      relationship: relationship.trim() || undefined,
      avatar: avatar.trim() || undefined,
      notes: notes.trim() || undefined,
      allergies,
      dietary_rules: dietaryRules,
      ingredient_exclusions: exclusions,
      nutrition_preferences: preferences,
      custom_rules: customRules,
      emergency_contacts: contacts,
      notification_preferences: {
        in_app_enabled: inAppEnabled,
        push_enabled: pushEnabled,
        whatsapp_enabled: whatsappEnabled,
        emergency_call_enabled: emergencyCallEnabled,
      },
    };

    createMemberMutation.mutate(payload);
  };

  const stepTitles = [
    'Basic Information',
    'Allergies',
    'Dietary Restrictions',
    'Ingredient Exclusions',
    'Preferences & Rules',
    'Emergency & Alerts',
    'Review & Save',
  ];

  if (!activeFamily) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center">
        <p className="text-sm text-slate-600 mb-4">Please create or select a family first.</p>
        <Link to="/dashboard" className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold">
          Go to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-28 md:pb-12 space-y-6">
      {/* Wizard Progress Header */}
      <div>
        <div className="flex items-center justify-between text-xs text-slate-500 mb-2 font-medium">
          <span>Step {currentStep} of {totalSteps}: <strong className="text-slate-900">{stepTitles[currentStep - 1]}</strong></span>
          <span>{Math.round((currentStep / totalSteps) * 100)}% Completed</span>
        </div>
        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-600 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Main Wizard Form Container */}
      <div className="card-subtle p-6 sm:p-8 bg-white shadow-sm border-slate-200">
        {/* STEP 1: Basic Information */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Member Details</h2>
                <p className="text-xs text-slate-500">Who are you configuring safety requirements for?</p>
              </div>
            </div>

            <FormField label="Full Name / Nickname" required error={basicErrors.name} id="memberName">
              <input
                id="memberName"
                type="text"
                placeholder="e.g. Father, Sarah, Rajesh"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Relationship" id="memberRelationship">
                <select
                  id="memberRelationship"
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm bg-white"
                >
                  <option value="father">Father</option>
                  <option value="mother">Mother</option>
                  <option value="son">Son</option>
                  <option value="daughter">Daughter</option>
                  <option value="child">Child</option>
                  <option value="grandparent">Grandparent</option>
                  <option value="spouse">Spouse</option>
                  <option value="self">Self</option>
                  <option value="other">Other</option>
                </select>
              </FormField>

              <FormField label="Age (Years)" error={basicErrors.age} id="memberAge">
                <input
                  id="memberAge"
                  type="number"
                  placeholder="e.g. 52"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  min="0"
                  max="150"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
                />
              </FormField>
            </div>

            <FormField label="Notes (Optional)" helperText="Any general health or context notes" id="memberNotes">
              <textarea
                id="memberNotes"
                placeholder="e.g. History of eczema or specific sensitivities..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
              />
            </FormField>
          </div>
        )}

        {/* STEP 2: Allergies */}
        {currentStep === 2 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Declared Allergies</h2>
                <p className="text-xs text-slate-500">Select common allergens or add custom clinical allergies</p>
              </div>
            </div>

            {/* Common Allergy Preset Buttons */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Common Allergens (Tap to select)
              </label>
              <div className="flex flex-wrap gap-2">
                {COMMON_ALLERGIES.map((item) => {
                  const isSelected = allergies.some(
                    (a) => a.name.toLowerCase() === item.toLowerCase()
                  );
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => handleToggleCommonAllergy(item)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                        isSelected
                          ? 'bg-rose-50 text-rose-800 border-rose-300 ring-2 ring-rose-500/20 font-semibold'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {item} {isSelected ? '✓' : '+'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Configured Allergies List & Severity Selectors */}
            {allergies.length > 0 && (
              <div className="space-y-3 pt-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Configured Allergies & Severities ({allergies.length})
                </label>
                <div className="space-y-3">
                  {allergies.map((allergy, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-rose-100 bg-rose-50/30 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-900">{allergy.name}</span>
                        <button
                          type="button"
                          onClick={() => setAllergies(allergies.filter((_, i) => i !== idx))}
                          className="text-xs text-rose-600 hover:text-rose-800 font-semibold"
                        >
                          Remove
                        </button>
                      </div>

                      <SeveritySelector
                        value={allergy.severity}
                        onChange={(sev) => handleUpdateAllergySeverity(idx, sev)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Allergy Adder */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
              <label className="block text-xs font-semibold text-slate-700">+ Add Custom Allergy</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Allergy name (e.g. Kiwi, Mustard)"
                  value={customAllergyName}
                  onChange={(e) => setCustomAllergyName(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:outline-hidden"
                />
                <input
                  type="text"
                  placeholder="Optional notes (e.g. rash, throat tightness)"
                  value={customAllergyNotes}
                  onChange={(e) => setCustomAllergyNotes(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <SeveritySelector
                    value={customAllergySeverity}
                    onChange={(s) => setCustomAllergySeverity(s)}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddCustomAllergy}
                  disabled={!customAllergyName.trim()}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shrink-0"
                >
                  Add Allergy
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Dietary Restrictions */}
        {currentStep === 3 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <Utensils className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Dietary Restrictions</h2>
                <p className="text-xs text-slate-500">Machine-readable diet standards and lifestyle preferences</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">Common Diets</label>
              <div className="flex flex-wrap gap-2">
                {COMMON_DIETARY.map((item) => {
                  const isSelected = dietaryRules.some((d) => d.rule_value === item.value);
                  return (
                    <RestrictionChip
                      key={item.value}
                      label={item.label}
                      selected={isSelected}
                      onToggle={() => handleToggleDietary(item.value, item.label)}
                    />
                  );
                })}
              </div>
            </div>

            {/* Custom dietary rule */}
            <div className="pt-4 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                + Add Custom Dietary Parameter
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="e.g. Jain, Halal, Kosher, Low-FODMAP"
                  value={customDietary}
                  onChange={(e) => setCustomDietary(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={handleAddCustomDietary}
                  disabled={!customDietary.trim()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-xs font-semibold"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Selected Summary */}
            {dietaryRules.length > 0 && (
              <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                <span className="text-xs font-semibold text-emerald-900 block mb-1">
                  Selected Restrictions ({dietaryRules.length}):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {dietaryRules.map((rule, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-white border border-emerald-200 text-xs text-emerald-800 font-medium capitalize"
                    >
                      {rule.label || rule.rule_value}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 4: Ingredient Exclusions */}
        {currentStep === 4 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                <Ban className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Ingredient Exclusions</h2>
                <p className="text-xs text-slate-500">Specific ingredients to avoid regardless of allergens</p>
              </div>
            </div>

            {/* Add Exclusion Form */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Ingredient</label>
                  <input
                    type="text"
                    placeholder="e.g. Gelatin, Palm oil, Onion"
                    value={newExclusionName}
                    onChange={(e) => setNewExclusionName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Reason (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Animal-derived, Personal preference"
                    value={newExclusionReason}
                    onChange={(e) => setNewExclusionReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddExclusion}
                disabled={!newExclusionName.trim()}
                className="w-full py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white rounded-xl text-xs font-semibold transition-all"
              >
                + Add Ingredient Exclusion
              </button>
            </div>

            {/* Configured Exclusions List */}
            {exclusions.length > 0 ? (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Configured Exclusions ({exclusions.length})
                </label>
                {exclusions.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-900 capitalize">
                        {item.ingredient_name}
                      </span>
                      {item.reason && (
                        <span className="text-[11px] text-slate-500 ml-2 italic">
                          ({item.reason})
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setExclusions(exclusions.filter((_, i) => i !== idx))}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-400 italic py-2 text-center">
                No specific ingredient exclusions added yet.
              </div>
            )}
          </div>
        )}

        {/* STEP 5: Preferences & Custom Rules */}
        {currentStep === 5 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Nutrition & Custom Rules</h2>
                <p className="text-xs text-slate-500">Wellness goals and personalized food guidance</p>
              </div>
            </div>

            {/* Nutrition Preferences */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Nutrition Preferences (Select applicable)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {COMMON_PREFERENCES.map((pref) => {
                  const isSelected = preferences.some((p) => p.preference_type === pref.type);
                  return (
                    <button
                      key={pref.type}
                      type="button"
                      onClick={() => handleTogglePreference(pref.type)}
                      className={`p-3 rounded-xl border text-left text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-semibold ring-1 ring-indigo-500/20'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{pref.label}</span>
                        {isSelected && <span className="text-indigo-600 font-bold">✓</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Rules */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <label className="block text-xs font-semibold text-slate-700">
                Custom Food Rule (Freeform Raw Text)
              </label>
              <p className="text-[11px] text-slate-500">
                Examples: "Avoid products containing onion or garlic." or "Alert me whenever an ingredient has an animal-derived source."
              </p>
              <div className="flex items-start gap-2">
                <textarea
                  placeholder="Enter custom food rule..."
                  value={newCustomRuleText}
                  onChange={(e) => setNewCustomRuleText(e.target.value)}
                  rows={2}
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={handleAddCustomRule}
                  disabled={!newCustomRuleText.trim()}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shrink-0"
                >
                  Add Rule
                </button>
              </div>

              {customRules.length > 0 && (
                <div className="space-y-2 pt-2">
                  {customRules.map((rule, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-purple-50/60 border border-purple-100 flex items-center justify-between text-xs text-purple-950 font-medium"
                    >
                      <span>"{rule.rule_text}"</span>
                      <button
                        type="button"
                        onClick={() => setCustomRules(customRules.filter((_, i) => i !== idx))}
                        className="text-purple-400 hover:text-purple-700 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 6: Emergency Contact & Notifications */}
        {currentStep === 6 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                <PhoneCall className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Emergency & Notifications</h2>
                <p className="text-xs text-slate-500">Configure safety contacts and alert channel preferences</p>
              </div>
            </div>

            {/* Emergency Contact Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-800">
                  Configure Emergency Contact
                </label>
                <input
                  type="checkbox"
                  id="enableContact"
                  checked={hasEmergencyContact}
                  onChange={(e) => setHasEmergencyContact(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded-sm"
                />
              </div>

              {hasEmergencyContact && (
                <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/40 space-y-3 animate-in fade-in">
                  {contactError && (
                    <p className="text-xs text-rose-600 font-semibold">{contactError}</p>
                  )}
                  <FormField label="Contact Name" required>
                    <input
                      type="text"
                      placeholder="e.g. Mother, Dr. Sharma, Uncle"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                    />
                  </FormField>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormField label="Phone Number" helperText="Include country code, e.g. +919876543210">
                      <input
                        type="tel"
                        placeholder="+91XXXXXXXXXX"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-mono"
                      />
                    </FormField>

                    <FormField label="WhatsApp Number">
                      <input
                        type="tel"
                        placeholder="+91XXXXXXXXXX"
                        value={contactWhatsapp}
                        onChange={(e) => setContactWhatsapp(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-mono"
                      />
                    </FormField>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="primaryContact"
                      checked={contactIsPrimary}
                      onChange={(e) => setContactIsPrimary(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded-sm"
                    />
                    <label htmlFor="primaryContact" className="text-xs text-slate-700 font-medium">
                      Designate as Primary Emergency Contact
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Notification Toggles */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <label className="block text-xs font-semibold text-slate-800">
                Notification Channel Preferences
              </label>
              <div className="space-y-2">
                <ToggleRow
                  label="In-App Notifications"
                  description="Real-time alerts inside the application"
                  checked={inAppEnabled}
                  onChange={setInAppEnabled}
                />
                <ToggleRow
                  label="Push Notifications"
                  description="System push notifications to your device"
                  checked={pushEnabled}
                  onChange={setPushEnabled}
                />
                <ToggleRow
                  label="WhatsApp Alerts"
                  description="Instant WhatsApp alerts for high-risk item detection"
                  checked={whatsappEnabled}
                  onChange={setWhatsappEnabled}
                />
                <ToggleRow
                  label="Emergency Call"
                  description="Automated emergency contact call on critical allergen conflict"
                  checked={emergencyCallEnabled}
                  onChange={setEmergencyCallEnabled}
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 7: Review & Save */}
        {currentStep === 7 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Review & Save Profile</h2>
                <p className="text-xs text-slate-500">
                  Confirm all details before saving to {activeFamily.name}
                </p>
              </div>
            </div>

            {/* Member Profile Review Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg">
                  {name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{name}</h3>
                  <p className="text-xs text-slate-500 capitalize">
                    {relationship} {age ? `• Age ${age}` : ''}
                  </p>
                </div>
              </div>

              {notes && <p className="text-xs text-slate-600 italic">"{notes}"</p>}

              {/* Allergies Review */}
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Allergies ({allergies.length})
                </span>
                {allergies.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {allergies.map((a, idx) => (
                      <AllergyBadge key={idx} name={a.name} severity={a.severity} />
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 italic">None declared</span>
                )}
              </div>

              {/* Dietary Rules Review */}
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Dietary Restrictions ({dietaryRules.length})
                </span>
                {dietaryRules.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {dietaryRules.map((d, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-medium capitalize"
                      >
                        {d.label || d.rule_value}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 italic">None declared</span>
                )}
              </div>

              {/* Ingredient Exclusions Review */}
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Ingredient Exclusions ({exclusions.length})
                </span>
                {exclusions.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {exclusions.map((e, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 text-xs font-medium capitalize"
                      >
                        {e.ingredient_name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 italic">None declared</span>
                )}
              </div>

              {/* Custom Rules Review */}
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Custom Rules ({customRules.length})
                </span>
                {customRules.length > 0 ? (
                  <ul className="space-y-1 text-xs text-slate-700">
                    {customRules.map((c, idx) => (
                      <li key={idx} className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                        <span>"{c.rule_text}"</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-xs text-slate-400 italic">None</span>
                )}
              </div>

              {/* Contact Review */}
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Emergency Contact
                </span>
                {hasEmergencyContact && contactName ? (
                  <div className="text-xs text-slate-800 font-medium">
                    {contactName} ({contactRelationship}) • {contactPhone || contactWhatsapp || 'No number'}
                    {contactIsPrimary && <span className="ml-2 text-emerald-600 font-bold">[Primary]</span>}
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 italic">None configured</span>
                )}
              </div>
            </div>

            {createMemberMutation.isError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Unable to save family member. Please review fields and try again.</span>
              </div>
            )}
          </div>
        )}

        {/* Wizard Footer Navigation Controls */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-100 mt-6">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              disabled={createMemberMutation.isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {currentStep < totalSteps ? (
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-all"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={createMemberMutation.isPending}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all active:scale-98 disabled:opacity-50"
            >
              {createMemberMutation.isPending ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving Member Profile...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Save Family Member</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
