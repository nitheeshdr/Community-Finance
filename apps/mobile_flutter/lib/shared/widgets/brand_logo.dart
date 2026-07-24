import 'package:flutter/material.dart';

/// Brand mark — community ring + rupee glyph with a mint member dot.
/// Colours follow the active M3 color scheme (indigo).
class BrandLogo extends StatelessWidget {
  const BrandLogo({super.key, this.size = 50});

  final double size;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        alignment: Alignment.center,
        children: [
          Container(
            width: size * 0.88,
            height: size * 0.88,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(
                color: cs.primary.withValues(alpha: 0.28),
                width: size * 0.06,
              ),
            ),
          ),
          Text(
            '₹',
            style: TextStyle(
              fontSize: size * 0.6,
              height: 1,
              fontWeight: FontWeight.w800,
              color: cs.primary,
            ),
          ),
          Positioned(
            top: 0,
            child: Container(
              width: size * 0.13,
              height: size * 0.13,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: cs.tertiary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
