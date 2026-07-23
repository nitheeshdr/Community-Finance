'use client';

import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Plus, Shield, Trash2, UserX, UserCheck } from 'lucide-react';
import {
  UserRole,
  UserStatus,
  type ApiSuccess,
  type MemberDto,
} from '@community-finance/shared';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { formatDate, initials } from '@/lib/utils';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useChangeMemberStatus, useDeleteMember } from '@/features/members/api';
import { MemberFormDialog } from '@/features/members/member-form-dialog';
import { MemberStatusBadge } from '@/features/members/status-badge';

/** Super-admin-only management of community admins. */
export default function AdminsPage() {
  const { user } = useAuth();
  const [formOpen, setFormOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['members', 'admins'],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccess<MemberDto[]>>('/members', {
        params: { page: 1, limit: 50, role: UserRole.ADMIN },
      });
      return res.data.data;
    },
  });
  const admins = data ?? [];

  if (user?.role !== UserRole.SUPER_ADMIN) {
    return (
      <EmptyState
        icon={Shield}
        title="Super admin only"
        description="Only the super admin can manage admins."
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Admins"
        description="Admins can manage members, events, expenses, and approvals"
        actions={
          <Button onClick={() => setFormOpen(true)}>
            <Plus />
            Create admin
          </Button>
        }
      />

      <Card>
        <CardContent className="p-4">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : admins.length === 0 ? (
            <EmptyState
              icon={Shield}
              title="No admins yet"
              description="Create an admin to share the management workload."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Admin</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Since</TableHead>
                  <TableHead className="w-32" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map((admin) => (
                  <AdminRow key={admin.id} admin={admin} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* MemberFormDialog with role selector (visible to super admin). */}
      <MemberFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}

function AdminRow({ admin }: { admin: MemberDto }) {
  const statusMutation = useChangeMemberStatus(admin.id);
  const deleteMutation = useDeleteMember();
  const suspended = admin.status === UserStatus.SUSPENDED;

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2.5">
          <Avatar className="h-7 w-7">
            <AvatarFallback>{initials(admin.name)}</AvatarFallback>
          </Avatar>
          <span className="font-medium">{admin.name}</span>
        </div>
      </TableCell>
      <TableCell className="tabular-nums text-muted-foreground">{admin.phone}</TableCell>
      <TableCell>
        <MemberStatusBadge status={admin.status} />
      </TableCell>
      <TableCell className="text-muted-foreground">{formatDate(admin.memberSince)}</TableCell>
      <TableCell>
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              statusMutation.mutate({
                status: suspended ? UserStatus.ACTIVE : UserStatus.SUSPENDED,
              })
            }
          >
            {suspended ? <UserCheck /> : <UserX />}
            {suspended ? 'Activate' : 'Suspend'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => {
              if (window.confirm(`Remove admin ${admin.name}?`)) {
                deleteMutation.mutate(admin.id);
              }
            }}
          >
            <Trash2 />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
