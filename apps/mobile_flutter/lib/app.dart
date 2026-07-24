import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/presentation/auth_controller.dart';

/// Composition root: builds the router once and refreshes it on auth change.
class App extends ConsumerStatefulWidget {
  const App({super.key});

  @override
  ConsumerState<App> createState() => _AppState();
}

class _AppState extends ConsumerState<App> {
  final ValueNotifier<int> _refresh = ValueNotifier<int>(0);
  late final GoRouter _router = buildRouter(ref, _refresh);

  @override
  void dispose() {
    _refresh.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Ping the router's refreshListenable whenever auth state changes.
    ref.listen(authControllerProvider, (_, _) => _refresh.value++);

    return MaterialApp.router(
      title: 'Community Finance',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      themeMode: ThemeMode.system,
      routerConfig: _router,
    );
  }
}
