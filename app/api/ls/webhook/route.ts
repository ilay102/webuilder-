/** @deprecated — Migrated to Polar.sh. Configure webhook at POST /api/polar/webhook */
import { NextResponse } from 'next/server'
export async function POST() {
  return NextResponse.json(
    { error: 'Lemon Squeezy webhook removed. Use /api/polar/webhook' },
    { status: 410 },
  )
}
