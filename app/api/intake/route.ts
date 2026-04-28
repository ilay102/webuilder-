/**
 * Legacy /api/intake — deprecated.
 *
 * The unscoped endpoint is replaced by /api/intake/[slug]. The URL-scoped
 * route is the only authority for which client record gets touched, so a
 * stray POST here can't corrupt another client's data.
 */
import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'Deprecated. Use POST /api/intake/<slug> — slug must come from the URL path.' },
    { status: 410 },
  );
}
