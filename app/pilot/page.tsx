/**
 * /pilot — Pilot results dashboard inside Mission Control.
 *
 * Reads from JJ's `/pilot` endpoint on the VPS (port 3002) which serves
 * pilot-results.json — a log of [WAITLIST:*] and [PRICE_FEEDBACK:*] events.
 */
import Shell from '@/app/shell';

const JJ_BASE = process.env.JJ_BASE || 'http://204.168.207.116:3002';

export const dynamic = 'force-dynamic';

interface Event {
  kind:      'waitlist' | 'price_feedback';
  phone:     string;
  tier?:     'basic' | 'premium';
  setup?:    number | null;
  monthly?:  number | null;
  raw?:      string;
  company?:  string | null;
  ownerName?: string | null;
  city?:     string | null;
  ts:        string;
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
  } catch {
    return null;
  }
}

export default async function PilotPage() {
  const data = await loadPilot();

  if (!data) {
    return (
      <Frame>
        <p style={{ color: '#888' }}>Could not reach JJ at <code>{JJ_BASE}/pilot</code>. Check the VPS process.</p>
      </Frame>
    );
  }

  const s = data.summary;

  return (
    <Frame>
      <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>Pilot Results</h1>
      <p style={{ fontSize: 13, color: '#999', marginBottom: 24 }}>
        Live data from JJ. Waitlist = lead said yes at full price. Price feedback = lead's counter-offer.
      </p>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 28 }}>
        <Card label="Total events"      value={s.total_events} />
        <Card label="Waitlist (yes @ full price)" value={s.waitlist_total} highlight />
        <Card label="↳ Basic (700)"     value={s.waitlist_basic} />
        <Card label="↳ Premium (1,600)" value={s.waitlist_premium} />
        <Card label="Price feedbacks"   value={s.price_feedbacks} />
        <Card label="Avg setup offered" value={s.avg_setup_offered ? `${s.avg_setup_offered}₪` : '—'} />
        <Card label="Avg monthly offered" value={s.avg_monthly_offered ? `${s.avg_monthly_offered}₪/mo` : '—'} />
      </div>

      {/* Decision matrix */}
      <div style={{ background: '#fff8e6', border: '1px solid #f4d778', borderRadius: 10, padding: 16, marginBottom: 28, fontSize: 14, color: '#5c4a0e' }}>
        <strong>How to read this:</strong>
        <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
          <li>If <strong>waitlist ≥ 60%</strong> of leads who saw a demo → pricing works. Time to flip to live.</li>
          <li>If most price feedbacks cluster around the same number → that's your real market price.</li>
          <li>If <strong>0 waitlist + many feedbacks at much lower prices</strong> → 700 is too high for this market.</li>
        </ul>
      </div>

      {/* Events log */}
      <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>Events (newest first)</h2>
      {data.events.length === 0 ? (
        <p style={{ color: '#999', fontSize: 14 }}>No events yet. Run JJ on real leads — events show up here as they happen.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e5e5' }}>
              <th style={TH}>When</th>
              <th style={TH}>Kind</th>
              <th style={TH}>Phone</th>
              <th style={TH}>Company</th>
              <th style={TH}>Tier / Price</th>
            </tr>
          </thead>
          <tbody>
            {data.events.map((e, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={TD}>{new Date(e.ts).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' })}</td>
                <td style={TD}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 99,
                    background: e.kind === 'waitlist' ? '#dcfce7' : '#fef3c7',
                    color:      e.kind === 'waitlist' ? '#166534' : '#92400e',
                  }}>
                    {e.kind === 'waitlist' ? 'WAITLIST' : 'FEEDBACK'}
                  </span>
                </td>
                <td style={TD}>+{e.phone}</td>
                <td style={TD}>{e.company || <span style={{ color: '#aaa' }}>—</span>}</td>
                <td style={{ ...TD, fontWeight: 600 }}>
                  {e.kind === 'waitlist'
                    ? <span style={{ color: '#166534' }}>{e.tier === 'premium' ? 'Premium · 1,600' : 'Basic · 700'}</span>
                    : <span style={{ color: '#92400e' }}>{e.setup}₪{e.monthly ? ` + ${e.monthly}/mo` : ''}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Frame>
  );
}

const TH: React.CSSProperties = { textAlign: 'left', padding: '10px 8px', color: '#666', fontWeight: 700 };
const TD: React.CSSProperties = { padding: '10px 8px' };

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <Shell>
      <div style={{
        height: '100%', overflowY: 'auto',
        background: '#fafaf7', color: '#1a1a1a',
        fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif', padding: '32px 28px',
      }}>
        <div style={{ maxWidth: 980, margin: '0 auto' }}>{children}</div>
      </div>
    </Shell>
  );
}

function Card({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div style={{
      background: '#fff', border: highlight ? '2px solid #2d6b55' : '1px solid #e5e5e5',
      borderRadius: 10, padding: 16,
    }}>
      <div style={{ fontSize: 11, color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4, color: highlight ? '#2d6b55' : '#1a1a1a' }}>{value}</div>
    </div>
  );
}
