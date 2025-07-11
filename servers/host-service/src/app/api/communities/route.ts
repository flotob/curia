import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Database connection (same pattern as verify-signature)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Database row type
interface CommunityRow {
  id: string;
  name: string;
  logo_url: string | null;
  is_public: boolean;
  requires_approval: boolean;
  created_at: Date;
  member_count: string;
}

export async function GET(request: NextRequest) {
  try {
    const client = await pool.connect();
    
    try {
      // Check for authentication
      const authHeader = request.headers.get('authorization');
      let userId: string | null = null;
      
      if (authHeader?.startsWith('Bearer ')) {
        const sessionToken = authHeader.substring(7);
        
        // Validate session and get user ID
        const sessionQuery = `
          SELECT s.user_id 
          FROM authentication_sessions s
          WHERE s.session_token = $1 
            AND s.is_active = true 
            AND s.expires_at > NOW()
        `;
        
        const sessionResult = await client.query(sessionQuery, [sessionToken]);
        if (sessionResult.rows.length > 0) {
          userId = sessionResult.rows[0].user_id;
          console.log('[communities] Authenticated request for user:', userId);
        }
      }

      if (userId) {
        // Authenticated user: separate their communities from available ones
        
        // Get user's existing communities
        const userCommunitiesQuery = `
          SELECT 
            c.id,
            c.name,
            c.logo_url,
            c.is_public,
            c.requires_approval,
            c.created_at,
            COUNT(uc_all.user_id) as member_count,
            uc_user.role as user_role,
            uc_user.last_visited_at
          FROM communities c
          JOIN user_communities uc_user ON c.id = uc_user.community_id 
            AND uc_user.user_id = $1 
            AND uc_user.status = 'active'
          LEFT JOIN user_communities uc_all ON c.id = uc_all.community_id 
            AND uc_all.status = 'active'
          GROUP BY c.id, c.name, c.logo_url, c.is_public, c.requires_approval, c.created_at, uc_user.role, uc_user.last_visited_at
          ORDER BY uc_user.last_visited_at DESC, c.created_at DESC
        `;

        // Get available communities (public, user is not a member)
        const availableCommunitiesQuery = `
          SELECT 
            c.id,
            c.name,
            c.logo_url,
            c.is_public,
            c.requires_approval,
            c.created_at,
            COUNT(uc.user_id) as member_count
          FROM communities c
          LEFT JOIN user_communities uc ON c.id = uc.community_id 
            AND uc.status = 'active'
          WHERE c.is_public = true
            AND c.id NOT IN (
              SELECT community_id 
              FROM user_communities 
              WHERE user_id = $1 AND status = 'active'
            )
          GROUP BY c.id, c.name, c.logo_url, c.is_public, c.requires_approval, c.created_at
          ORDER BY member_count DESC, c.created_at DESC
          LIMIT 10
        `;

        const [userCommunitiesResult, availableCommunitiesResult] = await Promise.all([
          client.query(userCommunitiesQuery, [userId]),
          client.query(availableCommunitiesQuery, [userId])
        ]);

        // Transform user's communities
        const userCommunities = userCommunitiesResult.rows.map((row: CommunityRow & { user_role: string }) => ({
          id: row.id,
          name: row.name,
          description: `Continue to ${row.name}`, // Different description for user's communities
          memberCount: parseInt(row.member_count) || 0,
          isPublic: row.is_public,
          gradientClass: getGradientClass(row.name),
          icon: getIconForCommunity(row.name),
          logoUrl: row.logo_url,
          requiresApproval: row.requires_approval,
          userRole: row.user_role, // Include user's role
          isMember: true // Flag to indicate user is already a member
        }));

        // Transform available communities
        const availableCommunities = availableCommunitiesResult.rows.map((row: CommunityRow) => ({
          id: row.id,
          name: row.name,
          description: `Join the ${row.name} community`,
          memberCount: parseInt(row.member_count) || 0,
          isPublic: row.is_public,
          gradientClass: getGradientClass(row.name),
          icon: getIconForCommunity(row.name),
          logoUrl: row.logo_url,
          requiresApproval: row.requires_approval,
          isMember: false // Flag to indicate user is not a member
        }));

        return NextResponse.json({ 
          userCommunities,
          availableCommunities,
          isAuthenticated: true
        });

      } else {
        // Unauthenticated user: show all public communities
        const result = await client.query(`
          SELECT 
            c.id,
            c.name,
            c.logo_url,
            c.is_public,
            c.requires_approval,
            c.created_at,
            COUNT(uc.user_id) as member_count
          FROM communities c
          LEFT JOIN user_communities uc ON c.id = uc.community_id 
            AND uc.status = 'active'
          WHERE c.is_public = true
          GROUP BY c.id, c.name, c.logo_url, c.is_public, c.requires_approval, c.created_at
          ORDER BY member_count DESC, c.created_at DESC
          LIMIT 10
        `);

        // Transform database data to match Community interface
        const communities = result.rows.map((row: CommunityRow) => ({
          id: row.id,
          name: row.name,
          description: `Join the ${row.name} community`,
          memberCount: parseInt(row.member_count) || 0,
          isPublic: row.is_public,
          gradientClass: getGradientClass(row.name),
          icon: getIconForCommunity(row.name),
          logoUrl: row.logo_url,
          requiresApproval: row.requires_approval,
          isMember: false
        }));

        return NextResponse.json({ 
          communities,
          userCommunities: [],
          availableCommunities: communities,
          isAuthenticated: false
        });
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[communities] Error fetching communities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch communities' },
      { status: 500 }
    );
  }
}

// Helper function to assign gradient classes based on community name
function getGradientClass(name: string): string {
  const gradients = [
    'gradient-pink-purple',
    'gradient-blue-cyan', 
    'gradient-emerald-teal',
    'gradient-orange-pink',
    'gradient-purple-blue',
    'gradient-cyan-emerald'
  ];
  
  // Use a simple hash of the name to consistently assign gradients
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return gradients[hash % gradients.length];
}

// Helper function to assign icons based on community name
function getIconForCommunity(name: string): string {
  const lowercaseName = name.toLowerCase();
  
  if (lowercaseName.includes('lukso')) return '🆙';
  if (lowercaseName.includes('ethereum')) return '⟠';
  if (lowercaseName.includes('defi') || lowercaseName.includes('governance')) return '🏛️';
  if (lowercaseName.includes('nft') || lowercaseName.includes('art')) return '🎨';
  if (lowercaseName.includes('gaming')) return '🎮';
  if (lowercaseName.includes('dao')) return '🏛️';
  if (lowercaseName.includes('social')) return '👥';
  if (lowercaseName.includes('tech')) return '🔧';
  if (lowercaseName.includes('crypto')) return '💎';
  
  // Default icons for variety
  const defaultIcons = ['🌟', '🚀', '💫', '🔮', '⚡', '🌈', '🎯', '🎪'];
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return defaultIcons[hash % defaultIcons.length];
} 