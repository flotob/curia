/*
// This route is temporarily disabled due to TypeScript interface issues with withAuth
// Need to investigate the correct Next.js App Router + withAuth pattern
*/

// Placeholder exports to satisfy Next.js App Router
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ error: 'Route temporarily disabled' }, { status: 503 });
} 