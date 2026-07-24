import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/providers.dart';
import '../../../shared/models/payment.dart';
import '../../../shared/models/subscription.dart';
import '../../auth/presentation/auth_controller.dart';

class PaymentsRepository {
  PaymentsRepository(this._api);
  final ApiClient _api;

  Future<List<Payment>> mine(String memberId, {int page = 1}) async {
    final data = await _api.get<List<dynamic>>(
      '/payments',
      query: {'memberId': memberId, 'page': page, 'limit': 20},
    );
    return data.map((e) => Payment.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Create a one-time Razorpay link for a pending due; returns the short URL.
  Future<String> payLink(String paymentId) async {
    final data = await _api.post<Map<String, dynamic>>('/payments/$paymentId/pay');
    return data['shortUrl'] as String;
  }

  Future<Subscription?> subscription(String memberId) async {
    final data = await _api.get<dynamic>('/subscriptions/$memberId');
    if (data == null) return null;
    return Subscription.fromJson(data as Map<String, dynamic>);
  }
}

final paymentsRepositoryProvider = Provider<PaymentsRepository>(
  (ref) => PaymentsRepository(ref.watch(apiClientProvider)),
);

/// The signed-in member's own payments.
final myPaymentsProvider = FutureProvider.autoDispose<List<Payment>>((ref) {
  final user = ref.watch(authControllerProvider).user;
  if (user == null) return Future.value(const []);
  return ref.watch(paymentsRepositoryProvider).mine(user.id);
});
