import 'package:flutter/material.dart';

/// Small tonal status label. Colours come from the active [ColorScheme] roles
/// — never hardcoded.
class StatusChip extends StatelessWidget {
  const StatusChip(this.status, {super.key});

  final String status;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final (Color bg, Color fg) = switch (status) {
      'PAID' || 'APPROVED' || 'ACTIVE' || 'COMPLETED' => (cs.tertiaryContainer, cs.onTertiaryContainer),
      'PENDING' || 'DRAFT' || 'CREATED' => (cs.secondaryContainer, cs.onSecondaryContainer),
      'OVERDUE' || 'FAILED' || 'CANCELLED' || 'REJECTED' || 'HALTED' => (cs.errorContainer, cs.onErrorContainer),
      _ => (cs.surfaceContainerHighest, cs.onSurfaceVariant),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(8)),
      child: Text(
        _titleCase(status),
        style: Theme.of(context)
            .textTheme
            .labelSmall
            ?.copyWith(color: fg, fontWeight: FontWeight.w700),
      ),
    );
  }

  static String _titleCase(String s) => s.isEmpty
      ? s
      : s
          .toLowerCase()
          .split('_')
          .map((w) => w.isEmpty ? w : '${w[0].toUpperCase()}${w.substring(1)}')
          .join(' ');
}
