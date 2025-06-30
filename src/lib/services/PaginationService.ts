import { query } from '@/lib/db';
import { ValidationService, PaginationParams } from './ValidationService';

/**
 * Paginated response interface
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

/**
 * Pagination service providing common pagination utilities
 * Eliminates repeated pagination logic across API endpoints
 */
export class PaginationService {
  /**
   * Parses pagination parameters from URL search params
   * @param searchParams - URLSearchParams object
   * @param defaultLimit - Default limit if not provided (default: 20)
   * @param maxLimit - Maximum allowed limit (default: 100)
   * @returns Parsed pagination parameters
   */
  static parseParams(
    searchParams: URLSearchParams, 
    defaultLimit: number = 20, 
    maxLimit: number = 100
  ): PaginationParams {
    return ValidationService.validatePagination(searchParams, defaultLimit, maxLimit);
  }

  /**
   * Executes a paginated database query with automatic count calculation
   * @param mainQuery - Main query string with placeholders for LIMIT and OFFSET
   * @param countQuery - Count query string (SELECT COUNT(*) format)
   * @param params - Query parameters (without LIMIT and OFFSET)
   * @param pagination - Pagination parameters
   * @param transformer - Optional function to transform each row
   * @returns Paginated response with data and pagination metadata
   */
  static async executePaginatedQuery<T>(
    mainQuery: string,
    countQuery: string,
    params: any[],
    pagination: PaginationParams,
    transformer?: (row: any) => T
  ): Promise<PaginatedResponse<T>> {
    // Execute both queries in parallel for better performance
    const [dataResult, countResult] = await Promise.all([
      query(mainQuery, [...params, pagination.limit, pagination.offset]),
      query(countQuery, params)
    ]);

    // Transform data if transformer provided
    const items = transformer 
      ? dataResult.rows.map(transformer)
      : dataResult.rows;

    const total = parseInt(countResult.rows[0]?.total || '0', 10);

    return {
      data: items,
      pagination: {
        total,
        page: Math.floor(pagination.offset / pagination.limit) + 1,
        limit: pagination.limit,
        hasMore: pagination.offset + pagination.limit < total
      }
    };
  }

  /**
   * Builds pagination metadata for manual pagination scenarios
   * @param total - Total number of items
   * @param pagination - Pagination parameters
   * @returns Pagination metadata
   */
  static buildPaginationMeta(
    total: number,
    pagination: PaginationParams
  ): PaginatedResponse<any>['pagination'] {
    return {
      total,
      page: Math.floor(pagination.offset / pagination.limit) + 1,
      limit: pagination.limit,
      hasMore: pagination.offset + pagination.limit < total
    };
  }

  /**
   * Builds SQL LIMIT and OFFSET clause
   * @param pagination - Pagination parameters
   * @param paramStartIndex - Starting parameter index for placeholders
   * @returns SQL clause and parameter values
   */
  static buildLimitOffset(
    pagination: PaginationParams,
    paramStartIndex: number
  ): { clause: string; params: number[] } {
    return {
      clause: `LIMIT $${paramStartIndex} OFFSET $${paramStartIndex + 1}`,
      params: [pagination.limit, pagination.offset]
    };
  }

  /**
   * Creates a count query from a main query by replacing SELECT fields with COUNT(*)
   * @param mainQuery - Main query string
   * @returns Count query string
   */
  static createCountQuery(mainQuery: string): string {
    // Remove ORDER BY clause (not needed for counting)
    const withoutOrderBy = mainQuery.replace(/ORDER BY[^;]*$/i, '');
    
    // Replace SELECT fields with COUNT(*)
    // This is a simple implementation - for complex queries, provide custom count query
    const countQuery = withoutOrderBy.replace(
      /SELECT\s+.*?\s+FROM/i,
      'SELECT COUNT(*) as total FROM'
    );
    
    // Remove LIMIT and OFFSET
    return countQuery.replace(/LIMIT\s+\$\d+(\s+OFFSET\s+\$\d+)?$/i, '');
  }

  /**
   * Validates and normalizes cursor-based pagination parameters
   * @param cursor - Cursor string from request
   * @param limit - Limit from request
   * @param defaultLimit - Default limit if not provided
   * @param maxLimit - Maximum allowed limit
   * @returns Normalized cursor pagination parameters
   */
  static validateCursorPagination(
    cursor: string | null,
    limit: string | null,
    defaultLimit: number = 20,
    maxLimit: number = 100
  ): { cursor: string | null; limit: number } {
    const normalizedLimit = Math.min(
      parseInt(limit || defaultLimit.toString(), 10),
      maxLimit
    );

    if (isNaN(normalizedLimit) || normalizedLimit <= 0) {
      throw new Error('Invalid limit parameter');
    }

    // Basic cursor validation (implementation depends on cursor format)
    if (cursor && typeof cursor !== 'string') {
      throw new Error('Invalid cursor parameter');
    }

    return {
      cursor: cursor || null,
      limit: normalizedLimit
    };
  }

  /**
   * Helper for building dynamic WHERE clauses with pagination
   * @param baseWhere - Base WHERE clause
   * @param filters - Additional filter conditions
   * @returns Combined WHERE clause
   */
  static buildWhereClause(
    baseWhere: string,
    filters: Array<{ condition: string; value: any }>
  ): { where: string; params: any[] } {
    let whereClause = baseWhere;
    const params: any[] = [];
    let paramIndex = 1;

    filters.forEach(filter => {
      if (filter.value !== undefined && filter.value !== null && filter.value !== '') {
        whereClause += ` AND ${filter.condition.replace(/\$\d+/g, `$${paramIndex}`)}`;
        params.push(filter.value);
        paramIndex++;
      }
    });

    return { where: whereClause, params };
  }
}