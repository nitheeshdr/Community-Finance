'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FileUp,
  KeyRound,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserCheck,
  UserMinus,
  UserX,
  Users,
} from 'lucide-react';
import {
  UserRole,
  UserStatus,
  type MemberDto,
} from '@community-finance/shared';
import { useAuth } from '@/lib/auth-context';
import { formatDate, initials } from '@/lib/utils';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { PaginationControls } from '@/components/shared/pagination-controls';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useChangeMemberStatus,
  useDeleteMember,
  useMembers,
  useResetMemberPassword,
} from '@/features/members/api';
import { BulkImportDialog } from '@/features/members/bulk-import-dialog';
import { MemberFormDialog } from '@/features/members/member-form-dialog';
import { MemberStatusBadge } from '@/features/members/status-badge';

function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function MembersPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.ADMIN;

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<UserStatus | 'ALL'>('ALL');
  const debouncedSearch = useDebounced(search);

  const { data, isLoading } = useMembers({ page, search: debouncedSearch, status });
  const members = data?.data ?? [];
  const meta = data?.meta;

  const [formOpen, setFormOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editing, setEditing] = useState<MemberDto | null>(null);
  const [deleting, setDeleting] = useState<MemberDto | null>(null);

  return (
    <div>
      <PageHeader
        title="Members"
        description={meta ? `${meta.total} members in your community` : undefined}
        actions={
          isAdmin && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setBulkOpen(true)}>
                <FileUp />
                Bulk import
              </Button>
              <Button
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus />
                Add member
              </Button>
            </div>
          )
        }
      />

      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="relative min-w-52 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or phone…"
                className="pl-9"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v as UserStatus | 'ALL');
                setPage(1);
              }}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value={UserStatus.ACTIVE}>Active</SelectItem>
                <SelectItem value={UserStatus.INACTIVE}>Inactive</SelectItem>
                <SelectItem value={UserStatus.SUSPENDED}>Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : members.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No members found"
              description={
                debouncedSearch || status !== 'ALL'
                  ? 'Try adjusting your search or filters.'
                  : 'Add your first community member to get started.'
              }
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Member since</TableHead>
                    {isAdmin && <TableHead className="w-10" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m) => (
                    <MemberRow
                      key={m.id}
                      member={m}
                      isAdmin={isAdmin}
                      onEdit={() => {
                        setEditing(m);
                        setFormOpen(true);
                      }}
                      onDelete={() => setDeleting(m)}
                    />
                  ))}
                </TableBody>
              </Table>
              {meta && <PaginationControls meta={meta} onPageChange={setPage} />}
            </>
          )}
        </CardContent>
      </Card>

      <MemberFormDialog open={formOpen} onOpenChange={setFormOpen} member={editing} />
      <BulkImportDialog open={bulkOpen} onOpenChange={setBulkOpen} />
      <DeleteMemberDialog member={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}

function MemberRow({
  member,
  isAdmin,
  onEdit,
  onDelete,
}: {
  member: MemberDto;
  isAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const statusMutation = useChangeMemberStatus(member.id);
  const resetMutation = useResetMemberPassword(member.id);

  return (
    <TableRow>
      <TableCell>
        <Link href={`/members/${member.id}`} className="flex items-center gap-2.5 hover:underline">
          <Avatar className="h-7 w-7">
            {member.profileImage && <AvatarImage src={member.profileImage} alt="" />}
            <AvatarFallback>{initials(member.name)}</AvatarFallback>
          </Avatar>
          <span className="font-medium">{member.name}</span>
        </Link>
      </TableCell>
      <TableCell className="tabular-nums text-muted-foreground">{member.phone}</TableCell>
      <TableCell>
        <MemberStatusBadge status={member.status} />
      </TableCell>
      <TableCell className="capitalize text-muted-foreground">
        {member.role.replace('_', ' ').toLowerCase()}
      </TableCell>
      <TableCell className="text-muted-foreground">{formatDate(member.memberSince)}</TableCell>
      {isAdmin && (
        <TableCell>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Member actions">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  const pw = generatePassword();
                  if (
                    window.confirm(
                      `Reset password for ${member.name}?\n\nNew password: ${pw}\n\nCopy it now — it will not be shown again.`
                    )
                  ) {
                    resetMutation.mutate(pw);
                  }
                }}
              >
                <KeyRound />
                Reset password
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {member.status !== 'ACTIVE' && (
                <DropdownMenuItem
                  onClick={() => statusMutation.mutate({ status: UserStatus.ACTIVE })}
                >
                  <UserCheck />
                  Activate
                </DropdownMenuItem>
              )}
              {member.status !== 'INACTIVE' && (
                <DropdownMenuItem
                  onClick={() => statusMutation.mutate({ status: UserStatus.INACTIVE })}
                >
                  <UserMinus />
                  Mark inactive
                </DropdownMenuItem>
              )}
              {member.status !== 'SUSPENDED' && (
                <DropdownMenuItem
                  onClick={() => statusMutation.mutate({ status: UserStatus.SUSPENDED })}
                >
                  <UserX />
                  Suspend
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                <Trash2 />
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      )}
    </TableRow>
  );
}

function DeleteMemberDialog({
  member,
  onClose,
}: {
  member: MemberDto | null;
  onClose: () => void;
}) {
  const deleteMutation = useDeleteMember();
  return (
    <AlertDialog open={Boolean(member)} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove {member?.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            The member loses access immediately. Their payment history is preserved for
            financial records. Event budget splits recalculate automatically.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => {
              if (member) deleteMutation.mutate(member.id);
              onClose();
            }}
          >
            Remove member
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let pw = '';
  const array = new Uint32Array(10);
  crypto.getRandomValues(array);
  for (const n of array) pw += chars[n % chars.length];
  return pw;
}
