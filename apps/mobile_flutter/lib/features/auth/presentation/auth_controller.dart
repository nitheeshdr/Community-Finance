import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../../../shared/models/auth_user.dart';
import '../data/auth_repository.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(
    ref.watch(apiClientProvider),
    ref.watch(secureStorageProvider),
  );
});

/// Session state: null user = signed out. `loading` covers cold-start restore.
class AuthState {
  const AuthState({this.user, this.loading = true});

  final AuthUser? user;
  final bool loading;

  bool get isAuthenticated => user != null;

  AuthState copyWith({AuthUser? user, bool? loading, bool clearUser = false}) =>
      AuthState(
        user: clearUser ? null : (user ?? this.user),
        loading: loading ?? this.loading,
      );
}

class AuthController extends StateNotifier<AuthState> {
  AuthController(this._ref, this._repo) : super(const AuthState()) {
    // Wire the client's unauthorized callback to sign out.
    _ref.read(apiClientProvider).onUnauthorized = () {
      state = state.copyWith(clearUser: true, loading: false);
    };
    _restore();
  }

  final Ref _ref;
  final AuthRepository _repo;

  /// Instant restore from cache, then revalidate via /auth/me in background.
  Future<void> _restore() async {
    try {
      final cached = await _repo.cachedUser();
      final hasToken = await _repo.hasRefreshToken();
      if (cached != null && hasToken) {
        state = AuthState(user: cached, loading: false);
      }
      if (hasToken) {
        try {
          final fresh = await _repo.me();
          state = AuthState(user: fresh, loading: false);
        } catch (_) {
          // keep cached session on network errors
        }
      }
    } finally {
      if (state.loading) state = state.copyWith(loading: false);
    }
  }

  Future<AuthUser> login(String phone, String password) async {
    final user = await _repo.login(phone, password);
    state = AuthState(user: user, loading: false);
    return user;
  }

  Future<void> logout() async {
    await _repo.logout();
    state = const AuthState(loading: false);
  }
}

final authControllerProvider =
    StateNotifierProvider<AuthController, AuthState>((ref) {
  return AuthController(ref, ref.watch(authRepositoryProvider));
});
