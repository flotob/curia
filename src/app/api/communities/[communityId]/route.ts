/*
// This route is temporarily disabled due to TypeScript interface issues with withAuth
// Need to investigate the correct Next.js App Router + withAuth pattern
*/

// Placeholder exports to satisfy Next.js App Router
import { NextResponse } from 'next/server';
import { CommunitySettings } from '@/types/settings';

export interface ApiCommunity {
  id: string; // UUID string from the database
  name: string;
  settings: CommunitySettings;
  created_at: string;
  updated_at: string;
}

export async function GET() {
  return NextResponse.json({ error: 'Route temporarily disabled' }, { status: 503 });
}

export async function PATCH() {
  return NextResponse.json({ error: 'Route temporarily disabled' }, { status: 503 });
} 