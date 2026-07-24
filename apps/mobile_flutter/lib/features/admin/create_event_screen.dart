import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import 'data/admin_repository.dart';
import '../events/data/events_repository.dart';

class CreateEventScreen extends ConsumerStatefulWidget {
  const CreateEventScreen({super.key});

  @override
  ConsumerState<CreateEventScreen> createState() => _CreateEventScreenState();
}

class _CreateEventScreenState extends ConsumerState<CreateEventScreen> {
  final _name = TextEditingController();
  final _budget = TextEditingController();
  String _category = 'TEMPLE_FESTIVAL';
  String _funding = 'SPLIT';
  DateTime? _date;
  bool _saving = false;

  static const _categories = {
    'TEMPLE_FESTIVAL': 'Temple festival',
    'SPORTS': 'Sports',
    'ANNUAL_MEETING': 'Annual meeting',
    'CHARITY': 'Charity',
    'EMERGENCY_COLLECTION': 'Emergency collection',
    'OTHER': 'Other',
  };

  @override
  void dispose() {
    _name.dispose();
    _budget.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _date ?? DateTime.now(),
      firstDate: DateTime(2020),
      lastDate: DateTime(2100),
    );
    if (picked != null) setState(() => _date = picked);
  }

  Future<void> _submit() async {
    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);
    final rupees = double.tryParse(_budget.text.trim());
    if (_name.text.trim().isEmpty) {
      messenger.showSnackBar(const SnackBar(content: Text('Enter an event name')));
      return;
    }
    if (_date == null) {
      messenger.showSnackBar(const SnackBar(content: Text('Pick a date')));
      return;
    }
    if (rupees == null || rupees < 0) {
      messenger.showSnackBar(const SnackBar(content: Text('Enter a valid budget')));
      return;
    }
    setState(() => _saving = true);
    try {
      await ref.read(adminRepositoryProvider).createEvent(
            name: _name.text.trim(),
            category: _category,
            date: DateFormat('yyyy-MM-dd').format(_date!),
            budget: (rupees * 100).round(),
            fundingMode: _funding,
          );
      ref.invalidate(eventsProvider);
      messenger.showSnackBar(const SnackBar(content: Text('Event created')));
      navigator.pop();
    } catch (e) {
      setState(() => _saving = false);
      messenger.showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final dateLabel = _date == null ? 'Pick a date' : DateFormat('d MMM yyyy').format(_date!);

    return Scaffold(
      appBar: AppBar(title: const Text('Create event')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TextField(
            controller: _name,
            decoration: const InputDecoration(
              labelText: 'Event name',
              prefixIcon: Icon(Icons.event_outlined),
            ),
          ),
          const SizedBox(height: 20),
          Text('Category', style: theme.textTheme.labelLarge),
          const SizedBox(height: 8),
          DropdownMenu<String>(
            expandedInsets: EdgeInsets.zero,
            initialSelection: _category,
            onSelected: (v) => setState(() => _category = v ?? _category),
            dropdownMenuEntries: [
              for (final e in _categories.entries)
                DropdownMenuEntry(value: e.key, label: e.value),
            ],
          ),
          const SizedBox(height: 16),
          ListTile(
            tileColor: theme.colorScheme.surfaceContainerHigh,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            leading: const Icon(Icons.calendar_month_outlined),
            title: const Text('Date'),
            subtitle: Text(dateLabel),
            trailing: const Icon(Icons.edit_calendar_outlined),
            onTap: _pickDate,
          ),
          const SizedBox(height: 20),
          TextField(
            controller: _budget,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.]'))],
            decoration: const InputDecoration(
              labelText: 'Budget (₹)',
              prefixIcon: Icon(Icons.currency_rupee),
            ),
          ),
          const SizedBox(height: 20),
          Text('Funding', style: theme.textTheme.labelLarge),
          const SizedBox(height: 8),
          SegmentedButton<String>(
            selected: {_funding},
            onSelectionChanged: (s) => setState(() => _funding = s.first),
            segments: const [
              ButtonSegment(value: 'BALANCE', label: Text('Balance')),
              ButtonSegment(value: 'SPLIT', label: Text('Split')),
              ButtonSegment(value: 'COLLECT', label: Text('Collect')),
            ],
          ),
          const SizedBox(height: 28),
          FilledButton.icon(
            onPressed: _saving ? null : _submit,
            icon: _saving
                ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                : const Icon(Icons.check),
            label: Text(_saving ? 'Creating…' : 'Create event'),
          ),
        ],
      ),
    );
  }
}
