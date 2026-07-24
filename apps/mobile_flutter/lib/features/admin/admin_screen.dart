import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../auth/presentation/auth_controller.dart';

class AdminScreen extends ConsumerWidget {
  const AdminScreen({super.key});

  static const _actions = <({IconData icon, String label})>[
    (icon: Icons.group_outlined, label: 'Members'),
    (icon: Icons.calendar_month_outlined, label: 'Monthly dues'),
    (icon: Icons.event_available_outlined, label: 'Create event'),
    (icon: Icons.payments_outlined, label: 'Record payment'),
    (icon: Icons.receipt_long_outlined, label: 'Add expense'),
    (icon: Icons.savings_outlined, label: 'Record income'),
    (icon: Icons.bar_chart_outlined, label: 'Reports'),
    (icon: Icons.campaign_outlined, label: 'Announce'),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final cs = theme.colorScheme;
    final user = ref.watch(authControllerProvider).user;

    return Scaffold(
      appBar: AppBar(title: const Text('Admin')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        children: [
          Text(user?.role.value == 'SUPER_ADMIN' ? 'Super admin' : 'Admin',
              style: theme.textTheme.bodyMedium?.copyWith(color: cs.onSurfaceVariant)),
          const SizedBox(height: 12),
          Card(
            color: cs.primaryContainer,
            child: ListTile(
              leading: Icon(Icons.verified_outlined, color: cs.onPrimaryContainer),
              title: Text('Pending approvals',
                  style: TextStyle(color: cs.onPrimaryContainer, fontWeight: FontWeight.w600)),
              subtitle: Text('Review payments and expenses awaiting approval',
                  style: TextStyle(color: cs.onPrimaryContainer)),
              trailing: Icon(Icons.chevron_right, color: cs.onPrimaryContainer),
              onTap: () {},
            ),
          ),
          const SizedBox(height: 16),
          Text('Quick actions', style: theme.textTheme.titleMedium),
          const SizedBox(height: 12),
          GridView.count(
            crossAxisCount: 3,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 0.95,
            children: [
              for (final a in _actions)
                Card(
                  color: cs.surfaceContainerHigh,
                  child: InkWell(
                    borderRadius: BorderRadius.circular(24),
                    onTap: () {},
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        CircleAvatar(
                          radius: 22,
                          backgroundColor: cs.primaryContainer,
                          child: Icon(a.icon, color: cs.onPrimaryContainer, size: 22),
                        ),
                        const SizedBox(height: 8),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 4),
                          child: Text(a.label,
                              textAlign: TextAlign.center, style: theme.textTheme.labelMedium),
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
