import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../shared/widgets/empty_state.dart';
import '../auth/presentation/auth_controller.dart';
import 'announcement_screen.dart';
import 'approvals_screen.dart';
import 'create_event_screen.dart';
import 'data/admin_repository.dart';
import 'members_screen.dart';
import 'record_payment_screen.dart';

class AdminScreen extends ConsumerWidget {
  const AdminScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final cs = theme.colorScheme;
    final user = ref.watch(authControllerProvider).user;
    final pending = ref.watch(pendingPaymentsProvider).valueOrNull?.length ?? 0;

    void go(Widget screen) => Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => screen),
        );

    final actions = <({IconData icon, String label, VoidCallback onTap})>[
      (icon: Icons.group_outlined, label: 'Members', onTap: () => go(const MembersScreen())),
      (icon: Icons.calendar_month_outlined, label: 'Monthly dues', onTap: () => go(const _ComingSoon('Monthly dues'))),
      (icon: Icons.event_available_outlined, label: 'Create event', onTap: () => go(const CreateEventScreen())),
      (icon: Icons.payments_outlined, label: 'Record payment', onTap: () => go(const RecordPaymentScreen())),
      (icon: Icons.receipt_long_outlined, label: 'Add expense', onTap: () => go(const _ComingSoon('Add expense'))),
      (icon: Icons.savings_outlined, label: 'Record income', onTap: () => go(const _ComingSoon('Record income'))),
      (icon: Icons.bar_chart_outlined, label: 'Reports', onTap: () => go(const _ComingSoon('Reports'))),
      (icon: Icons.campaign_outlined, label: 'Announce', onTap: () => go(const AnnouncementScreen())),
    ];

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
                  style: TextStyle(color: cs.onPrimaryContainer, fontWeight: FontWeight.w700)),
              subtitle: Text('Review payments and expenses',
                  style: TextStyle(color: cs.onPrimaryContainer)),
              trailing: pending > 0
                  ? Badge(label: Text('$pending'), child: Icon(Icons.chevron_right, color: cs.onPrimaryContainer))
                  : Icon(Icons.chevron_right, color: cs.onPrimaryContainer),
              onTap: () => go(const ApprovalsScreen()),
            ),
          ),
          const SizedBox(height: 20),
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
              for (final a in actions)
                Card(
                  color: cs.surfaceContainerHigh,
                  child: InkWell(
                    borderRadius: BorderRadius.circular(24),
                    onTap: a.onTap,
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

class _ComingSoon extends StatelessWidget {
  const _ComingSoon(this.title);
  final String title;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: EmptyState(
        icon: Icons.construction_outlined,
        title: title,
        message: 'This admin tool is being migrated to Flutter next.',
      ),
    );
  }
}
