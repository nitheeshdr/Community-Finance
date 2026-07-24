import 'package:flutter/material.dart';

import '../../shared/widgets/empty_state.dart';

class EventsScreen extends StatelessWidget {
  const EventsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Events')),
      body: const EmptyState(
        icon: Icons.calendar_today_outlined,
        title: 'Events',
        message: 'Community events and their budgets will appear here.',
      ),
    );
  }
}
