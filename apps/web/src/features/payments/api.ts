'use client';

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
  ApiSuccess,
  ApprovePaymentInput,
  PaymentDto,
  PaymentMethod,
  PaymentStatus,
  PaymentType,
  RecordManualPaymentInput,
  SubscriptionDto,
} from '@community-finance/shared';
import { apiClient, apiErrorMessage } from '@/lib/api-client';

export interface PaymentFilters {
  page: number;
  status?: PaymentStatus | 'ALL';
  method?: PaymentMethod | 'ALL';
  type?: PaymentType | 'ALL';
  memberId?: string;
  eventId?: string;
}

export function usePayments(filters: PaymentFilters) {
  return useQuery({
    queryKey: ['payments', filters],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccess<PaymentDto[]>>('/payments', {
        params: {
          page: filters.page,
          limit: 20,
          ...(filters.status && filters.status !== 'ALL' ? { status: filters.status } : {}),
          ...(filters.method && filters.method !== 'ALL' ? { method: filters.method } : {}),
          ...(filters.type && filters.type !== 'ALL' ? { type: filters.type } : {}),
          ...(filters.memberId ? { memberId: filters.memberId } : {}),
          ...(filters.eventId ? { eventId: filters.eventId } : {}),
        },
      });
      return res.data;
    },
  });
}

function useInvalidatePayments() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ['payments'] });
    void qc.invalidateQueries({ queryKey: ['dashboard'] });
  };
}

export function useRecordPayment() {
  const invalidate = useInvalidatePayments();
  return useMutation({
    mutationFn: async (input: RecordManualPaymentInput) => {
      const res = await apiClient.post<ApiSuccess<PaymentDto>>('/payments', input);
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Payment recorded — pending approval');
      invalidate();
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
}

export function useReviewPayment() {
  const invalidate = useInvalidatePayments();
  return useMutation({
    mutationFn: async ({ id, ...input }: ApprovePaymentInput & { id: string }) => {
      const res = await apiClient.post<ApiSuccess<PaymentDto>>(`/payments/${id}/review`, input);
      return res.data.data;
    },
    onSuccess: (payment) => {
      toast.success(
        payment.status === 'PAID'
          ? `Payment approved — receipt ${payment.receiptNumber ?? 'generated'}`
          : 'Payment rejected'
      );
      invalidate();
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
}

export function useRefundPayment() {
  const invalidate = useInvalidatePayments();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await apiClient.post<ApiSuccess<PaymentDto>>(`/payments/${id}/refund`, { reason });
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Payment refunded');
      invalidate();
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
}

export function useMemberSubscription(memberId: string) {
  return useQuery({
    queryKey: ['subscriptions', memberId],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccess<SubscriptionDto | null>>(
        `/subscriptions/${memberId}`
      );
      return res.data.data;
    },
    enabled: Boolean(memberId),
  });
}

export function useCreateSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (memberId: string) => {
      const res = await apiClient.post<ApiSuccess<SubscriptionDto>>('/subscriptions', { memberId });
      return res.data.data;
    },
    onSuccess: (sub) => {
      toast.success('Subscription created — share the authorization link with the member');
      void qc.invalidateQueries({ queryKey: ['subscriptions', sub.memberId] });
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
}

export function useCancelSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ memberId, reason }: { memberId: string; reason?: string }) => {
      const res = await apiClient.delete<ApiSuccess<SubscriptionDto>>(
        `/subscriptions/${memberId}`,
        { data: { cancelAtCycleEnd: false, reason } }
      );
      return res.data.data;
    },
    onSuccess: (sub) => {
      toast.success('Subscription cancelled');
      void qc.invalidateQueries({ queryKey: ['subscriptions', sub.memberId] });
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
}
