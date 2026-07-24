import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/providers.dart';
import '../../../shared/models/event.dart';

class EventsRepository {
  EventsRepository(this._api);
  final ApiClient _api;

  Future<List<CommunityEvent>> list({int page = 1}) async {
    final data = await _api.get<List<dynamic>>(
      '/events',
      query: {'page': page, 'limit': 20},
    );
    return data.map((e) => CommunityEvent.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<CommunityEvent> detail(String id) async {
    final data = await _api.get<Map<String, dynamic>>('/events/$id');
    return CommunityEvent.fromJson(data);
  }

  Future<List<EventSplit>> splits(String id) async {
    final data = await _api.get<List<dynamic>>('/events/$id/splits');
    return data.map((e) => EventSplit.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// One-time Razorpay link for the member's event share.
  Future<String> payShare(String eventId) async {
    final data = await _api.post<Map<String, dynamic>>('/events/$eventId/pay');
    return data['shortUrl'] as String;
  }
}

final eventsRepositoryProvider = Provider<EventsRepository>(
  (ref) => EventsRepository(ref.watch(apiClientProvider)),
);

final eventsProvider = FutureProvider.autoDispose<List<CommunityEvent>>(
  (ref) => ref.watch(eventsRepositoryProvider).list(),
);

final eventDetailProvider =
    FutureProvider.autoDispose.family<CommunityEvent, String>(
  (ref, id) => ref.watch(eventsRepositoryProvider).detail(id),
);

final eventSplitsProvider =
    FutureProvider.autoDispose.family<List<EventSplit>, String>(
  (ref, id) => ref.watch(eventsRepositoryProvider).splits(id),
);
