'use client';

import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Command } from 'cmdk';
import { Check, ChevronsUpDown, Loader2, Search } from 'lucide-react';
import type { ApiSuccess, MemberDto } from '@community-finance/shared';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

/**
 * Single searchable member picker — combines the search box and the
 * dropdown into one combobox. Query runs server-side as the admin types.
 */
export function MemberCombobox({
  value,
  onChange,
  placeholder = 'Select member…',
}: {
  value: string;
  onChange: (memberId: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: members = [], isFetching } = useQuery({
    queryKey: ['members', 'combobox', search],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccess<MemberDto[]>>('/members', {
        params: { page: 1, limit: 50, ...(search ? { search } : {}) },
      });
      return res.data.data;
    },
    enabled: open,
  });

  // Resolve the selected member's label even if it's not in the current page.
  const { data: selected } = useQuery({
    queryKey: ['members', 'detail', value],
    enabled: Boolean(value),
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccess<MemberDto>>(`/members/${value}`);
      return res.data.data;
    },
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <span className={cn('truncate', !value && 'text-muted-foreground')}>
            {value && selected ? `${selected.name} · ${selected.phone}` : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-72">
        <Command shouldFilter={false}>
          <div className="flex items-center gap-2 border-b px-3">
            {isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <Search className="h-4 w-4 text-muted-foreground" />
            )}
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Search name or phone…"
              className="h-10 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <Command.List className="max-h-64 overflow-y-auto p-1">
            {members.length === 0 && !isFetching ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No members found.</p>
            ) : (
              members.map((m) => (
                <Command.Item
                  key={m.id}
                  value={m.id}
                  onSelect={() => {
                    onChange(m.id);
                    setOpen(false);
                  }}
                  className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm data-[selected=true]:bg-accent"
                >
                  <Check className={cn('h-4 w-4', value === m.id ? 'opacity-100' : 'opacity-0')} />
                  <span className="flex-1">{m.name}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">{m.phone}</span>
                </Command.Item>
              ))
            )}
          </Command.List>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
