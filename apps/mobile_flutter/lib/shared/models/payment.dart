/// Mirrors PaymentDto. Amounts are integer paise.
class Payment {
  const Payment({
    required this.id,
    required this.memberId,
    required this.type,
    required this.method,
    required this.status,
    required this.amount,
    required this.createdAt,
    this.memberName,
    this.period,
    this.eventId,
    this.eventName,
    this.receiptUrl,
    this.paidAt,
  });

  final String id;
  final String memberId;
  final String? memberName;
  final String type;
  final String method;
  final String status;
  final int amount;
  final String? period;
  final String? eventId;
  final String? eventName;
  final String? receiptUrl;
  final String? paidAt;
  final String createdAt;

  bool get isPending => status == 'PENDING' || status == 'OVERDUE';

  factory Payment.fromJson(Map<String, dynamic> j) => Payment(
        id: j['id'] as String,
        memberId: j['memberId'] as String? ?? '',
        memberName: j['memberName'] as String?,
        type: j['type'] as String? ?? 'MISC',
        method: j['method'] as String? ?? 'CASH',
        status: j['status'] as String? ?? 'PENDING',
        amount: (j['amount'] as num?)?.toInt() ?? 0,
        period: j['period'] as String?,
        eventId: j['eventId'] as String?,
        eventName: j['eventName'] as String?,
        receiptUrl: j['receiptUrl'] as String?,
        paidAt: j['paidAt'] as String?,
        createdAt: j['createdAt'] as String? ?? '',
      );
}
