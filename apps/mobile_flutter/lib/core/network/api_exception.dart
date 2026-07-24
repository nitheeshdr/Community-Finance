import 'package:dio/dio.dart';

/// Normalised API error, decoded from the `{ success, error }` envelope.
class ApiException implements Exception {
  const ApiException(this.message, {this.status, this.code});

  final String message;
  final int? status;
  final String? code;

  /// Build a friendly message from any Dio failure, reading the server
  /// envelope's `error.message` when present.
  factory ApiException.fromDio(DioException err) {
    final res = err.response;
    if (res == null) {
      return const ApiException('Network error — check your connection');
    }
    final data = res.data;
    if (data is Map && data['error'] is Map) {
      final error = data['error'] as Map;
      return ApiException(
        (error['message'] as String?) ?? 'Something went wrong',
        status: res.statusCode,
        code: error['code'] as String?,
      );
    }
    return ApiException('Request failed (${res.statusCode})', status: res.statusCode);
  }

  @override
  String toString() => message;
}
