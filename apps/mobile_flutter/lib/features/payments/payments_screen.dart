import 'package:flutter/material.dart';

import '../../shared/widgets/empty_state.dart';

class PaymentsScreen extends StatelessWidget {
  const PaymentsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Payments')),
      body: const EmptyState(
        icon: Icons.credit_card_outlined,
        title: 'Payments',
        message: 'Your subscription and event payments will appear here.',
      ),
    );
  }
}
