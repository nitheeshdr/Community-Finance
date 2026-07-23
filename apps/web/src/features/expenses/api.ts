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
  CreateExpenseInput,
  ExpenseDto,
  ExpenseStatus,
  ReviewExpenseInput,
  UpdateExpenseInput,
} from '@community-finance/shared';
import { apiClient, apiErrorMessage } from '@/lib/api-client';

export interface ExpenseFilters {
  page: number;
  status?: ExpenseStatus | 'ALL';
  eventId?: string;
  category?: string;
}

export function useExpenses(filters: ExpenseFilters) {
  return useQuery({
    queryKey: ['expenses', filters],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccess<ExpenseDto[]>>('/expenses', {
        params: {
          page: filters.page,
          limit: 20,
          ...(filters.status && filters.status !== 'ALL' ? { status: filters.status } : {}),
          ...(filters.eventId ? { eventId: filters.eventId } : {}),
          ...(filters.category ? { category: filters.category } : {}),
        },
      });
      return res.data;
    },
  });
}

function useInvalidateExpenses() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ['expenses'] });
    void qc.invalidateQueries({ queryKey: ['events'] });
    void qc.invalidateQueries({ queryKey: ['dashboard'] });
  };
}

export function useCreateExpense() {
  const invalidate = useInvalidateExpenses();
  return useMutation({
    mutationFn: async (input: CreateExpenseInput) => {
      const res = await apiClient.post<ApiSuccess<ExpenseDto>>('/expenses', input);
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Expense added — pending approval');
      invalidate();
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
}

export function useUpdateExpense(id: string) {
  const invalidate = useInvalidateExpenses();
  return useMutation({
    mutationFn: async (input: UpdateExpenseInput) => {
      const res = await apiClient.patch<ApiSuccess<ExpenseDto>>(`/expenses/${id}`, input);
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Expense updated — re-entered approval queue');
      invalidate();
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
}

export function useReviewExpense() {
  const invalidate = useInvalidateExpenses();
  return useMutation({
    mutationFn: async ({ id, ...input }: ReviewExpenseInput & { id: string }) => {
      const res = await apiClient.post<ApiSuccess<ExpenseDto>>(`/expenses/${id}/review`, input);
      return res.data.data;
    },
    onSuccess: (expense) => {
      toast.success(expense.status === 'APPROVED' ? 'Expense approved' : 'Expense rejected');
      invalidate();
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
}

export function useDeleteExpense() {
  const invalidate = useInvalidateExpenses();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/expenses/${id}`);
    },
    onSuccess: () => {
      toast.success('Expense deleted');
      invalidate();
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
}
