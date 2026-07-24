import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/providers.dart';
import '../../../shared/models/dashboard_stats.dart';

class DashboardRepository {
  DashboardRepository(this._api);
  final ApiClient _api;

  Future<DashboardStats> fetch() async {
    final data = await _api.get<Map<String, dynamic>>('/dashboard');
    return DashboardStats.fromJson(data);
  }
}

final dashboardRepositoryProvider = Provider<DashboardRepository>(
  (ref) => DashboardRepository(ref.watch(apiClientProvider)),
);

/// Community dashboard stats (auto-refetches when invalidated).
final dashboardProvider = FutureProvider.autoDispose<DashboardStats>(
  (ref) => ref.watch(dashboardRepositoryProvider).fetch(),
);
