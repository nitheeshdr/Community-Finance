import type { Metadata } from 'next';
import { CHANGELOG } from '@/lib/changelog';

export const metadata: Metadata = { title: "What's new · Community Finance" };

function formatDate(d: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(d));
}

/**
 * Public release notes — no auth. Also rendered inside the mobile app's
 * About screen via WebView, so it stands alone and stays lightweight.
 */
export default function ChangelogPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <header className="mb-8">
        <p className="text-sm font-medium text-primary">Community Finance</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">What&rsquo;s new</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every release, newest first.
        </p>
      </header>

      <div className="relative space-y-8 border-l pl-6">
        {CHANGELOG.map((entry) => (
          <section key={entry.version} className="relative">
            <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-background bg-primary" />
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-primary/10 px-2 py-0.5 text-sm font-semibold text-primary">
                v{entry.version}
              </span>
              <span className="text-xs text-muted-foreground">{formatDate(entry.date)}</span>
            </div>
            <h2 className="mt-2 text-lg font-semibold">{entry.title}</h2>
            <ul className="mt-2 space-y-1.5">
              {entry.changes.map((c, i) => (
                <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/60" />
                  {c}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <footer className="mt-12 text-center text-xs text-muted-foreground">
        Built by Setups Works
      </footer>
    </main>
  );
}
