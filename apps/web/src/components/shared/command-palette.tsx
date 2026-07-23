'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Command } from 'cmdk';
import {
  Calendar,
  CreditCard,
  FileText,
  Loader2,
  Receipt,
  Search,
  User,
} from 'lucide-react';
import type { ApiSuccess, GlobalSearchResultDto } from '@community-finance/shared';
import { apiClient } from '@/lib/api-client';
import { inr } from '@/lib/utils';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');

  // Debounce the query.
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const { data: results, isFetching } = useQuery({
    queryKey: ['search', debounced],
    enabled: open && debounced.trim().length >= 2,
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccess<GlobalSearchResultDto>>('/search', {
        params: { q: debounced.trim() },
      });
      return res.data.data;
    },
  });

  function go(path: string) {
    onOpenChange(false);
    router.push(path);
  }

  const hasResults =
    results &&
    (results.members.length > 0 ||
      results.events.length > 0 ||
      results.expenses.length > 0 ||
      results.payments.length > 0 ||
      results.documents.length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[20%] translate-y-0 gap-0 p-0 sm:max-w-xl [&>button]:hidden">
        <DialogTitle className="sr-only">Search</DialogTitle>
        <Command shouldFilter={false} label="Global search">
          <div className="flex items-center gap-2 border-b px-4">
            {isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <Search className="h-4 w-4 text-muted-foreground" />
            )}
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Search members, events, expenses, payments…"
              className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <kbd className="rounded border bg-muted px-1.5 text-[10px] text-muted-foreground">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-80 overflow-y-auto p-2">
            {debounced.trim().length < 2 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Type at least 2 characters to search…
              </p>
            ) : !hasResults && !isFetching ? (
              <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
                No results for “{debounced}”
              </Command.Empty>
            ) : (
              <>
                {results && results.members.length > 0 && (
                  <Group heading="Members">
                    {results.members.map((m) => (
                      <Item key={m.id} onSelect={() => go(`/members/${m.id}`)}>
                        <User className="h-4 w-4" />
                        <span>{m.name}</span>
                        <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                          {m.phone}
                        </span>
                      </Item>
                    ))}
                  </Group>
                )}
                {results && results.events.length > 0 && (
                  <Group heading="Events">
                    {results.events.map((e) => (
                      <Item key={e.id} onSelect={() => go(`/events/${e.id}`)}>
                        <Calendar className="h-4 w-4" />
                        <span>{e.name}</span>
                      </Item>
                    ))}
                  </Group>
                )}
                {results && results.expenses.length > 0 && (
                  <Group heading="Expenses">
                    {results.expenses.map((x) => (
                      <Item key={x.id} onSelect={() => go('/expenses')}>
                        <Receipt className="h-4 w-4" />
                        <span>{x.name}</span>
                        <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                          {inr(x.amount)}
                        </span>
                      </Item>
                    ))}
                  </Group>
                )}
                {results && results.payments.length > 0 && (
                  <Group heading="Payments">
                    {results.payments.map((p) => (
                      <Item key={p.id} onSelect={() => go('/payments')}>
                        <CreditCard className="h-4 w-4" />
                        <span>{p.receiptNumber ?? 'Payment'}</span>
                        <span className="text-xs text-muted-foreground">{p.memberName}</span>
                        <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                          {inr(p.amount)}
                        </span>
                      </Item>
                    ))}
                  </Group>
                )}
                {results && results.documents.length > 0 && (
                  <Group heading="Documents">
                    {results.documents.map((d) => (
                      <Item
                        key={d.id}
                        onSelect={() => {
                          onOpenChange(false);
                          window.open(d.url, '_blank');
                        }}
                      >
                        <FileText className="h-4 w-4" />
                        <span>{d.name}</span>
                      </Item>
                    ))}
                  </Group>
                )}
              </>
            )}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

function Group({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <Command.Group
      heading={heading}
      className="mb-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground"
    >
      {children}
    </Command.Group>
  );
}

function Item({
  children,
  onSelect,
}: {
  children: React.ReactNode;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-sm data-[selected=true]:bg-accent"
    >
      {children}
    </Command.Item>
  );
}
