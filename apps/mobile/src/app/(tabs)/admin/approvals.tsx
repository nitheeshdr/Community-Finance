import { Alert, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ExpenseDto, PaymentDto } from '@community-finance/shared';
import {
  usePendingExpenses,
  usePendingPayments,
  useReviewExpense,
  useReviewPayment,
} from '@/lib/admin';
import { apiErrorMessage } from '@/lib/api';
import { formatDate, inr, periodLabel } from '@/lib/format';
import { Card, EmptyState, SectionTitle } from '@/components/ui';

export default function ApprovalsScreen() {
  const { data: payments, refetch: rp, isRefetching: r1 } = usePendingPayments();
  const { data: expenses, refetch: re, isRefetching: r2 } = usePendingExpenses();
  const nothing = (payments?.length ?? 0) === 0 && (expenses?.length ?? 0) === 0;

  return (
    <ScrollView
      className="flex-1 bg-surface"
      contentContainerClassName="px-4 pb-8"
      refreshControl={
        <RefreshControl
          refreshing={r1 || r2}
          onRefresh={() => {
            void rp();
            void re();
          }}
        />
      }
    >
      {nothing && (
        <View className="pt-6">
          <EmptyState
            icon="check-all"
            title="All caught up"
            description="No payments or expenses are waiting for approval."
          />
        </View>
      )}

      {(payments?.length ?? 0) > 0 && (
        <>
          <SectionTitle>Payments ({payments!.length})</SectionTitle>
          {payments!.map((p) => (
            <PaymentApproval key={p.id} payment={p} />
          ))}
        </>
      )}

      {(expenses?.length ?? 0) > 0 && (
        <>
          <SectionTitle>Expenses ({expenses!.length})</SectionTitle>
          {expenses!.map((x) => (
            <ExpenseApproval key={x.id} expense={x} />
          ))}
        </>
      )}
    </ScrollView>
  );
}

function PaymentApproval({ payment }: { payment: PaymentDto }) {
  const review = useReviewPayment();
  const busy = review.isPending;

  function act(action: 'APPROVE' | 'REJECT') {
    review.mutate(
      { id: payment.id, action },
      { onError: (err) => Alert.alert('Failed', apiErrorMessage(err)) }
    );
  }

  return (
    <Card className="mb-2">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-2">
          <Text className="text-sm font-semibold text-on-surface">{payment.memberName}</Text>
          <Text className="mt-0.5 text-xs text-on-surface-variant">
            {payment.type === 'SUBSCRIPTION'
              ? `Subscription · ${periodLabel(payment.period)}`
              : (payment.eventName ?? payment.type.replace(/_/g, ' ').toLowerCase())}{' '}
            · {payment.method.toLowerCase()}
            {payment.upiReference ? ` · ${payment.upiReference}` : ''}
          </Text>
        </View>
        <Text className="text-base font-bold text-on-surface tabular-nums">
          {inr(payment.amount)}
        </Text>
      </View>
      <View className="mt-3 flex-row gap-2">
        <Button mode="contained" compact icon="check" loading={busy} onPress={() => act('APPROVE')} style={{ flex: 1 }}>
          Approve
        </Button>
        <Button mode="outlined" compact icon="close" disabled={busy} onPress={() => act('REJECT')} style={{ flex: 1 }}>
          Reject
        </Button>
      </View>
    </Card>
  );
}

function ExpenseApproval({ expense }: { expense: ExpenseDto }) {
  const review = useReviewExpense();
  const busy = review.isPending;

  function act(action: 'APPROVE' | 'REJECT') {
    review.mutate(
      { id: expense.id, action },
      { onError: (err) => Alert.alert('Failed', apiErrorMessage(err)) }
    );
  }

  return (
    <Card className="mb-2">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-2">
          <Text className="text-sm font-semibold text-on-surface">{expense.name}</Text>
          <Text className="mt-0.5 text-xs text-on-surface-variant">
            {expense.eventName ?? '—'} · {expense.category}
            {expense.vendor ? ` · ${expense.vendor}` : ''} · {formatDate(expense.expenseDate)}
          </Text>
        </View>
        <Text className="text-base font-bold text-on-surface tabular-nums">
          {inr(expense.amount)}
        </Text>
      </View>
      {expense.bills.length > 0 && (
        <View className="mt-1 flex-row items-center gap-1">
          <MaterialCommunityIcons name="paperclip" size={12} color="#777680" />
          <Text className="text-xs text-on-surface-variant">
            {expense.bills.length} bill{expense.bills.length === 1 ? '' : 's'} attached
          </Text>
        </View>
      )}
      <View className="mt-3 flex-row gap-2">
        <Button mode="contained" compact icon="check" loading={busy} onPress={() => act('APPROVE')} style={{ flex: 1 }}>
          Approve
        </Button>
        <Button mode="outlined" compact icon="close" disabled={busy} onPress={() => act('REJECT')} style={{ flex: 1 }}>
          Reject
        </Button>
      </View>
    </Card>
  );
}
