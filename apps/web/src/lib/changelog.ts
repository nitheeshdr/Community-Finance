/**
 * Release changelog — the single source shown on the public /changelog
 * page and, via WebView, inside the mobile app's About screen.
 * Newest first.
 */
export interface ChangelogEntry {
  version: string;
  date: string; // YYYY-MM-DD
  title: string;
  changes: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.5.0',
    date: '2026-07-24',
    title: 'Data management, searchable pickers & About',
    changes: [
      'Admin danger zone: clear data by section (payments, expenses, income, events, and more)',
      'Record payment: a single searchable member picker',
      'In-app What’s New and About pages',
    ],
  },
  {
    version: '1.4.0',
    date: '2026-07-24',
    title: 'Dues tracking, reports & family groups',
    changes: [
      'Monthly dues: see who has paid and who has not, per month',
      'Per-member ledger: every month paid or unpaid, with receipts',
      'Mobile admin: view and download financial reports (PDF / Excel / CSV)',
      'Group members by family / household',
    ],
  },
  {
    version: '1.3.0',
    date: '2026-07-24',
    title: 'Event funding modes & member payments',
    changes: [
      'Three event funding modes: from balance, split among members, collect a fixed amount',
      'Members can pay any pending due online, alongside AutoPay',
      'Admin tools in the app: members, approvals, events, income, announcements',
      'Delete payment records; edit, close, cancel and delete events',
    ],
  },
  {
    version: '1.2.0',
    date: '2026-07-23',
    title: 'Advanced exports & bulk import',
    changes: [
      'Advanced report export with custom range and filters',
      'Bulk member import from CSV',
      'Responsive admin dashboard with mobile navigation',
    ],
  },
  {
    version: '1.1.0',
    date: '2026-07-23',
    title: 'Material 3 mobile app',
    changes: [
      'Redesigned member app with Material 3 and a new brand identity',
      'Persistent login and secure token storage',
      'Realtime notifications',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-07-23',
    title: 'First release',
    changes: [
      'Multi-tenant community finance platform',
      'Subscriptions with Razorpay AutoPay and automatic receipts',
      'Events with auto-split budgets, expenses, income and transparent reports',
      'Append-only audit log and month-end snapshots',
    ],
  },
];
