import 'event.dart';

/// Mirrors DashboardStatsDto (the transparency numbers members also see).
class DashboardStats {
  const DashboardStats({
    required this.currentBalance,
    required this.monthlyCollection,
    required this.monthlyExpenses,
    required this.pendingCollection,
    required this.totalMembers,
    required this.activeMembers,
    required this.paidMembersThisMonth,
    required this.pendingMembersThisMonth,
    required this.upcomingEvents,
  });

  final int currentBalance;
  final int monthlyCollection;
  final int monthlyExpenses;
  final int pendingCollection;
  final int totalMembers;
  final int activeMembers;
  final int paidMembersThisMonth;
  final int pendingMembersThisMonth;
  final List<CommunityEvent> upcomingEvents;

  factory DashboardStats.fromJson(Map<String, dynamic> j) => DashboardStats(
        currentBalance: (j['currentBalance'] as num?)?.toInt() ?? 0,
        monthlyCollection: (j['monthlyCollection'] as num?)?.toInt() ?? 0,
        monthlyExpenses: (j['monthlyExpenses'] as num?)?.toInt() ?? 0,
        pendingCollection: (j['pendingCollection'] as num?)?.toInt() ?? 0,
        totalMembers: (j['totalMembers'] as num?)?.toInt() ?? 0,
        activeMembers: (j['activeMembers'] as num?)?.toInt() ?? 0,
        paidMembersThisMonth: (j['paidMembersThisMonth'] as num?)?.toInt() ?? 0,
        pendingMembersThisMonth: (j['pendingMembersThisMonth'] as num?)?.toInt() ?? 0,
        upcomingEvents: (j['upcomingEvents'] as List?)
                ?.map((e) => CommunityEvent.fromJson(e as Map<String, dynamic>))
                .toList() ??
            const [],
      );
}
