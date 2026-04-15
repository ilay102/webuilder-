/**
 * app/api/intake/route.ts
 * Vercel edge: receives form JSON → forwards to VPS with auth header.
 *
 * Required env vars (set in Vercel dashboard + .env.local):
 *   VPS_INTAKE_URL   = http://YOUR_VPS_IP:3001/api/intake
 *   INTAKE_SECRET    = some-long-random-secret
 */
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const vpsUrl = process.env.VPS_INTAKE_URL;
  const secret = process.env.INTAKE_SECRET;

  if (!vpsUrl) {
    return NextResponse.json({ error: 'VPS_INTAKE_URL not configured' }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  console.log('[intake] secret present:', !!secret, '| length:', secret?.length ?? 0);

  try {
    const upstream = await fetch(vpsUrl, {
      method:  'POST',
      headers: {
        'Content-Type':    'application/json',
        'x-intake-secret': secret ?? '',
      },
      body: JSON.stringify(body),
    });

    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });

  } catch (err: any) {
    return NextResponse.json({ error: `VPS unreachable: ${err.message}` }, { status: 502 });
  }
}
