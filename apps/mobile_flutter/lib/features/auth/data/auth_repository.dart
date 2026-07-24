import 'dart:convert';

import '../../../core/network/api_client.dart';
import '../../../core/storage/secure_storage.dart';
import '../../../shared/models/auth_user.dart';

/// Auth data source — ports the RN auth-context flow onto the shared API.
class AuthRepository {
  AuthRepository(this._api, this._storage);

  final ApiClient _api;
  final SecureStorage _storage;

  /// POST /auth/login → persist tokens + cached user, return the user.
  Future<AuthUser> login(String phone, String password) async {
    final data = await _api.post<Map<String, dynamic>>(
      '/auth/login',
      body: {'phone': phone, 'password': password},
    );
    _api.accessToken = data['accessToken'] as String?;
    await _storage.setRefreshToken(data['refreshToken'] as String);
    final user = AuthUser.fromJson(data['user'] as Map<String, dynamic>);
    await _storage.setCachedUser(jsonEncode(user.toJson()));
    await _storage.setLastPhone(phone);
    return user;
  }

  /// GET /auth/me → current user (also refreshes the local cache).
  Future<AuthUser> me() async {
    final data = await _api.get<Map<String, dynamic>>('/auth/me');
    final user = AuthUser.fromJson(data);
    await _storage.setCachedUser(jsonEncode(user.toJson()));
    return user;
  }

  /// Best-effort server logout; always clears local state.
  Future<void> logout() async {
    try {
      final token = await _storage.refreshToken;
      if (token != null) {
        await _api.post('/auth/logout', body: {'refreshToken': token});
      }
    } catch (_) {
      // ignore — clear locally regardless
    } finally {
      _api.accessToken = null;
      await _storage.clear();
    }
  }

  /// Locally cached user for instant cold-start sign-in.
  Future<AuthUser?> cachedUser() async {
    final raw = await _storage.cachedUser;
    if (raw == null) return null;
    try {
      return AuthUser.fromJson(jsonDecode(raw) as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }

  Future<String?> lastPhone() => _storage.lastPhone;
  Future<bool> hasRefreshToken() async => (await _storage.refreshToken) != null;
}
