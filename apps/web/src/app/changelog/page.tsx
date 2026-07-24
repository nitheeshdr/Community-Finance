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
 * Public release notes, styled in the app's Material 3 indigo theme.
 * Self-contained and light-only (explicit colors, not theme tokens) so it
 * renders identically inside the mobile app's WebView.
 */
export default function ChangelogPage() {
  return (
    <div style={{ backgroundColor: '#FCF8FF', minHeight: '100vh' }}>
      {/* Hero */}
      <header className="bg-[#4F46E5] px-6 pb-10 pt-12 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white/15">
          <svg width="40" height="40" viewBox="0 0 1024 1024" aria-hidden>
            <circle
              cx="512"
              cy="512"
              r="340"
              fill="none"
              stroke="#FFFFFF"
              strokeOpacity="0.3"
              strokeWidth="34"
            />
            <circle cx="512" cy="172" r="46" fill="#B9F6CA" />
            <text
              x="512"
              y="700"
              textAnchor="middle"
              fontFamily="Helvetica, Arial, sans-serif"
              fontWeight="bold"
              fontSize="520"
              fill="#FFFFFF"
            >
              ₹
            </text>
          </svg>
        </div>
        <h1 className="mt-4 text-2xl font-bold text-white">What&rsquo;s new</h1>
        <p className="mt-1 text-sm text-indigo-100">Every release, newest first</p>
      </header>

      {/* Timeline */}
      <main className="mx-auto max-w-2xl px-5 pb-16 pt-6">
        <div className="relative space-y-4 pl-6">
          {/* vertical line */}
          <span className="absolute bottom-2 left-[7px] top-3 w-0.5 bg-indigo-200" aria-hidden />

          {CHANGELOG.map((entry, idx) => (
            <section
              key={entry.version}
              className="relative rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5"
            >
              {/* dot */}
              <span
                className="absolute -left-[23px] top-6 h-4 w-4 rounded-full border-4 border-[#FCF8FF] bg-[#4F46E5]"
                aria-hidden
              />
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-sm font-bold text-[#4F46E5]">
                  v{entry.version}
                </span>
                {idx === 0 && (
                  <span className="rounded-full bg-[#B9F6CA] px-2 py-0.5 text-xs font-semibold text-[#00210A]">
                    Latest
                  </span>
                )}
                <span className="text-xs text-slate-400">{formatDate(entry.date)}</span>
              </div>
              <h2 className="mt-2 text-lg font-bold text-slate-900">{entry.title}</h2>
              <ul className="mt-3 space-y-2">
                {entry.changes.map((c, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-slate-600">
                    <svg
                      className="mt-0.5 h-4 w-4 shrink-0 text-[#4F46E5]"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 111.4-1.4l3.8 3.8 6.8-6.8a1 1 0 011.4 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {c}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <footer className="mt-10 text-center text-xs text-slate-400">
          Built by Setups Works
        </footer>
      </main>
    </div>
  );
}
