/// Mirrors NotificationDto.
class AppNotification {
  const AppNotification({
    required this.id,
    required this.type,
    required this.title,
    required this.body,
    required this.read,
    required this.createdAt,
  });

  final String id;
  final String type;
  final String title;
  final String body;
  final bool read;
  final String createdAt;

  factory AppNotification.fromJson(Map<String, dynamic> j) => AppNotification(
        id: j['id'] as String,
        type: j['type'] as String? ?? 'GENERAL',
        title: j['title'] as String? ?? '',
        body: j['body'] as String? ?? '',
        read: j['read'] as bool? ?? false,
        createdAt: j['createdAt'] as String? ?? '',
      );
}
