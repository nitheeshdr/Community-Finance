/// Mirrors the fields of MemberDto used by the app.
class Member {
  const Member({
    required this.id,
    required this.name,
    required this.phone,
    required this.role,
    required this.status,
    this.familyGroup,
  });

  final String id;
  final String name;
  final String phone;
  final String role;
  final String status;
  final String? familyGroup;

  factory Member.fromJson(Map<String, dynamic> j) => Member(
        id: j['id'] as String,
        name: j['name'] as String? ?? '',
        phone: j['phone'] as String? ?? '',
        role: j['role'] as String? ?? 'MEMBER',
        status: j['status'] as String? ?? 'ACTIVE',
        familyGroup: j['familyGroup'] as String?,
      );
}
