// Enums mirroring packages/shared/src/enums.ts.

enum UserRole {
  superAdmin('SUPER_ADMIN'),
  admin('ADMIN'),
  member('MEMBER');

  const UserRole(this.value);
  final String value;

  static UserRole fromString(String? v) =>
      UserRole.values.firstWhere((e) => e.value == v, orElse: () => UserRole.member);

  bool get isAdmin => this == UserRole.admin || this == UserRole.superAdmin;
}

enum UserStatus {
  active('ACTIVE'),
  inactive('INACTIVE'),
  suspended('SUSPENDED');

  const UserStatus(this.value);
  final String value;

  static UserStatus fromString(String? v) =>
      UserStatus.values.firstWhere((e) => e.value == v, orElse: () => UserStatus.active);
}
