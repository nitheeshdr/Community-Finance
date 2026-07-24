import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/utils/money.dart';
import '../../shared/models/payment.dart';
import '../../shared/widgets/async_view.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/status_chip.dart';
import 'data/payments_repository.dart';

class PaymentsScreen extends ConsumerWidget {
  const PaymentsScreen({super.key});

  Future<void> _pay(BuildContext context, WidgetRef ref, String paymentId) async {
    final messenger = ScaffoldMessenger.of(context);
    try {
      final url = await ref.read(paymentsRepositoryProvider).payLink(paymentId);
      await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
      ref.invalidate(myPaymentsProvider);
    } catch (e) {
      messenger.showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final payments = ref.watch(myPaymentsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Payments')),
      body: RefreshIndicator(
        onRefresh: () async => ref.refresh(myPaymentsProvider.future),
        child: AsyncView<List<Payment>>(
          value: payments,
          onRetry: () => ref.invalidate(myPaymentsProvider),
          data: (list) {
            if (list.isEmpty) {
              return ListView(
                children: const [
                  SizedBox(height: 80),
                  EmptyState(
                    icon: Icons.credit_card_outlined,
                    title: 'No payments yet',
                    message: 'Your subscription and event payments will appear here.',
                  ),
                ],
              );
            }
            return ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
              itemCount: list.length,
              separatorBuilder: (_, _) => const SizedBox(height: 8),
              itemBuilder: (context, i) => _PaymentCard(
                payment: list[i],
                onPay: () => _pay(context, ref, list[i].id),
              ),
            );
          },
        ),
      ),
    );
  }
}

class _PaymentCard extends StatelessWidget {
  const _PaymentCard({required this.payment, required this.onPay});
  final Payment payment;
  final VoidCallback onPay;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final title = payment.eventName ??
        (payment.period != null ? 'Subscription · ${payment.period}' : _title(payment.type));

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(child: Text(title, style: theme.textTheme.titleMedium)),
                StatusChip(payment.status),
              ],
            ),
            const SizedBox(height: 4),
            Text(Money.fromPaise(payment.amount),
                style: theme.textTheme.headlineSmall
                    ?.copyWith(fontWeight: FontWeight.w800)),
            if (payment.isPending) ...[
              const SizedBox(height: 12),
              FilledButton.icon(
                onPressed: onPay,
                icon: const Icon(Icons.payment),
                label: const Text('Pay now'),
              ),
            ],
          ],
        ),
      ),
    );
  }

  static String _title(String type) => switch (type) {
        'SUBSCRIPTION' => 'Monthly subscription',
        'EVENT_CONTRIBUTION' => 'Event contribution',
        'DONATION' => 'Donation',
        'SPONSORSHIP' => 'Sponsorship',
        _ => 'Payment',
      };
}
