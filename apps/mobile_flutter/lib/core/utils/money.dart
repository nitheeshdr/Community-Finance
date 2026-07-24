import 'package:intl/intl.dart';

/// Money helpers. The API stores amounts as integer **paise**.
class Money {
  const Money._();

  static final NumberFormat _inr = NumberFormat.currency(
    locale: 'en_IN',
    symbol: '₹',
    decimalDigits: 0,
  );

  /// Format paise as Indian rupees, e.g. 125000 → "₹1,250".
  static String fromPaise(num paise) => _inr.format(paise / 100);
}
