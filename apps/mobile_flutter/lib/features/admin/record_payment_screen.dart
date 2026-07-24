import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../shared/models/member.dart';
import '../../shared/widgets/async_view.dart';
import 'data/admin_repository.dart';

class RecordPaymentScreen extends ConsumerStatefulWidget {
  const RecordPaymentScreen({super.key});

  @override
  ConsumerState<RecordPaymentScreen> createState() => _RecordPaymentScreenState();
}

class _RecordPaymentScreenState extends ConsumerState<RecordPaymentScreen> {
  String? _memberId;
  String _type = 'SUBSCRIPTION';
  String _method = 'CASH';
  final _amount = TextEditingController();
  DateTime _period = DateTime.now();
  bool _saving = false;

  @override
  void dispose() {
    _amount.dispose();
    super.dispose();
  }

  String get _periodStr =>
      '${_period.year}-${_period.month.toString().padLeft(2, '0')}';

  Future<void> _pickPeriod() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _period,
      firstDate: DateTime(2020),
      lastDate: DateTime(2100),
      initialDatePickerMode: DatePickerMode.year,
    );
    if (picked != null) setState(() => _period = picked);
  }

  Future<void> _submit() async {
    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);
    final rupees = double.tryParse(_amount.text.trim());
    if (_memberId == null) {
      messenger.showSnackBar(const SnackBar(content: Text('Select a member')));
      return;
    }
    if (rupees == null || rupees <= 0) {
      messenger.showSnackBar(const SnackBar(content: Text('Enter a valid amount')));
      return;
    }
    setState(() => _saving = true);
    try {
      await ref.read(adminRepositoryProvider).recordPayment(
            memberId: _memberId!,
            type: _type,
            method: _method,
            amount: (rupees * 100).round(),
            period: _type == 'SUBSCRIPTION' ? _periodStr : null,
          );
      ref.invalidate(pendingPaymentsProvider);
      messenger.showSnackBar(const SnackBar(content: Text('Payment recorded')));
      navigator.pop();
    } catch (e) {
      setState(() => _saving = false);
      messenger.showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final members = ref.watch(memberPickerProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Record payment')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text('Member', style: theme.textTheme.labelLarge),
          const SizedBox(height: 8),
          AsyncView<List<Member>>(
            value: members,
            loading: const LinearProgressIndicator(),
            data: (list) => DropdownMenu<String>(
              expandedInsets: EdgeInsets.zero,
              hintText: 'Select member',
              initialSelection: _memberId,
              onSelected: (v) => setState(() => _memberId = v),
              dropdownMenuEntries: [
                for (final m in list)
                  DropdownMenuEntry(value: m.id, label: '${m.name} · ${m.phone}'),
              ],
            ),
          ),
          const SizedBox(height: 20),
          Text('Type', style: theme.textTheme.labelLarge),
          const SizedBox(height: 8),
          SegmentedButton<String>(
            selected: {_type},
            onSelectionChanged: (s) => setState(() => _type = s.first),
            segments: const [
              ButtonSegment(value: 'SUBSCRIPTION', label: Text('Subscription')),
              ButtonSegment(value: 'DONATION', label: Text('Donation')),
              ButtonSegment(value: 'MISC', label: Text('Misc')),
            ],
          ),
          const SizedBox(height: 20),
          Text('Method', style: theme.textTheme.labelLarge),
          const SizedBox(height: 8),
          SegmentedButton<String>(
            selected: {_method},
            onSelectionChanged: (s) => setState(() => _method = s.first),
            segments: const [
              ButtonSegment(value: 'CASH', label: Text('Cash'), icon: Icon(Icons.payments_outlined)),
              ButtonSegment(value: 'UPI', label: Text('UPI'), icon: Icon(Icons.qr_code)),
            ],
          ),
          const SizedBox(height: 20),
          TextField(
            controller: _amount,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.]'))],
            decoration: const InputDecoration(
              labelText: 'Amount (₹)',
              prefixIcon: Icon(Icons.currency_rupee),
            ),
          ),
          if (_type == 'SUBSCRIPTION') ...[
            const SizedBox(height: 16),
            ListTile(
              tileColor: theme.colorScheme.surfaceContainerHigh,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              leading: const Icon(Icons.calendar_month_outlined),
              title: const Text('Period'),
              subtitle: Text(_periodStr),
              trailing: const Icon(Icons.edit_outlined),
              onTap: _pickPeriod,
            ),
          ],
          const SizedBox(height: 28),
          FilledButton.icon(
            onPressed: _saving ? null : _submit,
            icon: _saving
                ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                : const Icon(Icons.check),
            label: Text(_saving ? 'Saving…' : 'Record payment'),
          ),
        ],
      ),
    );
  }
}
