/*
// This route is temporarily disabled due to TypeScript interface issues with withAuth
// Need to investigate the correct Next.js App Router + withAuth pattern
*/

// Placeholder exports to satisfy Next.js App Router
import { NextResponse } from 'next/server';
import { AuthenticatedRequest, withAuth, RouteContext } from '@/lib/withAuth';
import { query } from '@/lib/db';
import { CommunitySettings } from '@/types/settings';

export interface ApiCommunity {
  id: string; // UUID string from the database
  name: string;
  settings: CommunitySettings;
  created_at: string;
  updated_at: string;
}

// GET a specific community
async function getCommunityHandler(req: AuthenticatedRequest, context: RouteContext) {
  const params = await context.params;
  const { communityId } = params;
  const userId = req.user?.sub;

  console.log(`[API] GET /api/communities/${communityId} called by user ${userId}`);

  try {
    const result = await query(
      'SELECT id, name, settings, created_at, updated_at FROM communities WHERE id = $1',
      [communityId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    const community: ApiCommunity = result.rows[0];
    return NextResponse.json(community);
  } catch (error) {
    console.error(`[API] Error fetching community ${communityId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch community' }, { status: 500 });
  }
}

export const GET = withAuth(getCommunityHandler, false);

// PATCH (update) a specific community
async function updateCommunityHandler(req: AuthenticatedRequest, context: RouteContext) {
  const params = await context.params;
  const { communityId } = params;
  const userId = req.user?.sub;

  console.log(`[API] PATCH /api/communities/${communityId} called by user ${userId}`);

  try {
    const body = await req.json();
    const { name, settings } = body;

    // Build dynamic query based on what fields are provided
    const updateFields: string[] = [];
    const updateValues: (string | number | boolean | null)[] = [];
    let paramCount = 1;

    if (name !== undefined) {
      updateFields.push(`name = $${paramCount}`);
      updateValues.push(name);
      paramCount++;
    }

    if (settings !== undefined) {
      updateFields.push(`settings = $${paramCount}`);
      updateValues.push(JSON.stringify(settings));
      paramCount++;
    }

    if (updateFields.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    // Always update the updated_at timestamp
    updateFields.push('updated_at = NOW()');
    
    // Add the WHERE clause parameter
    updateValues.push(communityId);

    const updateQuery = `
      UPDATE communities 
      SET ${updateFields.join(', ')} 
      WHERE id = $${paramCount} 
      RETURNING id, name, settings, created_at, updated_at
    `;

    console.log(`[API] Executing query: ${updateQuery}`, updateValues);

    const result = await query(updateQuery, updateValues);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    const community: ApiCommunity = result.rows[0];
    // Parse settings if they're stored as a string
    if (typeof community.settings === 'string') {
      community.settings = JSON.parse(community.settings);
    }
    
    return NextResponse.json(community);
  } catch (error) {
    console.error(`[API] Error updating community ${communityId}:`, error);
    return NextResponse.json({ error: 'Failed to update community' }, { status: 500 });
  }
}

export const PATCH = withAuth(updateCommunityHandler, true); // Admin only 