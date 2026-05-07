/**
 * /pilot — Pilot results dashboard inside Mission Control.
 *
 * Reads from JJ's `/pilot` endpoint on the VPS (port 3002) which serves
 * pilot-results.json — a log of [WAITLIST:*] and [PRICE_FEEDBACK:*] events.
 */
import Shell from '@/app/shell';
import clsx  from 'clsx';

const JJ_BASE = process.env.JJ_BASE || 'http://204.168.207.116:3002';

export const dynamic = 'force-dynamic';

interface Event {
  kind:       'waitlist' | 'price_feedback';
  phone:      string;
  tier?:      'basic' | 'premium';
  setup?:     number | null;
  monthly?:   number | null;
  raw?:       string;
  company?:   string | null;
  ownerName?: string | null;
  city?:      string | null;
  ts:         string;
}

interface PilotData {
  summary: {
    total_events:        number;
    waitlist_total:      number;
    waitlist_basic:      number;
    waitlist_premium:    number;
    price_feedbacks:     number;
    avg_setup_offered:   number;
    avg_monthly_offered: number;
  };
  events: Event[];
}

async function loadPilot(): Promise<PilotData | null> {
  try {
    const r = await fetch(`${JJ_BASE}/pilot`, { cache: 'no-store' });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

export default async function PilotPage() {
  const data = await loadPilot();

  if (!data) {
    return (
      <Shell>
        <div className="h-full overflow-y-auto bg-bg p-8">
          <div className="max-w-4xl mx-auto">
            <Header />
            <div className="mt-6 p-6 rounded-lg bg-bg2 border border-border text-faint text-sm">
              <span className="text-danger">●</span> Could not reach JJ at <code className="text-muted">{JJ_BASE}/pilot</code>.
              Check that simple-jj is running on the VPS.
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  const s = data.summary;
  const conversionPct = s.total_events > 0
    ? Math.round((s.waitlist_total / (s.waitlist_total + s.price_feedbacks)) * 100) || 0
    : 0;

  return (
    <Shell>
      <div className="h-full overflow-y-auto bg-bg">
        <div className="max-w-5xl mx-auto p-8">
          <Header />

          {/* KPI cards */}
          <div className="mt-6 grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            <Kpi label="Total events"           value={s.total_events} />
            <Kpi label="Waitlist · yes @ price" value={s.waitlist_total} highlight />
            <Kpi label="↳ Basic (700)"          value={s.waitlist_basic}    sub={pct(s.waitlist_basic, s.waitlist_total)} />
            <Kpi label="↳ Premium (1,600)"      value={s.waitlist_premium}  sub={pct(s.waitlist_premium, s.waitlist_total)} />
            <Kpi label="Price feedbacks"        value={s.price_feedbacks} />
          </div>

          <div className="mt-3 grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <Kpi label="Avg setup offered"   value={s.avg_setup_offered   ? `${s.avg_setup_offered}₪`   : '—'} />
            <Kpi label="Avg monthly offered" value={s.avg_monthly_offered ? `${s.avg_monthly_offered}₪` : '—'} />
            <Kpi label="Conversion rate"     value={s.total_events ? `${conversionPct}%` : '—'} accent />
          </div>

          {/* Reading guide */}
          <div className="mt-6 rounded-lg bg-bg2 border border-border p-5">
            <div className="text-[11px] font-bold tracking-widest text-muted uppercase mb-2">How to read this</div>
            <ul className="space-y-1.5 text-[13px] text-muted">
              <li>If <span className="text-success font-bold">waitlist ≥ 60%</span> of leads who saw a demo → pricing works. Time to flip to live.</li>
              <li>If most price feedbacks cluster around the same number → that's your real market price.</li>
              <li>If <span className="text-warn font-bold">0 waitlist + many feedbacks at much lower prices</span> → 700 is too high for this market.</li>
            </ul>
          </div>

          {/* Events log */}
          <div className="mt-6">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-base font-bold text-white">Events</h2>
              <span className="text-[11px] text-faint">newest first · {data.events.length} total</span>
            </div>

            {data.events.length === 0 ? (
              <div className="rounded-lg bg-bg2 border border-border p-8 text-center">
                <div className="text-3xl mb-2">🦗</div>
                <p className="text-sm text-faint">No events yet — let JJ run on real leads, events appear here as they happen.</p>
              </div>
            ) : (
              <div className="rounded-lg bg-bg2 border border-border overflow-hidden">
                <table className="w-full text-[13px]">
                  <thead className="bg-bg3 text-[10px] uppercase tracking-widest text-faint">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-bold">When</th>
                      <th className="px-4 py-2.5 text-left font-bold">Kind</th>
                      <th className="px-4 py-2.5 text-left font-bold">Phone</th>
                      <th className="px-4 py-2.5 text-left font-bold">Company</th>
                      <th className="px-4 py-2.5 text-left font-bold">Tier / Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.events.map((e, i) => (
                      <tr key={i} className="border-t border-border/40 hover:bg-bg3/40">
                        <td className="px-4 py-2.5 text-faint whitespace-nowrap">
                          {new Date(e.ts).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="px-4 py-2.5">
                          <KindBadge kind={e.kind} />
                        </td>
                        <td className="px-4 py-2.5 text-muted font-mono text-[12px]">+{e.phone}</td>
                        <td className="px-4 py-2.5 text-white">
                          {e.company || <span className="text-faint">—</span>}
                          {e.city && <span className="text-faint text-[11px] ml-2">· {e.city}</span>}
                        </td>
                        <td className="px-4 py-2.5">
                          {e.kind === 'waitlist' ? (
                            <span className="text-success font-bold">
                              {e.tier === 'premium' ? 'Premium · 1,600₪' : 'Basic · 700₪'}
                            </span>
                          ) : (
                            <span className="text-warn font-bold">
                              {e.setup}₪{e.monthly ? ` + ${e.monthly}/mo` : ''}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="mt-8 text-[10px] text-faint text-center">
            🧪 Pilot Mode · production [CHECKOUT:*] tags inactive · server: 204.168.207.116:3002
          </div>
        </div>
      </div>
    </Shell>
  );
}

/* ── components ──────────────────────────────────────────── */

function Header() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-1">
        <span className="text-2xl">🧪</span>
        <h1 className="text-xl font-bold text-white tracking-tight">Pilot Results</h1>
        <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-warn/10 text-warn border border-warn/30">
          beta · no payments
        </span>
      </div>
      <p className="text-[13px] text-faint">
        Live data from JJ. <span className="text-success">Waitlist</span> = lead said yes at full price.
        <span className="text-warn ml-1">Price feedback</span> = lead's counter-offer.
      </p>
    </div>
  );
}

function Kpi({
  label, value, sub, highlight, accent,
}: {
  label: string; value: number | string; sub?: string; highlight?: boolean; accent?: boolean;
}) {
  return (
    <div
      className={clsx(
        'rounded-lg border p-4 transition-all',
        highlight ? 'bg-accent/5 border-accent/40' :
        accent    ? 'bg-bg2 border-accent2/30'    :
                    'bg-bg2 border-border',
      )}
    >
      <div className="text-[10px] font-bold tracking-widest uppercase text-faint">{label}</div>
      <div className={clsx(
        'text-2xl font-bold mt-1.5',
        highlight ? 'text-accent' :
        accent    ? 'text-accent2' :
                    'text-white',
      )}>{value}</div>
      {sub && <div className="text-[11px] text-faint mt-0.5">{sub}</div>}
    </div>
  );
}

function KindBadge({ kind }: { kind: 'waitlist' | 'price_feedback' }) {
  if (kind === 'waitlist') {
    return (
      <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/30">
        waitlist
      </span>
    );
  }
  return (
    <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-warn/10 text-warn border border-warn/30">
      feedback
    </span>
  );
}

function pct(num: number, total: number): string {
  if (!total) return '';
  return `${Math.round((num / total) * 100)}% of waitlist`;
}
