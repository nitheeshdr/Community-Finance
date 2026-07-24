import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/providers.dart';
import '../../../shared/models/expense.dart';
import '../../../shared/models/member.dart';
import '../../../shared/models/payment.dart';

class AdminRepository {
  AdminRepository(this._api);
  final ApiClient _api;

  Future<List<Member>> members({String? search, String? status}) async {
    final data = await _api.get<List<dynamic>>('/members', query: {
      'page': 1,
      'limit': 20,
      if (search != null && search.isNotEmpty) 'search': search,
      if (status != null && status != 'ALL') 'status': status,
    });
    return data.map((e) => Member.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<Member>> memberPicker() async {
    final data = await _api.get<List<dynamic>>('/members',
        query: {'page': 1, 'limit': 100, 'status': 'ACTIVE', 'role': 'MEMBER'});
    return data.map((e) => Member.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<Payment>> _pendingByMethod(String method) async {
    final data = await _api.get<List<dynamic>>('/payments',
        query: {'page': 1, 'limit': 50, 'status': 'PENDING', 'method': method});
    return data.map((e) => Payment.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<Payment>> pendingPayments() async {
    final cash = await _pendingByMethod('CASH');
    final upi = await _pendingByMethod('UPI');
    return [...cash, ...upi];
  }

  Future<List<Expense>> pendingExpenses() async {
    final data = await _api.get<List<dynamic>>('/expenses',
        query: {'page': 1, 'limit': 50, 'status': 'PENDING'});
    return data.map((e) => Expense.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> reviewPayment(String id, String action) =>
      _api.post('/payments/$id/review', body: {'action': action});

  Future<void> reviewExpense(String id, String action) =>
      _api.post('/expenses/$id/review', body: {'action': action});

  Future<void> changeMemberStatus(String id, String status) =>
      _api.post('/members/$id/status', body: {'status': status});

  Future<void> recordPayment({
    required String memberId,
    required String type,
    required String method,
    required int amount,
    String? period,
    String? upiReference,
    String? notes,
  }) =>
      _api.post('/payments', body: {
        'memberId': memberId,
        'type': type,
        'method': method,
        'amount': amount,
        'period': ?period,
        'upiReference': ?upiReference,
        if (notes != null && notes.isNotEmpty) 'notes': notes,
      });

  Future<void> createEvent({
    required String name,
    required String category,
    required String date,
    required int budget,
    required String fundingMode,
    List<String> participantIds = const [],
  }) =>
      _api.post('/events', body: {
        'name': name,
        'category': category,
        'date': date,
        'budget': budget,
        'fundingMode': fundingMode,
        'participantIds': participantIds,
      });

  Future<void> sendAnnouncement({required String title, required String body}) =>
      _api.post('/notifications', body: {'type': 'GENERAL', 'title': title, 'body': body});
}

final adminRepositoryProvider = Provider<AdminRepository>(
  (ref) => AdminRepository(ref.watch(apiClientProvider)),
);

final pendingPaymentsProvider = FutureProvider.autoDispose<List<Payment>>(
  (ref) => ref.watch(adminRepositoryProvider).pendingPayments(),
);
final pendingExpensesProvider = FutureProvider.autoDispose<List<Expense>>(
  (ref) => ref.watch(adminRepositoryProvider).pendingExpenses(),
);
final adminMembersProvider =
    FutureProvider.autoDispose.family<List<Member>, String>(
  (ref, search) => ref.watch(adminRepositoryProvider).members(search: search),
);
final memberPickerProvider = FutureProvider.autoDispose<List<Member>>(
  (ref) => ref.watch(adminRepositoryProvider).memberPicker(),
);
