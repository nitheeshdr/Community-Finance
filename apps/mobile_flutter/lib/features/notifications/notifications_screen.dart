import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../shared/models/app_notification.dart';
import '../../shared/widgets/async_view.dart';
import '../../shared/widgets/empty_state.dart';
import 'data/notifications_repository.dart';

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final items = ref.watch(notificationsProvider);
    final cs = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(title: const Text('Notifications')),
      body: RefreshIndicator(
        onRefresh: () async => ref.refresh(notificationsProvider.future),
        child: AsyncView<List<AppNotification>>(
          value: items,
          onRetry: () => ref.invalidate(notificationsProvider),
          data: (list) {
            if (list.isEmpty) {
              return ListView(
                children: const [
                  SizedBox(height: 80),
                  EmptyState(
                    icon: Icons.notifications_none,
                    title: 'All caught up',
                    message: 'You have no notifications right now.',
                  ),
                ],
              );
            }
            return ListView.builder(
              padding: const EdgeInsets.symmetric(vertical: 8),
              itemCount: list.length,
              itemBuilder: (context, i) {
                final n = list[i];
                return ListTile(
                  leading: CircleAvatar(
                    backgroundColor: n.read ? cs.surfaceContainerHighest : cs.primaryContainer,
                    child: Icon(Icons.notifications_outlined,
                        color: n.read ? cs.onSurfaceVariant : cs.onPrimaryContainer),
                  ),
                  title: Text(n.title,
                      style: TextStyle(
                          fontWeight: n.read ? FontWeight.w500 : FontWeight.w700)),
                  subtitle: Text(n.body),
                  isThreeLine: n.body.length > 40,
                );
              },
            );
          },
        ),
      ),
    );
  }
}
