import 'package:flutter/material.dart';

/// Material 3 (Material You) theme with an **Expressive** visual style.
///
/// Rules honoured here:
///  - Only Flutter's official Material library.
///  - Colours come exclusively from a seed via [ColorScheme.fromSeed] — no
///    hardcoded UI colours. Light and dark are generated from the same seed.
///  - All styling lives in *component themes*, never per-widget.
///  - Expressive traits: bold type hierarchy, large rounded shapes, tonal
///    surfaces, generous touch targets, expressive ripple + progress.
class AppTheme {
  const AppTheme._();

  /// The single brand seed. Every colour role is derived from this.
  static const Color seed = Color(0xFF4F46E5);

  static ThemeData light() => _build(Brightness.light);
  static ThemeData dark() => _build(Brightness.dark);

  static ThemeData _build(Brightness brightness) {
    final scheme = ColorScheme.fromSeed(seedColor: seed, brightness: brightness);
    final base = ThemeData(useMaterial3: true, colorScheme: scheme);

    // Expressive shape scale, applied globally through component themes.
    final shapeMd = RoundedRectangleBorder(borderRadius: BorderRadius.circular(16));
    final shapeLg = RoundedRectangleBorder(borderRadius: BorderRadius.circular(24));
    final shapeXl = RoundedRectangleBorder(borderRadius: BorderRadius.circular(28));

    return base.copyWith(
      textTheme: _expressiveText(base.textTheme),
      splashFactory: InkSparkle.splashFactory, // expressive ripple
      visualDensity: VisualDensity.adaptivePlatformDensity,

      appBarTheme: AppBarTheme(
        centerTitle: false,
        elevation: 0,
        scrolledUnderElevation: 3,
        backgroundColor: scheme.surface,
        surfaceTintColor: scheme.surfaceTint,
        titleTextStyle: base.textTheme.titleLarge?.copyWith(
          fontWeight: FontWeight.w700,
          color: scheme.onSurface,
        ),
      ),

      cardTheme: CardThemeData(
        elevation: 1,
        clipBehavior: Clip.antiAlias,
        shape: shapeLg,
        margin: EdgeInsets.zero,
      ),

      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size(64, 52),
          padding: const EdgeInsets.symmetric(horizontal: 24),
          shape: const StadiumBorder(),
          textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size(64, 52),
          padding: const EdgeInsets.symmetric(horizontal: 24),
          shape: const StadiumBorder(),
          textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(shape: const StadiumBorder()),
      ),

      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
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

      navigationBarTheme: NavigationBarThemeData(
        height: 72,
        elevation: 3,
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        labelTextStyle: WidgetStateProperty.resolveWith(
          (states) => TextStyle(
            fontSize: 12,
            fontWeight: states.contains(WidgetState.selected)
                ? FontWeight.w700
                : FontWeight.w500,
          ),
        ),
      ),
      navigationRailTheme: NavigationRailThemeData(
        useIndicator: true,
        labelType: NavigationRailLabelType.all,
        backgroundColor: scheme.surface,
      ),
      drawerTheme: DrawerThemeData(
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.horizontal(right: Radius.circular(28)),
        ),
        backgroundColor: scheme.surfaceContainerLow,
      ),

      chipTheme: ChipThemeData(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
      segmentedButtonTheme: SegmentedButtonThemeData(
        style: SegmentedButton.styleFrom(shape: const StadiumBorder()),
      ),

      dialogTheme: DialogThemeData(shape: shapeXl),
      bottomSheetTheme: const BottomSheetThemeData(
        showDragHandle: true,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        shape: shapeMd,
      ),
      listTileTheme: ListTileThemeData(shape: shapeMd),
      floatingActionButtonTheme: FloatingActionButtonThemeData(shape: shapeMd),
      menuTheme: MenuThemeData(
        style: MenuStyle(
          shape: WidgetStatePropertyAll(
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          ),
        ),
      ),

      // Every progress indicator uses the Material 3 Expressive style.
      // ignore: deprecated_member_use
      progressIndicatorTheme: const ProgressIndicatorThemeData(year2023: false),

      // Expressive shared-axis page transitions.
      pageTransitionsTheme: const PageTransitionsTheme(
        builders: {
          TargetPlatform.android: FadeForwardsPageTransitionsBuilder(),
          TargetPlatform.iOS: FadeForwardsPageTransitionsBuilder(),
        },
      ),
    );
  }

  /// Expressive typography — bolder, tighter display/headline/title. Colours
  /// are left to Material so they track the active [ColorScheme].
  static TextTheme _expressiveText(TextTheme t) => t.copyWith(
        displayLarge: t.displayLarge?.copyWith(fontWeight: FontWeight.w800, letterSpacing: -0.5),
        displayMedium: t.displayMedium?.copyWith(fontWeight: FontWeight.w800, letterSpacing: -0.5),
        displaySmall: t.displaySmall?.copyWith(fontWeight: FontWeight.w800, letterSpacing: -0.25),
        headlineLarge: t.headlineLarge?.copyWith(fontWeight: FontWeight.w800),
        headlineMedium: t.headlineMedium?.copyWith(fontWeight: FontWeight.w700),
        headlineSmall: t.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
        titleLarge: t.titleLarge?.copyWith(fontWeight: FontWeight.w700),
        titleMedium: t.titleMedium?.copyWith(fontWeight: FontWeight.w600),
        labelLarge: t.labelLarge?.copyWith(fontWeight: FontWeight.w700),
      );
}
