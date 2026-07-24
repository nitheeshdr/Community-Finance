import 'package:flutter/material.dart';

/// The single loading indicator used across the app — the official
/// Material 3 **Expressive** `CircularProgressIndicator` (`year2023: false`
/// opts into the new expressive style). Keeps every loading state identical.
class AppLoader extends StatelessWidget {
  const AppLoader({super.key, this.size = 40, this.label});

  final double size;
  final String? label;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            width: size,
            height: size,
            child: const CircularProgressIndicator(),
          ),
          if (label != null) ...[
            const SizedBox(height: 12),
            Text(label!, style: Theme.of(context).textTheme.bodyMedium),
          ],
        ],
      ),
    );
  }
}
