/// Environment configuration.
///
/// The Flutter app talks to the *same* Next.js backend as the web dashboard
/// and the previous React Native app — nothing server-side changes.
class Env {
  const Env._();

  /// Web origin of the deployed backend. Override at build time with
  /// `--dart-define=API_URL=https://...`.
  static const String webOrigin = String.fromEnvironment(
    'API_URL',
    defaultValue: 'https://finance-village-web.vercel.app',
  );

  /// Versioned REST prefix (matches `API_PREFIX` in packages/shared).
  static const String apiPrefix = '/api/v1';

  /// Full API base, e.g. https://finance-village-web.vercel.app/api/v1
  static String get apiBase => '$webOrigin$apiPrefix';
}
