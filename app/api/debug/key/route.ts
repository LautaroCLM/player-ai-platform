import { NextResponse } from "next/server";

export async function GET() {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || null;

  // return first/last 6 chars to avoid dumping full key in logs
  const masked = key
    ? `${key.slice(0, 6)}...${key.slice(-6)}`
    : null;

  return NextResponse.json({ masked, present: !!key });
}
