import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { query } from '@/lib/db';
import { resolveBoard } from '@/lib/boardPermissions';
import { PostSettings } from '@/types/settings';

interface ValidatePostRequest {
  title: string;
  content: string;
  tags?: string[];
  boardId: string;
  settings?: PostSettings;
  lockId?: number;
}

interface ValidationResult {
  valid: boolean;
  error?: string;
  details?: any;
}

// POST validation endpoint - validates post creation without database writes
async function validatePostHandler(req: AuthenticatedRequest) {
  const user = req.user;
  if (!user || !user.sub || !user.cid) {
    return NextResponse.json<ValidationResult>({ 
      valid: false, 
      error: 'Authentication required, or community ID missing in token' 
    }, { status: 401 });
  }
  
  const currentCommunityId = user.cid;
  const userRoles = user.roles;
  const isAdmin = user.adm || false;

  try {
    const body: ValidatePostRequest = await req.json();
    const { title, content, boardId, settings, lockId } = body;

    // Basic field validation
    if (!title || !content) {
      return NextResponse.json<ValidationResult>({ 
        valid: false, 
        error: 'Title and content are required' 
      }, { status: 400 });
    }

    if (!boardId) {
      return NextResponse.json<ValidationResult>({ 
        valid: false, 
        error: 'Board selection is required' 
      }, { status: 400 });
    }

    // Validate settings if provided
    if (settings) {
      const { SettingsUtils } = await import('@/types/settings');
      const validation = SettingsUtils.validatePostSettings(settings);
      if (!validation.isValid) {
        return NextResponse.json<ValidationResult>({ 
          valid: false, 
          error: 'Invalid post settings', 
          details: validation.errors 
        }, { status: 400 });
      }
    }

    // Verify the board is accessible to the user (owned or imported)
    const board = await resolveBoard(parseInt(boardId), currentCommunityId);

    if (!board) {
      return NextResponse.json<ValidationResult>({ 
        valid: false, 
        error: 'Board not found or not accessible' 
      }, { status: 400 });
    }

    const boardSettings = board.settings;
    
    // SECURITY: Verify user can access this board before allowing post creation
    const { canUserAccessBoard } = await import('@/lib/boardPermissions');
    if (!canUserAccessBoard(userRoles, boardSettings, isAdmin)) {
      console.warn(`[API POST /api/posts/validate] User ${user.sub} attempted to validate post in restricted board ${boardId}`);
      return NextResponse.json<ValidationResult>({ 
        valid: false, 
        error: 'You do not have permission to post in this board' 
      }, { status: 403 });
    }

    // 🚀 BOARD LOCK VERIFICATION: Check if user has verified board's lock requirements
    const { SettingsUtils } = await import('@/types/settings');
    const boardLockGating = SettingsUtils.getBoardLockGating(boardSettings);
    
    if (boardLockGating && boardLockGating.lockIds.length > 0) {
      console.log(`[API POST /api/posts/validate] Board ${boardId} has ${boardLockGating.lockIds.length} lock requirements, checking user verification...`);
      
      // Check user's verification status for required locks
      const lockIdPlaceholders = boardLockGating.lockIds.map((_, index) => `$${index + 2}`).join(', ');
      const verificationResult = await query(`
        SELECT lock_id FROM pre_verifications 
        WHERE user_id = $1 AND lock_id IN (${lockIdPlaceholders})
          AND verification_status = 'verified' AND expires_at > NOW()
      `, [user.sub, ...boardLockGating.lockIds]);
      
      const verifiedLockIds = new Set(verificationResult.rows.map(row => row.lock_id));
      const verifiedCount = verifiedLockIds.size;
      const requiredCount = boardLockGating.lockIds.length;
      
      // Apply fulfillment logic (ANY vs ALL)
      const hasAccess = boardLockGating.fulfillment === 'any'
        ? verifiedCount >= 1
        : verifiedCount >= requiredCount;
        
      if (!hasAccess) {
        console.log(`[API POST /api/posts/validate] User ${user.sub} failed board lock verification: ${verifiedCount}/${requiredCount} locks verified (${boardLockGating.fulfillment} mode)`);
        return NextResponse.json<ValidationResult>({ 
          valid: false,
          error: 'This board requires verification before you can post',
          details: {
            userMessage: 'Complete the verification requirements below to unlock posting',
            requiresVerification: true,
            verificationDetails: {
              lockIds: boardLockGating.lockIds,
              fulfillmentMode: boardLockGating.fulfillment,
              verifiedCount,
              requiredCount
            }
          }
        }, { status: 403 });
      }
      
      console.log(`[API POST /api/posts/validate] ✅ User ${user.sub} passed board lock verification: ${verifiedCount}/${requiredCount} locks verified`);
    }

    // Handle lock validation if lockId is provided
    if (lockId) {
      const lockIdNum = parseInt(lockId.toString(), 10);
      if (isNaN(lockIdNum)) {
        return NextResponse.json<ValidationResult>({ 
          valid: false, 
          error: 'Invalid lock ID' 
        }, { status: 400 });
      }

      // Get the lock and verify permissions
      const lockResult = await query(`
        SELECT l.*, ls.posts_using_lock
        FROM locks l
        LEFT JOIN lock_stats ls ON l.id = ls.id
        WHERE l.id = $1
      `, [lockIdNum]);

      if (lockResult.rows.length === 0) {
        return NextResponse.json<ValidationResult>({ 
          valid: false, 
          error: 'Lock not found' 
        }, { status: 404 });
      }

      const lock = lockResult.rows[0];

      // Verify lock belongs to board's community (handles shared boards correctly)
      if (lock.community_id !== board.community_id) {
        console.warn(`[API POST /api/posts/validate] User ${user.sub} attempted to use lock from community ${lock.community_id} on board from community ${board.community_id}`);
        return NextResponse.json<ValidationResult>({ 
          valid: false, 
          error: 'Lock not found' 
        }, { status: 404 });
      }

      // Check if user can use this lock
      const canUseLock = 
        lock.creator_user_id === user.sub || // Owner
        lock.is_public ||                    // Public
        lock.is_template ||                  // Template
        isAdmin;                             // Admin

      if (!canUseLock) {
        console.warn(`[API POST /api/posts/validate] User ${user.sub} attempted to use private lock ${lockIdNum}`);
        return NextResponse.json<ValidationResult>({ 
          valid: false, 
          error: 'You do not have permission to use this lock' 
        }, { status: 403 });
      }
    }
    
    // If we got here, validation passed
    console.log(`[API POST /api/posts/validate] ✅ Validation passed for user ${user.sub} on board ${boardId}`);
    return NextResponse.json<ValidationResult>({ valid: true });

  } catch (error) {
    console.error('[API POST /api/posts/validate] Validation error:', error);
    if (error instanceof SyntaxError) {
      return NextResponse.json<ValidationResult>({ 
        valid: false, 
        error: "Invalid JSON body" 
      }, { status: 400 });
    }
    return NextResponse.json<ValidationResult>({ 
      valid: false, 
      error: (error as Error).message 
    }, { status: 500 });
  }
}

export const POST = withAuth(validatePostHandler, false); 