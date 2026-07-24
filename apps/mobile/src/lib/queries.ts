import { useQuery } from '@tanstack/react-query';
import type {
  ApiSuccess,
  DashboardStatsDto,
  EventDto,
  EventSplitDto,
  FinancialReportDto,
  NotificationDto,
  PaymentDto,
  SubscriptionDto,
} from '@community-finance/shared';
import { api } from './api';

/** Community dashboard stats (transparency: same numbers admins see). */
export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await api.get<ApiSuccess<DashboardStatsDto>>('/dashboard');
      return res.data.data;
    },
  });
}

/** The signed-in member's own payments. */
export function useMyPayments(memberId: string | undefined, page = 1) {
  return useQuery({
    queryKey: ['payments', 'mine', memberId, page],
    enabled: Boolean(memberId),
    queryFn: async () => {
      const res = await api.get<ApiSuccess<PaymentDto[]>>('/payments', {
        params: { memberId, page, limit: 20 },
      });
      return res.data;
    },
  });
}

/** The member's live AutoPay subscription (null if none). */
export function useMySubscription(memberId: string | undefined) {
  return useQuery({
    queryKey: ['subscription', memberId],
    enabled: Boolean(memberId),
    queryFn: async () => {
      const res = await api.get<ApiSuccess<SubscriptionDto | null>>(
        `/subscriptions/${memberId}`
      );
      return res.data.data;
    },
  });
}

export function useEvents(page = 1) {
  return useQuery({
    queryKey: ['events', page],
    queryFn: async () => {
      const res = await api.get<ApiSuccess<EventDto[]>>('/events', {
        params: { page, limit: 20 },
      });
      return res.data;
    },
  });
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: ['events', 'detail', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const res = await api.get<ApiSuccess<EventDto>>(`/events/${id}`);
      return res.data.data;
    },
  });
}

export function useEventSplits(id: string) {
  return useQuery({
    queryKey: ['events', 'splits', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const res = await api.get<ApiSuccess<EventSplitDto[]>>(`/events/${id}/splits`);
      return res.data.data;
    },
  });
}

export function useNotifications(page = 1) {
  return useQuery({
    queryKey: ['notifications', page],
    queryFn: async () => {
      const res = await api.get<ApiSuccess<NotificationDto[]>>('/notifications', {
        params: { page, limit: 30 },
      });
      return res.data;
    },
  });
}

export function useReport(period: string, date?: string) {
  return useQuery({
    queryKey: ['report', period, date],
    queryFn: async () => {
      const res = await api.get<ApiSuccess<FinancialReportDto>>('/reports', {
        params: { period, ...(date ? { date } : {}) },
      });
      return res.data.data;
    },
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications', 'unread'],
    refetchInterval: 60_000,
    queryFn: async () => {
      const res = await api.get<ApiSuccess<{ count: number }>>('/notifications/unread-count');
      return res.data.data.count;
    },
  });
}
