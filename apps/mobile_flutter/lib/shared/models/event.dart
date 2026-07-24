/// Mirrors EventDto. Amounts are integer paise.
class CommunityEvent {
  const CommunityEvent({
    required this.id,
    required this.name,
    required this.category,
    required this.status,
    required this.date,
    required this.budget,
    required this.fundingMode,
    required this.perHeadAmount,
    required this.collectedAmount,
    required this.spentAmount,
    this.description,
    this.organizerName,
    this.images = const [],
  });

  final String id;
  final String name;
  final String? description;
  final String category;
  final String status;
  final String date;
  final int budget;
  final String fundingMode;
  final int perHeadAmount;
  final int collectedAmount;
  final int spentAmount;
  final String? organizerName;
  final List<String> images;

  factory CommunityEvent.fromJson(Map<String, dynamic> j) => CommunityEvent(
        id: j['id'] as String,
        name: j['name'] as String? ?? '',
        description: j['description'] as String?,
        category: j['category'] as String? ?? 'OTHER',
        status: j['status'] as String? ?? 'ACTIVE',
        date: j['date'] as String? ?? '',
        budget: (j['budget'] as num?)?.toInt() ?? 0,
        fundingMode: j['fundingMode'] as String? ?? 'SPLIT',
        perHeadAmount: (j['perHeadAmount'] as num?)?.toInt() ?? 0,
        collectedAmount: (j['collectedAmount'] as num?)?.toInt() ?? 0,
        spentAmount: (j['spentAmount'] as num?)?.toInt() ?? 0,
        organizerName: j['organizerName'] as String?,
        images: (j['images'] as List?)?.cast<String>() ?? const [],
      );
}

/// Mirrors EventSplitDto.
class EventSplit {
  const EventSplit({
    required this.id,
    required this.memberId,
    required this.splitAmount,
    required this.paidAmount,
    required this.status,
    this.memberName,
  });

  final String id;
  final String memberId;
  final String? memberName;
  final int splitAmount;
  final int paidAmount;
  final String status;

  factory EventSplit.fromJson(Map<String, dynamic> j) => EventSplit(
        id: j['id'] as String,
        memberId: j['memberId'] as String? ?? '',
        memberName: j['memberName'] as String?,
        splitAmount: (j['splitAmount'] as num?)?.toInt() ?? 0,
        paidAmount: (j['paidAmount'] as num?)?.toInt() ?? 0,
        status: j['status'] as String? ?? 'PENDING',
      );
}
