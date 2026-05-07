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
  const totalDecisions = s.waitlist_total + s.price_feedbacks;
  const conversionPct = totalDecisions > 0
    ? Math.round((s.waitlist_total / totalDecisions) * 100)
    : 0;
  const basicPct   = s.waitlist_total ? Math.round((s.waitlist_basic   / s.waitlist_total) * 100) : 0;
  const premiumPct = s.waitlist_total ? Math.round((s.waitlist_premium / s.waitlist_total) * 100) : 0;

  return (
    <Shell>
      <div className="h-full overflow-y-auto bg-bg">
        <div className="max-w-5xl mx-auto p-8">
          <Header />

          {/* HERO — the one number that matters */}
          <div className="mt-8 rounded-xl border border-accent/40 bg-gradient-to-br from-accent/10 to-transparent p-7">
            <div className="flex items-end justify-between flex-wrap gap-6">
              <div>
                <div className="text-[10px] font-bold tracking-widest uppercase text-muted mb-2">Conversion at full price</div>
                <div className="flex items-baseline gap-3">
                  <span className="text-6xl font-black text-accent leading-none tracking-tight">
                    {totalDecisions > 0 ? `${conversionPct}%` : '—'}
                  </span>
                  {totalDecisions > 0 && (
                    <span className="text-sm text-muted font-medium">
                      {s.waitlist_total} of {totalDecisions} decided to commit
                    </span>
                  )}
                </div>
                <div className="text-[12px] text-faint mt-2 max-w-md">
                  {totalDecisions === 0 ? (
                    <>Waiting for first decision events from JJ.</>
                  ) : conversionPct >= 60 ? (
                    <span className="text-success">↑ Strong signal. Pricing works at this market.</span>
                  ) : conversionPct >= 30 ? (
                    <span className="text-warn">→ Mixed signal. More data needed (target: 20+ events).</span>
                  ) : (
                    <span className="text-danger">↓ Weak signal. Price likely too high for this market.</span>
                  )}
                </div>
              </div>
              <div className="text-[11px] text-faint border-l border-border/50 pl-5">
                <div className="mb-3">
                  <div className="text-faint mb-0.5">Total events</div>
                  <div className="text-2xl font-bold text-white">{s.total_events}</div>
                </div>
                <div>
                  <div className="text-faint mb-0.5">Decisions made</div>
                  <div className="text-2xl font-bold text-white">{totalDecisions}</div>
                </div>
              </div>
            </div>
          </div>

          {/* TWO COLUMNS: Said yes  /  Said no but countered */}
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {/* WAITLIST */}
            <div className="rounded-xl border border-success/30 bg-bg2 p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-success" />
                <span className="text-[11px] font-bold tracking-widest uppercase text-success">Waitlist · yes at full price</span>
              </div>
              <div className="text-4xl font-black text-white tracking-tight mb-4">{s.waitlist_total}</div>
              <div className="space-y-2.5">
                <TierBar label="Basic (700₪)"     count={s.waitlist_basic}   total={s.waitlist_total} pct={basicPct}   color="bg-success/60" />
                <TierBar label="Premium (1,600₪)" count={s.waitlist_premium} total={s.waitlist_total} pct={premiumPct} color="bg-success" />
              </div>
            </div>

            {/* PRICE FEEDBACK */}
            <div className="rounded-xl border border-warn/30 bg-bg2 p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-warn" />
                <span className="text-[11px] font-bold tracking-widest uppercase text-warn">Price feedback · counter-offers</span>
              </div>
              <div className="text-4xl font-black text-white tracking-tight mb-4">{s.price_feedbacks}</div>
              <div className="space-y-2.5">
                <Stat label="Avg setup offered"    value={s.avg_setup_offered   ? `${s.avg_setup_offered}₪`     : '—'} ref="vs 700₪"  />
                <Stat label="Avg monthly offered"  value={s.avg_monthly_offered ? `${s.avg_monthly_offered}₪/mo` : '—'} ref="vs 70₪"   />
              </div>
            </div>
          </div>

          {/* Reading guide */}
          <div className="mt-6 rounded-lg bg-bg2 border border-border p-5">
            <div className="text-[11px] font-bold tracking-widest text-muted uppercase mb-3">📖 How to read this</div>
            <div className="space-y-2 text-[13px]">
              <div className="flex items-start gap-2.5">
                <span className="text-success font-bold mt-px">≥60%</span>
                <span className="text-muted">→ pricing works. Flip to live mode.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="text-warn font-bold mt-px">30-60%</span>
                <span className="text-muted">→ keep collecting (need 20+ events to be sure).</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="text-danger font-bold mt-px">&lt;30%</span>
                <span className="text-muted">→ price too high. Look at avg counter-offers, that's your real market price.</span>
              </div>
            </div>
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

function TierBar({ label, count, total, pct, color }: {
  label: string; count: number; total: number; pct: number; color: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-[12px] mb-1">
        <span className="text-muted">{label}</span>
        <span className="text-white font-bold">{count}{total > 0 && <span className="text-faint font-normal ml-1">· {pct}%</span>}</span>
      </div>
      <div className="h-1.5 bg-bg3 rounded-full overflow-hidden">
        <div className={clsx('h-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Stat({ label, value, ref }: { label: string; value: string; ref?: string }) {
  return (
    <div className="flex items-baseline justify-between text-[12px] py-1.5 border-b border-border/30 last:border-0">
      <span className="text-muted">{label}</span>
      <span className="text-white font-bold">
        {value}
        {ref && <span className="text-faint font-normal ml-2 text-[11px]">{ref}</span>}
      </span>
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

