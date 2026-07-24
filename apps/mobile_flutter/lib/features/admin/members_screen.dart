import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../shared/models/member.dart';
import '../../shared/widgets/async_view.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/status_chip.dart';
import 'data/admin_repository.dart';

class MembersScreen extends ConsumerStatefulWidget {
  const MembersScreen({super.key});

  @override
  ConsumerState<MembersScreen> createState() => _MembersScreenState();
}

class _MembersScreenState extends ConsumerState<MembersScreen> {
  String _search = '';

  Future<void> _changeStatus(Member m) async {
    final status = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (final s in const ['ACTIVE', 'INACTIVE', 'SUSPENDED'])
              ListTile(
                leading: const Icon(Icons.circle, size: 12),
                title: Text(s[0] + s.substring(1).toLowerCase()),
                trailing: m.status == s ? const Icon(Icons.check) : null,
                onTap: () => Navigator.pop(context, s),
              ),
          ],
        ),
      ),
    );
    if (status == null || status == m.status || !mounted) return;
    final messenger = ScaffoldMessenger.of(context);
    try {
      await ref.read(adminRepositoryProvider).changeMemberStatus(m.id, status);
      ref.invalidate(adminMembersProvider);
    } catch (e) {
      messenger.showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final members = ref.watch(adminMembersProvider(_search));

    return Scaffold(
      appBar: AppBar(title: const Text('Members')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
            child: SearchBar(
              hintText: 'Search name or phone',
              leading: const Icon(Icons.search),
              onChanged: (v) => setState(() => _search = v),
            ),
          ),
          Expanded(
            child: AsyncView<List<Member>>(
              value: members,
              onRetry: () => ref.invalidate(adminMembersProvider),
              data: (list) {
                if (list.isEmpty) {
                  return const EmptyState(
                    icon: Icons.group_outlined,
                    title: 'No members',
                    message: 'No members match your search.',
                  );
                }
                return ListView.builder(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                  itemCount: list.length,
                  itemBuilder: (context, i) {
                    final m = list[i];
                    return Card(
                      margin: const EdgeInsets.only(bottom: 8),
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                          child: Text(
                            m.name.isNotEmpty ? m.name[0].toUpperCase() : '?',
                            style: TextStyle(
                              color: Theme.of(context).colorScheme.onPrimaryContainer,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                        title: Text(m.name),
                        subtitle: Text(m.phone),
                        trailing: StatusChip(m.status),
                        onTap: () => _changeStatus(m),
                      ),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
