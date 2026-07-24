import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/config/env.dart';
import '../../shared/widgets/brand_logo.dart';

/// App version — kept in sync with pubspec `version`.
const String kAppVersion = '1.6.0';

class AboutScreen extends StatelessWidget {
  const AboutScreen({super.key});

  Future<void> _open(String url) async {
    await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cs = theme.colorScheme;

    return Scaffold(
      appBar: AppBar(title: const Text('About')),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          const SizedBox(height: 16),
          Center(
            child: Container(
              width: 88,
              height: 88,
              decoration: BoxDecoration(
                color: cs.primaryContainer,
                borderRadius: BorderRadius.circular(28),
              ),
              child: const Center(child: BrandLogo(size: 58)),
            ),
          ),
          const SizedBox(height: 16),
          Center(child: Text('Community Finance', style: theme.textTheme.headlineSmall)),
          const SizedBox(height: 4),
          Center(
            child: Text('Version $kAppVersion',
                style: theme.textTheme.bodyMedium?.copyWith(color: cs.onSurfaceVariant)),
          ),
          const SizedBox(height: 32),
          Center(
            child: Text('Built by', style: theme.textTheme.bodySmall?.copyWith(color: cs.onSurfaceVariant)),
          ),
          const SizedBox(height: 4),
          Center(child: Text('Setups Works', style: theme.textTheme.titleLarge)),
          const SizedBox(height: 16),
          Card(
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.language),
                  title: const Text('setups.works'),
                  onTap: () => _open('https://setups.works'),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.mail_outline),
                  title: const Text('info@setups.works'),
                  onTap: () => _open('mailto:info@setups.works'),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.new_releases_outlined),
                  title: const Text("What's new"),
                  trailing: const Icon(Icons.open_in_new, size: 18),
                  onTap: () => _open('${Env.webOrigin}/changelog'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
