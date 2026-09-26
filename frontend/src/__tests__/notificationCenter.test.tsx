import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { NotificationBell } from '../components/notifications/NotificationBell';
import { NotificationDropdown } from '../components/notifications/NotificationDropdown';
import { NotificationCard } from '../components/notifications/NotificationCard';
import { NotificationCenter } from '../components/notifications/NotificationCenter';
import { NotificationCenterPage } from '../pages/NotificationCenterPage';
import { notificationService } from '../services/notificationService';
import { HouseholdNotification } from '../types/notifications';

vi.mock('../services/notificationService', () => ({
  notificationService: {
    getUnreadCount: vi.fn(),
    listAlerts: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
  },
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    activeFamily: { id: 'fam-1', name: 'Test Family' },
    user: { id: 'u1', email: 'a@test.com' },
  }),
}));

const mockNotification: HouseholdNotification = {
  id: 'n1',
  family_id: 'fam-1',
  recipient_member_id: 'm1',
  type: 'HIGH_ATTENTION',
  title: 'Attention needed for Sarah',
  message: 'Protein Bar has a configured conflict.',
  status: 'unread',
  source_type: 'risk_finding',
  finding_id: 'f1',
  receipt_id: 'r1',
  product_id: 'p1',
  created_at: new Date().toISOString(),
  product_name: 'Protein Bar',
  member_name: 'Sarah',
  action_label: 'View finding',
  action_path: '/risk/receipts/r1?findingId=f1',
};

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
};

describe('Phase 9 Notification UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(notificationService.getUnreadCount).mockResolvedValue(3);
    vi.mocked(notificationService.listAlerts).mockResolvedValue({
      items: [mockNotification],
      total: 1,
    });
    vi.mocked(notificationService.markRead).mockResolvedValue({
      ...mockNotification,
      status: 'read',
    });
    vi.mocked(notificationService.markAllRead).mockResolvedValue(1);
  });

  it('1. Bell renders', async () => {
    render(<NotificationBell familyId="fam-1" />, { wrapper });
    expect(await screen.findByRole('button', { name: /notifications/i })).toBeInTheDocument();
  });

  it('2. Unread badge renders', async () => {
    render(<NotificationBell familyId="fam-1" />, { wrapper });
    expect(await screen.findByText('3')).toBeInTheDocument();
  });

  it('3. Notification dropdown works', async () => {
    render(
      <NotificationDropdown familyId="fam-1" isOpen onClose={() => {}} />,
      { wrapper }
    );
    expect(await screen.findByText('Recent alerts')).toBeInTheDocument();
    expect(await screen.findByText('Protein Bar')).toBeInTheDocument();
  });

  it('4. Notification center works', async () => {
    render(<NotificationCenter familyId="fam-1" />, { wrapper });
    expect(await screen.findByText('Protein Bar')).toBeInTheDocument();
  });

  it('5. Notification card renders', () => {
    render(
      <NotificationCard notification={mockNotification} onAction={vi.fn()} />
    );
    expect(screen.getByText('Protein Bar')).toBeInTheDocument();
    expect(screen.getByText('View finding')).toBeInTheDocument();
  });

  it('6. Read/unread state works', () => {
    const { rerender } = render(
      <NotificationCard notification={mockNotification} onAction={vi.fn()} />
    );
    expect(document.querySelector('[aria-label="Unread"]')).toBeInTheDocument();
    rerender(
      <NotificationCard
        notification={{ ...mockNotification, status: 'read' }}
        onAction={vi.fn()}
      />
    );
    expect(document.querySelector('[aria-label="Unread"]')).not.toBeInTheDocument();
  });

  it('7. Mark all as read works', async () => {
    render(<NotificationCenter familyId="fam-1" />, { wrapper });
    const btn = await screen.findByRole('button', { name: /mark all as read/i });
    fireEvent.click(btn);
    await waitFor(() => {
      expect(notificationService.markAllRead).toHaveBeenCalledWith('fam-1');
    });
  });

  it('8. Clicking notification opens correct destination', async () => {
    const onAction = vi.fn();
    render(<NotificationCard notification={mockNotification} onAction={onAction} />);
    fireEvent.click(screen.getByText('View finding'));
    expect(onAction).toHaveBeenCalledWith(mockNotification);
  });

  it('9. Empty state works', async () => {
    vi.mocked(notificationService.listAlerts).mockResolvedValue({ items: [], total: 0 });
    render(<NotificationCenter familyId="fam-1" />, { wrapper });
    expect(await screen.findByText(/no household alerts yet/i)).toBeInTheDocument();
  });

  it('10. Notification center page loads', async () => {
    render(<NotificationCenterPage />, { wrapper });
    expect(await screen.findByText('Notification Center')).toBeInTheDocument();
  });
});
