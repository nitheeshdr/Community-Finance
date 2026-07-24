/// Mirrors SubscriptionDto (member AutoPay mandate).
class Subscription {
  const Subscription({
    required this.id,
    required this.memberId,
    required this.status,
    this.shortUrl,
    this.nextChargeAt,
  });

  final String id;
  final String memberId;
  final String status;
  final String? shortUrl;
  final String? nextChargeAt;

  bool get isActive => status == 'ACTIVE' || status == 'AUTHENTICATED';

  factory Subscription.fromJson(Map<String, dynamic> j) => Subscription(
        id: j['id'] as String,
        memberId: j['memberId'] as String? ?? '',
        status: j['status'] as String? ?? 'CREATED',
        shortUrl: j['shortUrl'] as String?,
        nextChargeAt: j['nextChargeAt'] as String?,
      );
}
