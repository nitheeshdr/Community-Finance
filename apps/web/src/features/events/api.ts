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
  ChangeEventStatusInput,
  CreateEventInput,
  EventDto,
  EventSplitDto,
  EventSplitHistoryDto,
  EventStatus,
  UpdateEventInput,
} from '@community-finance/shared';
import { apiClient, apiErrorMessage } from '@/lib/api-client';

export interface EventFilters {
  page: number;
  search?: string;
  status?: EventStatus | 'ALL';
}

export function useEvents(filters: EventFilters) {
  return useQuery({
    queryKey: ['events', filters],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccess<EventDto[]>>('/events', {
        params: {
          page: filters.page,
          limit: 20,
          ...(filters.search ? { search: filters.search } : {}),
          ...(filters.status && filters.status !== 'ALL' ? { status: filters.status } : {}),
        },
      });
      return res.data;
    },
  });
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: ['events', 'detail', id],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccess<EventDto>>(`/events/${id}`);
      return res.data.data;
    },
    enabled: Boolean(id),
  });
}

export function useEventSplits(id: string) {
  return useQuery({
    queryKey: ['events', 'splits', id],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccess<EventSplitDto[]>>(`/events/${id}/splits`);
      return res.data.data;
    },
    enabled: Boolean(id),
  });
}

export function useEventSplitHistory(id: string) {
  return useQuery({
    queryKey: ['events', 'split-history', id],
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccess<EventSplitHistoryDto[]>>(
        `/events/${id}/split-history`
      );
      return res.data.data;
    },
    enabled: Boolean(id),
  });
}

function useInvalidateEvents() {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: ['events'] });
}

export function useCreateEvent() {
  const invalidate = useInvalidateEvents();
  return useMutation({
    mutationFn: async (input: CreateEventInput) => {
      const res = await apiClient.post<ApiSuccess<EventDto>>('/events', input);
      return res.data.data;
    },
    onSuccess: (event) => {
      toast.success(`${event.name} created — splits calculated`);
      invalidate();
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
}

export function useUpdateEvent(id: string) {
  const invalidate = useInvalidateEvents();
  return useMutation({
    mutationFn: async (input: UpdateEventInput) => {
      const res = await apiClient.patch<ApiSuccess<EventDto>>(`/events/${id}`, input);
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Event updated');
      invalidate();
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
}

export function useChangeEventStatus(id: string) {
  const invalidate = useInvalidateEvents();
  return useMutation({
    mutationFn: async (input: ChangeEventStatusInput) => {
      const res = await apiClient.post<ApiSuccess<EventDto>>(`/events/${id}/status`, input);
      return res.data.data;
    },
    onSuccess: (event) => {
      toast.success(`Event ${event.status.toLowerCase()}`);
      invalidate();
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
}

export function useDeleteEvent() {
  const invalidate = useInvalidateEvents();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/events/${id}`);
    },
    onSuccess: () => {
      toast.success('Event deleted');
      invalidate();
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
}
