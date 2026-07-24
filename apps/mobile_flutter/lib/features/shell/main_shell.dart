import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../auth/presentation/auth_controller.dart';
import '../home/home_screen.dart';
import '../payments/payments_screen.dart';
import '../events/events_screen.dart';
import '../admin/admin_screen.dart';
import '../more/more_screen.dart';

/// Bottom-navigation shell hosting the primary tabs. The Admin tab only
/// appears for admin roles (mirrors the RN tab layout).
class MainShell extends ConsumerStatefulWidget {
  const MainShell({super.key});

  @override
  ConsumerState<MainShell> createState() => _MainShellState();
}

class _MainShellState extends ConsumerState<MainShell> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final isAdmin = ref.watch(authControllerProvider).user?.isAdmin ?? false;

    final tabs = <_Tab>[
      const _Tab('Home', Icons.home_outlined, Icons.home, HomeScreen()),
      const _Tab('Payments', Icons.credit_card_outlined, Icons.credit_card, PaymentsScreen()),
      const _Tab('Events', Icons.calendar_today_outlined, Icons.calendar_today, EventsScreen()),
      if (isAdmin)
        const _Tab('Admin', Icons.shield_outlined, Icons.shield, AdminScreen()),
      const _Tab('More', Icons.more_horiz, Icons.more_horiz, MoreScreen()),
    ];

    final index = _index.clamp(0, tabs.length - 1);

    return Scaffold(
      body: IndexedStack(
        index: index,
        children: [for (final t in tabs) t.screen],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: [
          for (final t in tabs)
            NavigationDestination(
              icon: Icon(t.icon),
              selectedIcon: Icon(t.activeIcon),
              label: t.label,
            ),
        ],
      ),
    );
  }
}

class _Tab {
  const _Tab(this.label, this.icon, this.activeIcon, this.screen);
  final String label;
  final IconData icon;
  final IconData activeIcon;
  final Widget screen;
}
