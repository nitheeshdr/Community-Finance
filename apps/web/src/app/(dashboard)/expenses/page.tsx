'use client';

import { useState } from 'react';
import {
  Check,
  FileText,
  MoreHorizontal,
  Pencil,
  Plus,
  Receipt,
  Trash2,
  X,
} from 'lucide-react';
import {
  ExpenseStatus,
  UserRole,
  type ExpenseDto,
} from '@community-finance/shared';
import { useAuth } from '@/lib/auth-context';
import { formatDate, inr } from '@/lib/utils';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { PaginationControls } from '@/components/shared/pagination-controls';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  useDeleteExpense,
  useExpenses,
  useReviewExpense,
} from '@/features/expenses/api';
import { ExpenseFormDialog } from '@/features/expenses/expense-form-dialog';

const STATUS_VARIANT: Record<ExpenseStatus, 'success' | 'warning' | 'destructive'> = {
  [ExpenseStatus.APPROVED]: 'success',
  [ExpenseStatus.PENDING]: 'warning',
  [ExpenseStatus.REJECTED]: 'destructive',
};

export default function ExpensesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.ADMIN;

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<ExpenseStatus | 'ALL'>('ALL');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseDto | null>(null);

  const { data, isLoading } = useExpenses({ page, status });
  const expenses = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div>
      <PageHeader
        title="Expenses"
        description="Every expense belongs to an event and requires approval"
        actions={
          isAdmin && (
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus />
              Add expense
            </Button>
          )
        }
      />

      <Card>
        <CardContent className="p-4">
          <div className="mb-4">
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v as ExpenseStatus | 'ALL');
                setPage(1);
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value={ExpenseStatus.PENDING}>Pending</SelectItem>
                <SelectItem value={ExpenseStatus.APPROVED}>Approved</SelectItem>
                <SelectItem value={ExpenseStatus.REJECTED}>Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : expenses.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No expenses found"
              description="Expenses recorded against events will appear here with their bills."
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Expense</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Bills</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    {isAdmin && <TableHead className="w-10" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((x) => (
                    <ExpenseRow
                      key={x.id}
                      expense={x}
                      isAdmin={isAdmin}
                      currentUserId={user?.id}
                      isSuperAdmin={user?.role === UserRole.SUPER_ADMIN}
                      onEdit={() => {
                        setEditing(x);
                        setFormOpen(true);
                      }}
                    />
                  ))}
                </TableBody>
              </Table>
              {meta && <PaginationControls meta={meta} onPageChange={setPage} />}
            </>
          )}
        </CardContent>
      </Card>

      <ExpenseFormDialog open={formOpen} onOpenChange={setFormOpen} expense={editing} />
    </div>
  );
}

function ExpenseRow({
  expense,
  isAdmin,
  isSuperAdmin,
  currentUserId,
  onEdit,
}: {
  expense: ExpenseDto;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  currentUserId?: string;
  onEdit: () => void;
}) {
  const reviewMutation = useReviewExpense();
  const deleteMutation = useDeleteExpense();
  const canReview =
    isAdmin &&
    expense.status === ExpenseStatus.PENDING &&
    (isSuperAdmin || expense.createdBy !== currentUserId);

  return (
    <TableRow>
      <TableCell>
        <p className="font-medium">{expense.name}</p>
        {expense.vendor && <p className="text-xs text-muted-foreground">{expense.vendor}</p>}
      </TableCell>
      <TableCell className="text-muted-foreground">{expense.eventName ?? '—'}</TableCell>
      <TableCell className="text-muted-foreground">{expense.category}</TableCell>
      <TableCell className="text-right font-medium tabular-nums">{inr(expense.amount)}</TableCell>
      <TableCell>
        {expense.bills.length > 0 ? (
          <div className="flex gap-1">
            {expense.bills.map((url, i) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-0.5 text-xs text-primary hover:underline"
              >
                <FileText className="h-3 w-3" />
                {i + 1}
              </a>
            ))}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell>
        <Badge variant={STATUS_VARIANT[expense.status]} className="capitalize">
          {expense.status.toLowerCase()}
        </Badge>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {formatDate(expense.expenseDate ?? expense.createdAt)}
      </TableCell>
      {isAdmin && (
        <TableCell>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Expense actions">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canReview && (
                <>
                  <DropdownMenuItem
                    onClick={() => reviewMutation.mutate({ id: expense.id, action: 'APPROVE' })}
                  >
                    <Check />
                    Approve
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => {
                      const reason = window.prompt('Reason for rejection (optional)') ?? undefined;
                      reviewMutation.mutate({ id: expense.id, action: 'REJECT', reason });
                    }}
                  >
                    <X />
                    Reject
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {expense.status !== ExpenseStatus.APPROVED && (
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil />
                  Edit
                </DropdownMenuItem>
              )}
              {(expense.status !== ExpenseStatus.APPROVED || isSuperAdmin) && (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => {
                    if (window.confirm(`Delete expense "${expense.name}"?`)) {
                      deleteMutation.mutate(expense.id);
                    }
                  }}
                >
                  <Trash2 />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      )}
    </TableRow>
  );
}
