import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:finance/shared/models/enums.dart';

void main() {
  test('UserRole parses and reports admin correctly', () {
    expect(UserRole.fromString('SUPER_ADMIN'), UserRole.superAdmin);
    expect(UserRole.fromString('ADMIN').isAdmin, isTrue);
    expect(UserRole.fromString('MEMBER').isAdmin, isFalse);
    expect(UserRole.fromString('unknown'), UserRole.member);
  });

  testWidgets('smoke: MaterialApp builds', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: Scaffold()));
    expect(find.byType(Scaffold), findsOneWidget);
  });
}
