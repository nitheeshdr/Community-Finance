'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
  ApiSuccess,
  ChangeMemberStatusInput,
  CreateMemberInput,
  MemberDto,
  UpdateMemberInput,
  UserStatus,
} from '@community-finance/shared';
import { apiClient, apiErrorMessage } from '@/lib/api-client';

export interface MemberFilters {
  page: number;
  search?: string;
  status?: UserStatus | 'ALL';
  limit?: number;
}

const KEYS = {
  list: (filters: MemberFilters) => ['members', filters] as const,
  detail: (id: string) => ['members', 'detail', id] as const,
};

export function useMembers(filters: MemberFilters) {
  return useQuery({
    queryKey: KEYS.list(filters),
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccess<MemberDto[]>>('/members', {
        params: {
          page: filters.page,
          limit: filters.limit ?? 20,
          ...(filters.search ? { search: filters.search } : {}),
          ...(filters.status && filters.status !== 'ALL' ? { status: filters.status } : {}),
        },
      });
      return res.data;
    },
  });
}

export function useMember(id: string) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccess<MemberDto>>(`/members/${id}`);
      return res.data.data;
    },
    enabled: Boolean(id),
  });
}

function useInvalidateMembers() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['members'] });
}

export function useCreateMember() {
  const invalidate = useInvalidateMembers();
  return useMutation({
    mutationFn: async (input: CreateMemberInput) => {
      const res = await apiClient.post<ApiSuccess<MemberDto>>('/members', input);
      return res.data.data;
    },
    onSuccess: (member) => {
      toast.success(`${member.name} added`);
      void invalidate();
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
}

export function useUpdateMember(id: string) {
  const invalidate = useInvalidateMembers();
  return useMutation({
    mutationFn: async (input: UpdateMemberInput) => {
      const res = await apiClient.patch<ApiSuccess<MemberDto>>(`/members/${id}`, input);
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Member updated');
      void invalidate();
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
}

export function useChangeMemberStatus(id: string) {
  const invalidate = useInvalidateMembers();
  return useMutation({
    mutationFn: async (input: ChangeMemberStatusInput) => {
      const res = await apiClient.post<ApiSuccess<MemberDto>>(`/members/${id}/status`, input);
      return res.data.data;
    },
    onSuccess: (member) => {
      toast.success(`Status changed to ${member.status.toLowerCase()}`);
      void invalidate();
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
}

export function useDeleteMember() {
  const invalidate = useInvalidateMembers();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/members/${id}`);
    },
    onSuccess: () => {
      toast.success('Member removed');
      void invalidate();
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
}

export function useResetMemberPassword(id: string) {
  return useMutation({
    mutationFn: async (newPassword: string) => {
      await apiClient.post(`/members/${id}/reset-password`, { newPassword });
    },
    onSuccess: () => toast.success('Password reset — share the new password with the member'),
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
}
