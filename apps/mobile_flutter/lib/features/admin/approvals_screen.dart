import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/utils/money.dart';
import '../../shared/models/expense.dart';
import '../../shared/models/payment.dart';
import '../../shared/widgets/async_view.dart';
import '../../shared/widgets/settings_group.dart';
import 'data/admin_repository.dart';

class ApprovalsScreen extends ConsumerWidget {
  const ApprovalsScreen({super.key});

  Future<void> _run(BuildContext context, WidgetRef ref, Future<void> Function() action) async {
    final messenger = ScaffoldMessenger.of(context);
    try {
      await action();
      ref.invalidate(pendingPaymentsProvider);
      ref.invalidate(pendingExpensesProvider);
    } catch (e) {
      messenger.showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final payments = ref.watch(pendingPaymentsProvider);
    final expenses = ref.watch(pendingExpensesProvider);
    final repo = ref.read(adminRepositoryProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Approvals')),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(pendingPaymentsProvider);
          ref.invalidate(pendingExpensesProvider);
        },
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
          children: [
            const SectionLabel('Pending payments'),
            AsyncView<List<Payment>>(
              value: payments,
              onRetry: () => ref.invalidate(pendingPaymentsProvider),
              data: (list) => list.isEmpty
                  ? const _NoneCard('No payments awaiting approval')
                  : Column(
                      children: [
                        for (final p in list)
                          _ReviewCard(
                            title: p.memberName ?? 'Member',
                            subtitle: '${p.method} · ${p.period ?? p.type}',
                            amount: p.amount,
                            onApprove: () => _run(context, ref, () => repo.reviewPayment(p.id, 'APPROVE')),
                            onReject: () => _run(context, ref, () => repo.reviewPayment(p.id, 'REJECT')),
                          ),
                      ],
                    ),
            ),
            const SizedBox(height: 24),
            const SectionLabel('Pending expenses'),
            AsyncView<List<Expense>>(
              value: expenses,
              onRetry: () => ref.invalidate(pendingExpensesProvider),
              data: (list) => list.isEmpty
                  ? const _NoneCard('No expenses awaiting approval')
                  : Column(
                      children: [
                        for (final e in list)
                          _ReviewCard(
                            title: e.name,
                            subtitle: e.eventName ?? e.category ?? 'Expense',
                            amount: e.amount,
                            onApprove: () => _run(context, ref, () => repo.reviewExpense(e.id, 'APPROVE')),
                            onReject: () => _run(context, ref, () => repo.reviewExpense(e.id, 'REJECT')),
                          ),
                      ],
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class _NoneCard extends StatelessWidget {
  const _NoneCard(this.message);
  final String message;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Row(
          children: [
            Icon(Icons.check_circle_outline, color: Theme.of(context).colorScheme.tertiary),
            const SizedBox(width: 12),
            Expanded(child: Text(message, style: Theme.of(context).textTheme.bodyMedium)),
          ],
        ),
      ),
    );
  }
}

class _ReviewCard extends StatelessWidget {
  const _ReviewCard({
    required this.title,
    required this.subtitle,
    required this.amount,
    required this.onApprove,
    required this.onReject,
  });

  final String title;
  final String subtitle;
  final int amount;
  final VoidCallback onApprove;
  final VoidCallback onReject;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(child: Text(title, style: theme.textTheme.titleMedium)),
                Text(Money.fromPaise(amount),
                    style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800)),
              ],
            ),
            const SizedBox(height: 2),
            Text(subtitle,
                style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: onReject,
                    icon: const Icon(Icons.close),
                    label: const Text('Reject'),
                    style: OutlinedButton.styleFrom(foregroundColor: theme.colorScheme.error),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: FilledButton.tonalIcon(
                    onPressed: onApprove,
                    icon: const Icon(Icons.check),
                    label: const Text('Approve'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
