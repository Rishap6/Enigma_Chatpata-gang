import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AllergyBadge } from '../components/AllergyBadge';
import { RestrictionChip } from '../components/RestrictionChip';
import { SeveritySelector } from '../components/SeveritySelector';
import { ToggleRow } from '../components/ToggleRow';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { ContactCard } from '../components/ContactCard';
import { FamilyMemberCard } from '../components/FamilyMemberCard';

describe('UI Components Unit & Integration Tests', () => {
  it('1. AllergyBadge renders allergy name and severity correctly', () => {
    const handleRemove = vi.fn();
    render(<AllergyBadge name="Peanut" severity="severe" onRemove={handleRemove} />);

    expect(screen.getByText('Peanut')).toBeDefined();
    expect(screen.getByText('(Severe)')).toBeDefined();

    const removeBtn = screen.getByRole('button', { name: /remove allergy peanut/i });
    fireEvent.click(removeBtn);
    expect(handleRemove).toHaveBeenCalledTimes(1);
  });

  it('2. RestrictionChip toggles and displays selected state', () => {
    const handleToggle = vi.fn();
    const { rerender } = render(
      <RestrictionChip label="Vegetarian" selected={false} onToggle={handleToggle} />
    );

    const chip = screen.getByText('Vegetarian');
    expect(chip).toBeDefined();

    fireEvent.click(chip);
    expect(handleToggle).toHaveBeenCalledTimes(1);

    rerender(<RestrictionChip label="Vegetarian" selected={true} onToggle={handleToggle} />);
    expect(screen.getByText('Vegetarian')).toBeDefined();
  });

  it('3. SeveritySelector allows choosing mild, moderate, severe', () => {
    const handleChange = vi.fn();
    render(<SeveritySelector value="mild" onChange={handleChange} />);

    const severeBtn = screen.getByRole('button', { name: /severe/i });
    fireEvent.click(severeBtn);
    expect(handleChange).toHaveBeenCalledWith('severe');
  });

  it('4. ToggleRow fires onChange when clicked', () => {
    const handleChange = vi.fn();
    render(
      <ToggleRow
        label="In-App Notifications"
        description="Receive instant alerts"
        checked={false}
        onChange={handleChange}
      />
    );

    expect(screen.getByText('In-App Notifications')).toBeDefined();
    expect(screen.getByText('Receive instant alerts')).toBeDefined();

    fireEvent.click(screen.getByText('In-App Notifications'));
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it('5. ConfirmDialog renders destructive warning and handles confirm/cancel', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <ConfirmDialog
        isOpen={true}
        title="Remove Father?"
        message="This will remove the member configuration"
        details={['Allergies', 'Dietary restrictions']}
        confirmLabel="Remove Member"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    expect(screen.getByText('Remove Father?')).toBeDefined();
    expect(screen.getByText('Allergies')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /remove member/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('6. EmptyState renders title, description, and action button', () => {
    render(
      <EmptyState
        title="No allergies configured"
        description="Add declared allergens to get alerts"
        action={<button>Add First Allergy</button>}
      />
    );

    expect(screen.getByText('No allergies configured')).toBeDefined();
    expect(screen.getByText('Add declared allergens to get alerts')).toBeDefined();
    expect(screen.getByText('Add First Allergy')).toBeDefined();
  });

  it('7. LoadingState and ErrorState display proper feedback', () => {
    const onRetry = vi.fn();
    const { rerender } = render(<LoadingState message="Fetching requirements..." />);
    expect(screen.getByText('Fetching requirements...')).toBeDefined();

    rerender(<ErrorState title="Network Error" message="Please retry" onRetry={onRetry} />);
    expect(screen.getByText('Network Error')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('8. ContactCard displays emergency contact details and primary badge', () => {
    const contact = {
      id: '123',
      member_id: '456',
      name: 'Mother',
      relationship: 'Spouse',
      phone: '+919876543210',
      whatsapp_number: '+919876543210',
      is_primary: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    render(<ContactCard contact={contact} />);
    expect(screen.getByText('Mother')).toBeDefined();
    expect(screen.getByText('Primary')).toBeDefined();
    expect(screen.getAllByText('+919876543210').length).toBeGreaterThanOrEqual(1);
  });

  it('9. FamilyMemberCard displays member info and links to detail profile', () => {
    const memberSummary = {
      id: 'mem-1',
      family_id: 'fam-1',
      name: 'Father',
      age: 52,
      relationship: 'Father',
      notes: 'Peanut allergy',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      allergy_count: 1,
      dietary_rule_count: 2,
      ingredient_exclusion_count: 1,
      custom_rule_count: 1,
      emergency_contact_count: 1,
      allergies_summary: ['Peanut'],
      dietary_summary: ['Vegetarian'],
    };

    render(
      <BrowserRouter>
        <FamilyMemberCard member={memberSummary} />
      </BrowserRouter>
    );

    expect(screen.getAllByText('Father').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Age 52/i)).toBeDefined();
    expect(screen.getByText('Peanut')).toBeDefined();
    expect(screen.getByText('View Profile')).toBeDefined();
  });
});
