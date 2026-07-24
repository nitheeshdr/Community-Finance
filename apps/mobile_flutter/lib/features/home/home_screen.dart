import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/utils/money.dart';
import '../../shared/models/dashboard_stats.dart';
import '../../shared/widgets/app_loader.dart';
import '../../shared/widgets/async_view.dart';
import '../auth/presentation/auth_controller.dart';
import 'data/dashboard_repository.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authControllerProvider).user;
    final stats = ref.watch(dashboardProvider);
    final theme = Theme.of(context);
    final cs = theme.colorScheme;

    return Scaffold(
      appBar: AppBar(title: const Text('Community Finance')),
      body: RefreshIndicator(
        onRefresh: () async => ref.refresh(dashboardProvider.future),
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
          children: [
            Text('Hello, ${user?.name ?? 'there'}', style: theme.textTheme.headlineMedium),
            const SizedBox(height: 4),
            Text(
              'Your community at a glance.',
              style: theme.textTheme.bodyMedium?.copyWith(color: cs.onSurfaceVariant),
            ),
            const SizedBox(height: 20),
            AsyncView<DashboardStats>(
              value: stats,
              loading: const Padding(
                padding: EdgeInsets.only(top: 48),
                child: AppLoader(label: 'Loading dashboard…'),
              ),
              data: (s) => _Dashboard(stats: s),
            ),
          ],
        ),
      ),
    );
  }
}

class _Dashboard extends StatelessWidget {
  const _Dashboard({required this.stats});
  final DashboardStats stats;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cs = theme.colorScheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: _StatTile(
                label: 'Balance',
                value: Money.fromPaise(stats.currentBalance),
                icon: Icons.account_balance_wallet_outlined,
                container: cs.primaryContainer,
                onContainer: cs.onPrimaryContainer,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _StatTile(
                label: 'This month',
                value: Money.fromPaise(stats.monthlyCollection),
                icon: Icons.trending_up,
                container: cs.secondaryContainer,
                onContainer: cs.onSecondaryContainer,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _StatTile(
                label: 'Pending',
                value: Money.fromPaise(stats.pendingCollection),
                icon: Icons.hourglass_bottom,
                container: cs.tertiaryContainer,
                onContainer: cs.onTertiaryContainer,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _StatTile(
                label: 'Paid members',
                value: '${stats.paidMembersThisMonth}/${stats.activeMembers}',
                icon: Icons.groups_outlined,
                container: cs.surfaceContainerHighest,
                onContainer: cs.onSurface,
              ),
            ),
          ],
        ),
        const SizedBox(height: 24),
        if (stats.upcomingEvents.isNotEmpty) ...[
          Text('Upcoming events', style: theme.textTheme.titleMedium),
          const SizedBox(height: 8),
          for (final e in stats.upcomingEvents)
            Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                leading: CircleAvatar(
                  backgroundColor: cs.primaryContainer,
                  child: Icon(Icons.event, color: cs.onPrimaryContainer),
                ),
                title: Text(e.name),
                subtitle: Text(e.date.split('T').first),
                trailing: Text(Money.fromPaise(e.budget),
                    style: theme.textTheme.labelLarge),
              ),
            ),
        ],
      ],
    );
  }
}

class _StatTile extends StatelessWidget {
  const _StatTile({
    required this.label,
    required this.value,
    required this.icon,
    required this.container,
    required this.onContainer,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color container;
  final Color onContainer;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: container, borderRadius: BorderRadius.circular(24)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: onContainer, size: 22),
          const SizedBox(height: 12),
          Text(value,
              style: Theme.of(context)
                  .textTheme
                  .titleLarge
                  ?.copyWith(color: onContainer, fontWeight: FontWeight.w800)),
          Text(label, style: TextStyle(color: onContainer)),
        ],
      ),
    );
  }
}
