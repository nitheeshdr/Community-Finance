/// Mirrors the fields of ExpenseDto used by the app. Amount is paise.
class Expense {
  const Expense({
    required this.id,
    required this.name,
    required this.amount,
    required this.status,
    this.category,
    this.eventName,
    this.vendor,
  });

  final String id;
  final String name;
  final int amount;
  final String status;
  final String? category;
  final String? eventName;
  final String? vendor;

  factory Expense.fromJson(Map<String, dynamic> j) => Expense(
        id: j['id'] as String,
        name: j['name'] as String? ?? '',
        amount: (j['amount'] as num?)?.toInt() ?? 0,
        status: j['status'] as String? ?? 'PENDING',
        category: j['category'] as String?,
        eventName: j['eventName'] as String?,
        vendor: j['vendor'] as String?,
      );
}
