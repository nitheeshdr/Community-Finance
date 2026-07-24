import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/config/env.dart';
import '../../shared/widgets/settings_group.dart';
import '../about/about_screen.dart';
import '../auth/presentation/auth_controller.dart';
import '../notifications/notifications_screen.dart';

/// Settings screen in the Material 3 Expressive style of modern Google apps:
/// a profile header, grouped section cards (no dividers), expressive type,
/// generous spacing, and a tonal destructive action.
class MoreScreen extends ConsumerWidget {
  const MoreScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final cs = theme.colorScheme;
    final user = ref.watch(authControllerProvider).user;
    final initial = (user?.name.isNotEmpty ?? false) ? user!.name[0].toUpperCase() : '?';

    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
        children: [
          Card(
            color: cs.surfaceContainerHigh,
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 30,
                    backgroundColor: cs.primaryContainer,
                    child: Text(
                      initial,
                      style: theme.textTheme.headlineSmall
                          ?.copyWith(color: cs.onPrimaryContainer, fontWeight: FontWeight.w800),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(user?.name ?? 'Member', style: theme.textTheme.titleLarge),
                        const SizedBox(height: 2),
                        Text(user?.phone ?? '',
                            style: theme.textTheme.bodyMedium
                                ?.copyWith(color: cs.onSurfaceVariant)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 28),
          const SectionLabel('General'),
          GroupCard(
            children: [
              GroupTile(
                icon: Icons.notifications_outlined,
                title: 'Notifications',
                onTap: () => Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const NotificationsScreen()),
                ),
              ),
              GroupTile(
                icon: Icons.new_releases_outlined,
                title: "What's new",
                trailing: const Icon(Icons.open_in_new, size: 18),
                onTap: () => launchUrl(
                  Uri.parse('${Env.webOrigin}/changelog'),
                  mode: LaunchMode.externalApplication,
                ),
              ),
              GroupTile(
                icon: Icons.info_outline,
                title: 'About',
                onTap: () => Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const AboutScreen()),
                ),
              ),
            ],
          ),
          const SizedBox(height: 28),
          const SectionLabel('Account'),
          FilledButton.tonalIcon(
            onPressed: () => ref.read(authControllerProvider.notifier).logout(),
            icon: const Icon(Icons.logout),
            label: const Text('Sign out'),
            style: FilledButton.styleFrom(
              minimumSize: const Size.fromHeight(56),
              backgroundColor: cs.errorContainer,
              foregroundColor: cs.onErrorContainer,
            ),
          ),
        ],
      ),
    );
  }
}
