import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/presentation/auth_controller.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/shell/main_shell.dart';
import '../../shared/widgets/app_loader.dart';

/// App routing with an auth-aware redirect. `refresh` is pinged whenever the
/// auth state changes so go_router re-evaluates the guard.
GoRouter buildRouter(WidgetRef ref, Listenable refresh) {
  return GoRouter(
    initialLocation: '/',
    refreshListenable: refresh,
    routes: [
      GoRoute(path: '/login', builder: (_, _) => const LoginScreen()),
      GoRoute(path: '/', builder: (_, _) => const _RootGate()),
    ],
    redirect: (context, state) {
      final auth = ref.read(authControllerProvider);
      if (auth.loading) return null; // stay put; splash shown by _RootGate
      final atLogin = state.matchedLocation == '/login';
      if (!auth.isAuthenticated) return atLogin ? null : '/login';
      if (atLogin) return '/';
      return null;
    },
  );
}

/// Shows the expressive loader while the session restores, then the shell.
class _RootGate extends ConsumerWidget {
  const _RootGate();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    if (auth.loading) return const Scaffold(body: AppLoader(label: 'Loading…'));
    return const MainShell();
  }
}
