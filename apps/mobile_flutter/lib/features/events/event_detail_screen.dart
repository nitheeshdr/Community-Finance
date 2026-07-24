import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/utils/money.dart';
import '../../shared/models/event.dart';
import '../../shared/widgets/async_view.dart';
import '../../shared/widgets/status_chip.dart';
import 'data/events_repository.dart';

/// Event detail — summary, funding, and the per-member split table.
class EventDetailScreen extends ConsumerWidget {
  const EventDetailScreen({super.key, required this.eventId});
  final String eventId;

  Future<void> _payShare(BuildContext context, WidgetRef ref) async {
    final messenger = ScaffoldMessenger.of(context);
    try {
      final url = await ref.read(eventsRepositoryProvider).payShare(eventId);
      await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
      ref.invalidate(eventSplitsProvider(eventId));
    } catch (e) {
      messenger.showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detail = ref.watch(eventDetailProvider(eventId));
    final splits = ref.watch(eventSplitsProvider(eventId));
    final theme = Theme.of(context);
    final cs = theme.colorScheme;

    return Scaffold(
      appBar: AppBar(title: const Text('Event')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _payShare(context, ref),
        icon: const Icon(Icons.payment),
        label: const Text('Pay my share'),
      ),
      body: AsyncView<CommunityEvent>(
        value: detail,
        onRetry: () => ref.invalidate(eventDetailProvider(eventId)),
        data: (e) => ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 96),
          children: [
            Row(
              children: [
                Expanded(child: Text(e.name, style: theme.textTheme.headlineSmall)),
                StatusChip(e.status),
              ],
            ),
            const SizedBox(height: 4),
            Text(e.date.split('T').first,
                style: theme.textTheme.bodyMedium?.copyWith(color: cs.onSurfaceVariant)),
            if (e.description != null && e.description!.isNotEmpty) ...[
              const SizedBox(height: 12),
              Text(e.description!, style: theme.textTheme.bodyMedium),
            ],
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    _row(context, 'Budget', Money.fromPaise(e.budget)),
                    _row(context, 'Collected', Money.fromPaise(e.collectedAmount)),
                    _row(context, 'Spent', Money.fromPaise(e.spentAmount)),
                    _row(context, 'Per member', Money.fromPaise(e.perHeadAmount)),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text('Member split', style: theme.textTheme.titleMedium),
            const SizedBox(height: 8),
            AsyncView<List<EventSplit>>(
              value: splits,
              data: (list) => Column(
                children: [
                  for (final s in list)
                    Card(
                      margin: const EdgeInsets.only(bottom: 8),
                      child: ListTile(
                        title: Text(s.memberName ?? 'Member'),
                        subtitle: Text(
                            'Paid ${Money.fromPaise(s.paidAmount)} of ${Money.fromPaise(s.splitAmount)}'),
                        trailing: StatusChip(s.status),
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _row(BuildContext context, String label, String value) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label,
              style: theme.textTheme.bodyMedium
                  ?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
          Text(value, style: theme.textTheme.titleMedium),
        ],
      ),
    );
  }
}
