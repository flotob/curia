import { NextResponse } from 'next/server';
import { AuthenticatedRequest, withAuth } from '@/lib/withAuth';
import { query } from '@/lib/db';
import { UserSettings } from '@/types/user';

// GET /api/me/settings - Get current user settings only
async function getUserSettingsHandler(req: AuthenticatedRequest) {
  const user = req.user;
  
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 401 });
  }

  try {
    // Fetch user settings from database
    const result = await query(
      'SELECT settings FROM users WHERE user_id = $1',
      [user.sub]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userRow = result.rows[0];
    
    // Parse settings if they're stored as a string
    let settings: UserSettings = {};
    if (userRow.settings) {
      if (typeof userRow.settings === 'string') {
        settings = JSON.parse(userRow.settings);
      } else {
        settings = userRow.settings;
      }
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('[API /api/me/settings] Error fetching user settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user settings' },
      { status: 500 }
    );
  }
}

// PATCH /api/me/settings - Update current user settings only
async function updateUserSettingsHandler(req: AuthenticatedRequest) {
  const user = req.user;
  
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { settings } = body;

    if (!settings) {
      return NextResponse.json({ error: 'Settings are required' }, { status: 400 });
    }

    // Validate settings structure (basic validation)
    if (typeof settings !== 'object') {
      return NextResponse.json({ error: 'Settings must be an object' }, { status: 400 });
    }

    // Fetch current settings first to merge them properly
    const currentResult = await query(
      'SELECT settings FROM users WHERE user_id = $1',
      [user.sub]
    );

    let currentSettings: UserSettings = {};
    if (currentResult.rows.length > 0 && currentResult.rows[0].settings) {
      const current = currentResult.rows[0].settings;
      currentSettings = typeof current === 'string' ? JSON.parse(current) : current;
    }

    // Merge new settings with existing settings, handling field removal
    const mergedSettings: UserSettings = { ...currentSettings };
    
    // Check if we need to remove any fields that are present in current but missing from new
    const currentKeys = Object.keys(currentSettings);
    const newKeys = Object.keys(settings);
    
    // Remove fields that exist in current but are missing from new settings
    for (const key of currentKeys) {
      if (!newKeys.includes(key)) {
        delete mergedSettings[key as keyof UserSettings];
      }
    }
    
    // Apply each new setting, removing fields that are explicitly set to undefined/null
    for (const [key, value] of Object.entries(settings)) {
      if (value === undefined || value === null) {
        // Explicitly remove the field from merged settings
        delete mergedSettings[key as keyof UserSettings];
      } else {
        // Update/add the field
        (mergedSettings as any)[key] = value;
      }
    }

    // Update user settings in database
    const result = await query(
      `UPDATE users 
       SET settings = $1, updated_at = NOW() 
       WHERE user_id = $2 
       RETURNING settings`,
      [JSON.stringify(mergedSettings), user.sub]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updatedRow = result.rows[0];
    
    // Parse settings if they're stored as a string
    let parsedSettings = updatedRow.settings;
    if (typeof parsedSettings === 'string') {
      parsedSettings = JSON.parse(parsedSettings);
    }

    return NextResponse.json({ settings: parsedSettings });

  } catch (error) {
    console.error('[API /api/me/settings] Error updating user settings:', error);
    return NextResponse.json(
      { error: 'Failed to update user settings' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getUserSettingsHandler, false);
export const PATCH = withAuth(updateUserSettingsHandler, false); 