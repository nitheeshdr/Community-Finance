import 'package:flutter/material.dart';

/// Material 3 (Expressive) theme, seeded from the brand indigo #4F46E5.
///
/// Expressive traits: bolder display/headline type, larger corner radii on
/// cards / inputs / buttons, and generous touch targets.
class AppTheme {
  const AppTheme._();

  static const Color seed = Color(0xFF4F46E5);
  static const Color surface = Color(0xFFFCF8FF);

  static ThemeData get light {
    final scheme = ColorScheme.fromSeed(
      seedColor: seed,
      brightness: Brightness.light,
    ).copyWith(surface: surface);

    final base = ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: surface,
    );

    return base.copyWith(
      textTheme: _expressiveText(base.textTheme, scheme.onSurface),
      appBarTheme: AppBarTheme(
        backgroundColor: surface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
          color: scheme.onSurface,
          fontSize: 20,
          fontWeight: FontWeight.w700,
        ),
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        color: scheme.surfaceContainerLow,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        margin: EdgeInsets.zero,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: scheme.surfaceContainerLowest,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: scheme.outlineVariant),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: scheme.outlineVariant),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: scheme.primary, width: 2),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size.fromHeight(56),
          shape: const StadiumBorder(),
          textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: scheme.surfaceContainer,
        indicatorColor: scheme.secondaryContainer,
        elevation: 0,
        height: 72,
        labelTextStyle: WidgetStatePropertyAll(
          TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: scheme.onSurface),
        ),
      ),
      chipTheme: base.chipTheme.copyWith(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
      // Opt every progress indicator into the Material 3 Expressive style.
      // ignore: deprecated_member_use
      progressIndicatorTheme: const ProgressIndicatorThemeData(year2023: false),
    );
  }

  static TextTheme _expressiveText(TextTheme t, Color onSurface) => t.copyWith(
        displayLarge: t.displayLarge?.copyWith(fontWeight: FontWeight.w800, letterSpacing: -0.5),
        displayMedium: t.displayMedium?.copyWith(fontWeight: FontWeight.w800, letterSpacing: -0.5),
        displaySmall: t.displaySmall?.copyWith(fontWeight: FontWeight.w800, letterSpacing: -0.25),
        headlineLarge: t.headlineLarge?.copyWith(fontWeight: FontWeight.w800),
        headlineMedium: t.headlineMedium?.copyWith(fontWeight: FontWeight.w700),
        headlineSmall: t.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
        titleLarge: t.titleLarge?.copyWith(fontWeight: FontWeight.w700),
        titleMedium: t.titleMedium?.copyWith(fontWeight: FontWeight.w600),
        labelLarge: t.labelLarge?.copyWith(fontWeight: FontWeight.w700),
      ).apply(bodyColor: onSurface, displayColor: onSurface);
}
