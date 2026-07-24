'use client';

import { useQuery } from '@tanstack/react-query';
import type {
  ApiSuccess,
  MemberLedgerDto,
  PeriodDuesDto,
} from '@community-finance/shared';
import { apiClient } from '@/lib/api-client';

export function useDues(period: string) {
  return useQuery({
    queryKey: ['dues', period],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccess<PeriodDuesDto>>('/dues', {
        params: { period },
      });
      return res.data.data;
    },
    enabled: /^\d{4}-\d{2}$/.test(period),
  });
}

export function useMemberLedger(memberId: string) {
  return useQuery({
    queryKey: ['ledger', memberId],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccess<MemberLedgerDto>>(`/members/${memberId}/ledger`);
      return res.data.data;
    },
    enabled: Boolean(memberId),
  });
}
