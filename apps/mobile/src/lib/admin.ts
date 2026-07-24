import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import type {
  ApiSuccess,
  CreateEventInput,
  CreateExpenseInput,
  CreateIncomeInput,
  CreateMemberInput,
  EventDto,
  EventStatus,
  ExpenseDto,
  MemberDto,
  MemberLedgerDto,
  PaginationMeta,
  PaymentDto,
  PeriodDuesDto,
  UpdateEventInput,
  UserStatus,
} from '@community-finance/shared';
import { api } from './api';

/* ------------------------------------------------------------------ */
/* Queries                                                             */
/* ------------------------------------------------------------------ */

export function useAdminMembers(params: { page: number; search?: string; status?: string }) {
  return useQuery({
    queryKey: ['admin', 'members', params],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const res = await api.get<ApiSuccess<MemberDto[]> & { meta?: PaginationMeta }>('/members', {
        params: {
          page: params.page,
          limit: 20,
          ...(params.search ? { search: params.search } : {}),
          ...(params.status && params.status !== 'ALL' ? { status: params.status } : {}),
        },
      });
      return res.data;
    },
  });
}

/** Pending manual payments awaiting approval. */
export function usePendingPayments() {
  return useQuery({
    queryKey: ['admin', 'pending-payments'],
    queryFn: async () => {
      const res = await api.get<ApiSuccess<PaymentDto[]>>('/payments', {
        params: { page: 1, limit: 50, status: 'PENDING', method: 'CASH' },
      });
      // Include UPI too (two calls merged client-side).
      const upi = await api.get<ApiSuccess<PaymentDto[]>>('/payments', {
        params: { page: 1, limit: 50, status: 'PENDING', method: 'UPI' },
      });
      return [...res.data.data, ...upi.data.data];
    },
  });
}

export function usePendingExpenses() {
  return useQuery({
    queryKey: ['admin', 'pending-expenses'],
    queryFn: async () => {
      const res = await api.get<ApiSuccess<ExpenseDto[]>>('/expenses', {
        params: { page: 1, limit: 50, status: 'PENDING' },
      });
      return res.data.data;
    },
  });
}

/** Subscription dues for a month — who has paid and who hasn't. */
export function useDues(period: string) {
  return useQuery({
    queryKey: ['admin', 'dues', period],
    queryFn: async () => {
      const res = await api.get<ApiSuccess<PeriodDuesDto>>('/dues', { params: { period } });
      return res.data.data;
    },
    enabled: /^\d{4}-\d{2}$/.test(period),
  });
}

/** A member's month-by-month subscription ledger. */
export function useMemberLedger(memberId: string) {
  return useQuery({
    queryKey: ['admin', 'ledger', memberId],
    enabled: Boolean(memberId),
    queryFn: async () => {
      const res = await api.get<ApiSuccess<MemberLedgerDto>>(`/members/${memberId}/ledger`);
      return res.data.data;
    },
  });
}

export function useEventPicker(enabled = true) {
  return useQuery({
    queryKey: ['admin', 'event-picker'],
    enabled,
    queryFn: async () => {
      const res = await api.get<ApiSuccess<EventDto[]>>('/events', {
        params: { page: 1, limit: 100 },
      });
      return res.data.data;
    },
  });
}

export function useMemberPicker(enabled = true) {
  return useQuery({
    queryKey: ['admin', 'member-picker'],
    enabled,
    queryFn: async () => {
      const res = await api.get<ApiSuccess<MemberDto[]>>('/members', {
        params: { page: 1, limit: 100, status: 'ACTIVE', role: 'MEMBER' },
      });
      return res.data.data;
    },
  });
}

/* ------------------------------------------------------------------ */
/* Mutations                                                           */
/* ------------------------------------------------------------------ */

function useInvalidate() {
  const qc = useQueryClient();
  return (keys: string[][]) => keys.forEach((k) => void qc.invalidateQueries({ queryKey: k }));
}

export function useCreateMember() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (input: CreateMemberInput) => {
      const res = await api.post<ApiSuccess<MemberDto>>('/members', input);
      return res.data.data;
    },
    onSuccess: () => invalidate([['admin', 'members'], ['members'], ['dashboard']]),
  });
}

export function useChangeMemberStatus() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: UserStatus }) => {
      const res = await api.post<ApiSuccess<MemberDto>>(`/members/${id}/status`, { status });
      return res.data.data;
    },
    onSuccess: () => invalidate([['admin', 'members'], ['members'], ['events'], ['dashboard']]),
  });
}

export function useReviewPayment() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, action, reason }: { id: string; action: 'APPROVE' | 'REJECT'; reason?: string }) => {
      const res = await api.post<ApiSuccess<PaymentDto>>(`/payments/${id}/review`, { action, reason });
      return res.data.data;
    },
    onSuccess: () =>
      invalidate([['admin', 'pending-payments'], ['payments'], ['dashboard']]),
  });
}

export function useReviewExpense() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, action, reason }: { id: string; action: 'APPROVE' | 'REJECT'; reason?: string }) => {
      const res = await api.post<ApiSuccess<ExpenseDto>>(`/expenses/${id}/review`, { action, reason });
      return res.data.data;
    },
    onSuccess: () =>
      invalidate([['admin', 'pending-expenses'], ['expenses'], ['events'], ['dashboard']]),
  });
}

export function useRecordPayment() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (input: {
      memberId: string;
      type: string;
      method: string;
      amount: number;
      period?: string;
      eventId?: string;
      upiReference?: string;
      notes?: string;
    }) => {
      const res = await api.post<ApiSuccess<PaymentDto>>('/payments', input);
      return res.data.data;
    },
    onSuccess: () =>
      invalidate([['admin', 'pending-payments'], ['payments'], ['dashboard']]),
  });
}

export function useCreateExpense() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (input: CreateExpenseInput) => {
      const res = await api.post<ApiSuccess<ExpenseDto>>('/expenses', input);
      return res.data.data;
    },
    onSuccess: () =>
      invalidate([['admin', 'pending-expenses'], ['expenses'], ['events'], ['dashboard']]),
  });
}

export function useCreateIncome() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (input: CreateIncomeInput) => {
      const res = await api.post('/income', input);
      return res.data;
    },
    onSuccess: () => invalidate([['income'], ['dashboard']]),
  });
}

export function useCreateEvent() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (input: CreateEventInput) => {
      const res = await api.post<ApiSuccess<EventDto>>('/events', input);
      return res.data.data;
    },
    onSuccess: () => invalidate([['events'], ['dashboard']]),
  });
}

export function useUpdateEvent(id: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (input: UpdateEventInput) => {
      const res = await api.patch<ApiSuccess<EventDto>>(`/events/${id}`, input);
      return res.data.data;
    },
    onSuccess: () => invalidate([['events'], ['dashboard']]),
  });
}

export function useChangeEventStatus(id: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (status: EventStatus) => {
      const res = await api.post<ApiSuccess<EventDto>>(`/events/${id}/status`, { status });
      return res.data.data;
    },
    onSuccess: () => invalidate([['events'], ['dashboard']]),
  });
}

export function useDeleteEvent() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/events/${id}`);
    },
    onSuccess: () => invalidate([['events'], ['dashboard']]),
  });
}

export function useDeletePayment() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/payments/${id}`);
    },
    onSuccess: () =>
      invalidate([['admin', 'pending-payments'], ['payments'], ['dashboard']]),
  });
}

export function useSendAnnouncement() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (input: { type: string; title: string; body: string }) => {
      const res = await api.post('/notifications', input);
      return res.data;
    },
    onSuccess: () => invalidate([['notifications']]),
  });
}
