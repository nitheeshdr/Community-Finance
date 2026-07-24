import 'enums.dart';

/// Mirrors AuthUserDto in packages/shared/src/types.ts.
class AuthUser {
  const AuthUser({
    required this.id,
    required this.communityId,
    required this.name,
    required this.phone,
    required this.role,
    required this.status,
    required this.mustChangePassword,
    this.profileImage,
  });

  final String id;
  final String communityId;
  final String name;
  final String phone;
  final UserRole role;
  final UserStatus status;
  final bool mustChangePassword;
  final String? profileImage;

  bool get isAdmin => role.isAdmin;

  factory AuthUser.fromJson(Map<String, dynamic> json) => AuthUser(
        id: json['id'] as String,
        communityId: json['communityId'] as String? ?? '',
        name: json['name'] as String? ?? '',
        phone: json['phone'] as String? ?? '',
        role: UserRole.fromString(json['role'] as String?),
        status: UserStatus.fromString(json['status'] as String?),
        mustChangePassword: json['mustChangePassword'] as bool? ?? false,
        profileImage: json['profileImage'] as String?,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'communityId': communityId,
        'name': name,
        'phone': phone,
        'role': role.value,
        'status': status.value,
        'mustChangePassword': mustChangePassword,
        'profileImage': profileImage,
      };
}
