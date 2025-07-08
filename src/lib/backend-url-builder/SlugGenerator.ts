import { query } from '@/lib/db';
import { SlugCollisionResult } from './types';

/**
 * SlugGenerator handles converting titles and board names to URL-safe slugs
 * with collision detection and resolution
 */
export class SlugGenerator {
  private static readonly MAX_SLUG_LENGTH = 100;
  private static readonly MAX_COLLISION_ATTEMPTS = 10;

  /**
   * Convert a post title to a URL-safe slug
   */
  generateSlug(title: string): string {
    if (!title || title.trim().length === 0) {
      return 'untitled-post';
    }

    let slug = title
      .toLowerCase()
      .trim()
      // Replace multiple spaces with single space
      .replace(/\s+/g, ' ')
      // Replace spaces with hyphens
      .replace(/\s/g, '-')
      // Remove special characters, keep only alphanumeric and hyphens
      .replace(/[^a-z0-9-]/g, '')
      // Remove multiple consecutive hyphens
      .replace(/-+/g, '-')
      // Remove leading and trailing hyphens
      .replace(/^-+|-+$/g, '');

    // Handle edge case where slug becomes empty after cleaning
    if (slug.length === 0) {
      slug = 'untitled-post';
    }

    // Truncate to max length
    if (slug.length > SlugGenerator.MAX_SLUG_LENGTH) {
      slug = slug.substring(0, SlugGenerator.MAX_SLUG_LENGTH).replace(/-+$/, '');
    }

    return slug;
  }

  /**
   * Convert a board name to a URL-safe slug
   */
  generateBoardSlug(boardName: string): string {
    if (!boardName || boardName.trim().length === 0) {
      return 'general-discussion';
    }

    let slug = boardName
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/\s/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (slug.length === 0) {
      slug = 'general-discussion';
    }

    // Board slugs can be a bit shorter for cleaner URLs
    const maxBoardSlugLength = 50;
    if (slug.length > maxBoardSlugLength) {
      slug = slug.substring(0, maxBoardSlugLength).replace(/-+$/, '');
    }

    return slug;
  }

  /**
   * Resolve a unique slug by checking for collisions and adding numbered suffixes
   */
  async resolveUniqueSlug(
    baseSlug: string,
    communityShortId: string,
    boardSlug: string,
    excludePostId?: number
  ): Promise<SlugCollisionResult> {
    let attempts = 0;
    let currentSlug = baseSlug;

    while (attempts < SlugGenerator.MAX_COLLISION_ATTEMPTS) {
      const exists = await this.checkSlugExists(
        currentSlug,
        communityShortId,
        boardSlug,
        excludePostId
      );

      if (!exists) {
        return {
          slug: currentSlug,
          isUnique: true,
          attempts: attempts + 1
        };
      }

      attempts++;
      
      // Generate next slug with numbered suffix
      // Ensure the numbered suffix doesn't exceed max length
      const suffix = `-${attempts + 1}`;
      const maxBaseLength = SlugGenerator.MAX_SLUG_LENGTH - suffix.length;
      
      let trimmedBase = baseSlug;
      if (baseSlug.length > maxBaseLength) {
        trimmedBase = baseSlug.substring(0, maxBaseLength).replace(/-+$/, '');
      }
      
      currentSlug = `${trimmedBase}${suffix}`;
    }

    // If we've exhausted attempts, generate a random slug
    const randomSlug = this.generateRandomSlug(baseSlug);
    
    return {
      slug: randomSlug,
      isUnique: false, // We haven't verified this one, but it's very likely unique
      attempts
    };
  }

  /**
   * Check if a slug already exists in the database
   */
  private async checkSlugExists(
    slug: string,
    communityShortId: string,
    boardSlug: string,
    excludePostId?: number
  ): Promise<boolean> {
    try {
      let queryText = `
        SELECT 1 FROM links 
        WHERE slug = $1 
        AND community_short_id = $2 
        AND board_slug = $3
      `;
      const queryParams: (string | number)[] = [slug, communityShortId, boardSlug];

      // Exclude a specific post ID if provided (for updates)
      if (excludePostId !== undefined) {
        queryText += ` AND post_id != $4`;
        queryParams.push(excludePostId);
      }

      queryText += ` LIMIT 1`;

      const result = await query(queryText, queryParams);
      return result.rows.length > 0;
    } catch (error) {
      console.error('[SlugGenerator] Error checking slug existence:', error);
      // If DB check fails, assume it exists to be safe
      return true;
    }
  }

  /**
   * Generate a random slug as a last resort
   */
  private generateRandomSlug(baseSlug: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    const randomSuffix = `${timestamp}-${random}`;
    
    // Keep as much of the original slug as possible
    const maxBaseLength = SlugGenerator.MAX_SLUG_LENGTH - randomSuffix.length - 1;
    let trimmedBase = baseSlug;
    
    if (baseSlug.length > maxBaseLength) {
      trimmedBase = baseSlug.substring(0, maxBaseLength).replace(/-+$/, '');
    }
    
    return `${trimmedBase}-${randomSuffix}`;
  }

  /**
   * Validate a slug format
   */
  isValidSlug(slug: string): boolean {
    if (!slug || slug.length === 0) {
      return false;
    }

    // Check length
    if (slug.length > SlugGenerator.MAX_SLUG_LENGTH) {
      return false;
    }

    // Check format: only lowercase alphanumeric and hyphens
    const validSlugRegex = /^[a-z0-9-]+$/;
    if (!validSlugRegex.test(slug)) {
      return false;
    }

    // Check that it doesn't start or end with hyphens
    if (slug.startsWith('-') || slug.endsWith('-')) {
      return false;
    }

    // Check for consecutive hyphens
    if (slug.includes('--')) {
      return false;
    }

    return true;
  }
} 