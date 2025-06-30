/**
 * Base Repository
 * 
 * Provides common database operations and abstraction.
 * Eliminates direct SQL queries in business logic.
 */

import { query, getClient } from '@/lib/db';
import { DatabaseError, ErrorCode, ValidationError } from '@/lib/errors';
import { PoolClient, QueryResult } from 'pg';

// Base query options
export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
}

// Pagination result
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/**
 * Base Repository Class
 * 
 * Provides common database operations with error handling and abstraction.
 */
export abstract class BaseRepository {
  /**
   * Execute a query with standardized error handling
   */
  protected static async executeQuery<T = any>(
    queryText: string,
    values?: (string | number | boolean | null)[],
    client?: PoolClient
  ): Promise<QueryResult<T>> {
    try {
      if (client) {
        return await client.query(queryText, values);
      }
      return await query(queryText, values);
    } catch (error) {
      console.error('[BaseRepository] Query execution failed:', {
        query: queryText,
        values,
        error,
      });

      if (error instanceof Error) {
        // Check for common database constraint violations
        if (error.message.includes('duplicate key value')) {
          throw new DatabaseError(
            ErrorCode.DATABASE_CONSTRAINT_VIOLATION,
            'Duplicate key violation',
            { originalError: error.message, query: queryText }
          );
        }

        if (error.message.includes('foreign key constraint')) {
          throw new DatabaseError(
            ErrorCode.DATABASE_CONSTRAINT_VIOLATION,
            'Foreign key constraint violation',
            { originalError: error.message, query: queryText }
          );
        }

        if (error.message.includes('not-null constraint')) {
          throw new DatabaseError(
            ErrorCode.DATABASE_CONSTRAINT_VIOLATION,
            'Not-null constraint violation',
            { originalError: error.message, query: queryText }
          );
        }
      }

      throw new DatabaseError(
        ErrorCode.DATABASE_QUERY_ERROR,
        'Database query failed',
        { originalError: error, query: queryText, values }
      );
    }
  }

  /**
   * Execute query and return first row or null
   */
  protected static async findOne<T = any>(
    queryText: string,
    values?: (string | number | boolean | null)[],
    client?: PoolClient
  ): Promise<T | null> {
    const result = await this.executeQuery<T>(queryText, values, client);
    return result.rows[0] || null;
  }

  /**
   * Execute query and return all rows
   */
  protected static async findMany<T = any>(
    queryText: string,
    values?: (string | number | boolean | null)[],
    client?: PoolClient
  ): Promise<T[]> {
    const result = await this.executeQuery<T>(queryText, values, client);
    return result.rows;
  }

  /**
   * Execute query and return count
   */
  protected static async count(
    queryText: string,
    values?: (string | number | boolean | null)[],
    client?: PoolClient
  ): Promise<number> {
    const result = await this.executeQuery<{ count: string }>(queryText, values, client);
    return parseInt(result.rows[0]?.count || '0', 10);
  }

  /**
   * Execute insert and return the created record
   */
  protected static async insertOne<T = any>(
    queryText: string,
    values?: (string | number | boolean | null)[],
    client?: PoolClient
  ): Promise<T> {
    const result = await this.executeQuery<T>(queryText, values, client);
    if (result.rows.length === 0) {
      throw new DatabaseError(
        ErrorCode.DATABASE_QUERY_ERROR,
        'Insert operation returned no rows',
        { query: queryText, values }
      );
    }
    return result.rows[0];
  }

  /**
   * Execute update and return the updated record
   */
  protected static async updateOne<T = any>(
    queryText: string,
    values?: (string | number | boolean | null)[],
    client?: PoolClient
  ): Promise<T | null> {
    const result = await this.executeQuery<T>(queryText, values, client);
    return result.rows[0] || null;
  }

  /**
   * Execute delete and return count of deleted rows
   */
  protected static async deleteRows(
    queryText: string,
    values?: (string | number | boolean | null)[],
    client?: PoolClient
  ): Promise<number> {
    const result = await this.executeQuery(queryText, values, client);
    return result.rowCount || 0;
  }

  /**
   * Execute paginated query
   */
  protected static async findPaginated<T = any>(
    baseQuery: string,
    countQuery: string,
    values: (string | number | boolean | null)[] = [],
    options: QueryOptions = {},
    client?: PoolClient
  ): Promise<PaginatedResult<T>> {
    const {
      limit = 50,
      offset = 0,
      orderBy = 'created_at',
      orderDirection = 'DESC',
    } = options;

    // Validate pagination parameters
    if (limit < 1 || limit > 1000) {
      throw new ValidationError('Limit must be between 1 and 1000');
    }

    if (offset < 0) {
      throw new ValidationError('Offset must be non-negative');
    }

    // Add ordering and pagination to base query
    const paginatedQuery = `
      ${baseQuery}
      ORDER BY ${orderBy} ${orderDirection}
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `;

    const paginatedValues = [...values, limit, offset];

    // Execute both queries
    const [items, totalCount] = await Promise.all([
      this.findMany<T>(paginatedQuery, paginatedValues, client),
      this.count(countQuery, values, client),
    ]);

    return {
      items,
      total: totalCount,
      limit,
      offset,
      hasMore: offset + items.length < totalCount,
    };
  }

  /**
   * Execute operations within a transaction
   */
  protected static async withTransaction<T>(
    operation: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await getClient();
    
    try {
      await client.query('BEGIN');
      const result = await operation(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Build WHERE clause from filters
   */
  protected static buildWhereClause(
    filters: Record<string, any>,
    startParamIndex: number = 1
  ): { whereClause: string; values: any[]; nextParamIndex: number } {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = startParamIndex;

    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          if (value.length > 0) {
            const placeholders = value.map(() => `$${paramIndex++}`).join(', ');
            conditions.push(`${key} IN (${placeholders})`);
            values.push(...value);
          }
        } else {
          conditions.push(`${key} = $${paramIndex++}`);
          values.push(value);
        }
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    return {
      whereClause,
      values,
      nextParamIndex: paramIndex,
    };
  }

  /**
   * Validate required fields
   */
  protected static validateRequired(data: Record<string, any>, requiredFields: string[]): void {
    const missingFields = requiredFields.filter(field => {
      const value = data[field];
      return value === undefined || value === null || value === '';
    });

    if (missingFields.length > 0) {
      throw new ValidationError(
        `Required fields are missing: ${missingFields.join(', ')}`,
        { missingFields, data }
      );
    }
  }

  /**
   * Sanitize input data
   */
  protected static sanitizeInput(data: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        // Trim strings
        if (typeof value === 'string') {
          sanitized[key] = value.trim();
        } else {
          sanitized[key] = value;
        }
      }
    }

    return sanitized;
  }
}