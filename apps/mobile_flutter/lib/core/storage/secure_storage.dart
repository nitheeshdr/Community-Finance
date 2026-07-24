import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Thin wrapper over the platform secure store (Keychain / Keystore).
///
/// Mirrors the RN app's expo-secure-store keys so the same tokens/session
/// semantics carry over.
class SecureStorage {
  SecureStorage([FlutterSecureStorage? storage])
      : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;

  static const _refreshKey = 'cf_refresh_token';
  static const _userKey = 'cf_user';
  static const _lastPhoneKey = 'cf_last_phone';

  Future<String?> get refreshToken => _storage.read(key: _refreshKey);
  Future<void> setRefreshToken(String value) =>
      _storage.write(key: _refreshKey, value: value);

  Future<String?> get cachedUser => _storage.read(key: _userKey);
  Future<void> setCachedUser(String json) =>
      _storage.write(key: _userKey, value: json);

  Future<String?> get lastPhone => _storage.read(key: _lastPhoneKey);
  Future<void> setLastPhone(String value) =>
      _storage.write(key: _lastPhoneKey, value: value);

  Future<void> clear() async {
    await _storage.delete(key: _refreshKey);
    await _storage.delete(key: _userKey);
  }
}
