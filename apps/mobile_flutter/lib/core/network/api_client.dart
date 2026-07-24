import 'package:dio/dio.dart';

import '../config/env.dart';
import '../storage/secure_storage.dart';
import 'api_exception.dart';

/// HTTP client for the Community Finance REST API.
///
/// Ports the RN axios client exactly:
///  - Access token kept in memory, attached as `Authorization: Bearer`.
///  - Refresh token in secure storage, sent in the body on `/auth/refresh`.
///  - 401 → single-flight refresh → retry the original request once →
///    otherwise invoke the unauthorized callback (sign out).
class ApiClient {
  ApiClient(this._storage) {
    _dio = Dio(
      BaseOptions(
        baseUrl: Env.apiBase,
        connectTimeout: const Duration(seconds: 30),
        receiveTimeout: const Duration(seconds: 30),
        contentType: Headers.jsonContentType,
      ),
    );
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          if (accessToken != null) {
            options.headers['Authorization'] = 'Bearer $accessToken';
          }
          handler.next(options);
        },
        onError: _onError,
      ),
    );
  }

  late final Dio _dio;
  final SecureStorage _storage;

  /// In-memory access token, attached as a Bearer header on each request.
  String? accessToken;
  Future<String?>? _refreshInFlight;

  /// Called when the session can no longer be refreshed.
  void Function()? onUnauthorized;

  Dio get raw => _dio;

  Future<void> _onError(DioException err, ErrorInterceptorHandler handler) async {
    final response = err.response;
    final requestOptions = err.requestOptions;
    final isAuthRoute = requestOptions.path.contains('/auth/');
    final alreadyRetried = requestOptions.extra['_retried'] == true;

    if (response?.statusCode == 401 && !isAuthRoute && !alreadyRetried) {
      final token = await _refreshAccessToken();
      if (token != null) {
        requestOptions.extra['_retried'] = true;
        requestOptions.headers['Authorization'] = 'Bearer $token';
        try {
          final retried = await _dio.fetch(requestOptions);
          return handler.resolve(retried);
        } on DioException catch (e) {
          return handler.next(e);
        }
      }
      onUnauthorized?.call();
    }
    handler.next(err);
  }

  /// Single-flight refresh — concurrent 401s share one refresh call.
  Future<String?> _refreshAccessToken() {
    return _refreshInFlight ??= () async {
      try {
        final stored = await _storage.refreshToken;
        if (stored == null) return null;
        final res = await Dio(BaseOptions(baseUrl: Env.apiBase)).post(
          '/auth/refresh',
          data: {'refreshToken': stored},
        );
        final data = res.data?['data'] as Map<String, dynamic>?;
        if (data == null) return null;
        accessToken = data['accessToken'] as String?;
        final newRefresh = data['refreshToken'] as String?;
        if (newRefresh != null) await _storage.setRefreshToken(newRefresh);
        return accessToken;
      } on DioException catch (e) {
        final status = e.response?.statusCode;
        if (status == 401 || status == 403) {
          await _storage.clear();
          accessToken = null;
        }
        return null;
      } finally {
        _refreshInFlight = null;
      }
    }();
  }

  /* ── Typed helpers that unwrap the `{ data }` envelope ───────────── */

  Future<T> get<T>(String path, {Map<String, dynamic>? query}) =>
      _send<T>(() => _dio.get(path, queryParameters: query));

  Future<T> post<T>(String path, {Object? body}) =>
      _send<T>(() => _dio.post(path, data: body));

  Future<T> patch<T>(String path, {Object? body}) =>
      _send<T>(() => _dio.patch(path, data: body));

  Future<T> delete<T>(String path, {Object? body}) =>
      _send<T>(() => _dio.delete(path, data: body));

  Future<T> _send<T>(Future<Response> Function() call) async {
    try {
      final res = await call();
      return (res.data is Map ? res.data['data'] : res.data) as T;
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }
}
