/** @deprecated — Migrated to Polar.sh. Use POST /api/polar/create-checkout */
import { NextResponse } from 'next/server'
export async function POST() {
  return NextResponse.json(
    { error: 'Lemon Squeezy removed. Use POST /api/polar/create-checkout' },
    { status: 410 },
  )
}
