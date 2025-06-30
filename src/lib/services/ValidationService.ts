import { ValidationError } from '@/lib/errors/ApiErrors';

/**
 * Pagination parameters interface
 */
export interface PaginationParams {
  limit: number;
  offset: number;
}

/**
 * Validation service providing common validation utilities
 * Eliminates repeated validation logic across API endpoints
 */
export class ValidationService {
  /**
   * Validates and parses ID parameters (used in 15+ endpoints)
   * @param idString - The ID string to validate
   * @param type - The type of ID for error messaging (e.g., 'post', 'board', 'lock')
   * @returns Parsed integer ID
   * @throws ValidationError if ID is invalid
   */
  static validateId(idString: string, type: string): number {
    const id = parseInt(idString, 10);
    if (isNaN(id) || id <= 0) {
      throw new ValidationError(`Invalid ${type} ID`);
    }
    return id;
  }

  /**
   * Validates and parses pagination parameters from URL search params
   * @param params - URLSearchParams object
   * @param defaultLimit - Default limit if not provided (default: 20)
   * @param maxLimit - Maximum allowed limit (default: 100)
   * @returns Parsed pagination parameters
   */
  static validatePagination(
    params: URLSearchParams, 
    defaultLimit: number = 20, 
    maxLimit: number = 100
  ): PaginationParams {
    const limit = Math.min(
      parseInt(params.get('limit') || defaultLimit.toString(), 10), 
      maxLimit
    );
    const offset = Math.max(0, parseInt(params.get('offset') || '0', 10));

    if (isNaN(limit) || limit <= 0) {
      throw new ValidationError('Invalid limit parameter');
    }
    
    if (isNaN(offset) || offset < 0) {
      throw new ValidationError('Invalid offset parameter');
    }

    return { limit, offset };
  }

  /**
   * Validates required fields in request body
   * @param body - Request body object
   * @param requiredFields - Array of required field names
   * @throws ValidationError if any required fields are missing
   */
  static validateRequiredFields(body: any, requiredFields: string[]): void {
    const missingFields = requiredFields.filter(field => {
      const value = body[field];
      return value === undefined || value === null || value === '';
    });

    if (missingFields.length > 0) {
      throw new ValidationError(
        `Missing required fields: ${missingFields.join(', ')}`
      );
    }
  }

  /**
   * Validates string length constraints
   * @param value - String to validate
   * @param fieldName - Field name for error messaging
   * @param minLength - Minimum length (default: 1)
   * @param maxLength - Maximum length (optional)
   * @throws ValidationError if constraints are violated
   */
  static validateStringLength(
    value: string | undefined | null,
    fieldName: string,
    minLength: number = 1,
    maxLength?: number
  ): void {
    if (!value || typeof value !== 'string') {
      throw new ValidationError(`${fieldName} must be a non-empty string`);
    }

    const trimmed = value.trim();
    
    if (trimmed.length < minLength) {
      throw new ValidationError(
        `${fieldName} must be at least ${minLength} character${minLength > 1 ? 's' : ''} long`
      );
    }

    if (maxLength && trimmed.length > maxLength) {
      throw new ValidationError(
        `${fieldName} must be no more than ${maxLength} characters long`
      );
    }
  }

  /**
   * Validates array constraints
   * @param value - Array to validate
   * @param fieldName - Field name for error messaging
   * @param minLength - Minimum array length (default: 0)
   * @param maxLength - Maximum array length (optional)
   * @throws ValidationError if constraints are violated
   */
  static validateArrayLength(
    value: any[] | undefined | null,
    fieldName: string,
    minLength: number = 0,
    maxLength?: number
  ): void {
    if (!Array.isArray(value)) {
      throw new ValidationError(`${fieldName} must be an array`);
    }

    if (value.length < minLength) {
      throw new ValidationError(
        `${fieldName} must have at least ${minLength} item${minLength > 1 ? 's' : ''}`
      );
    }

    if (maxLength && value.length > maxLength) {
      throw new ValidationError(
        `${fieldName} must have no more than ${maxLength} items`
      );
    }
  }

  /**
   * Validates boolean fields
   * @param value - Value to validate
   * @param fieldName - Field name for error messaging
   * @param required - Whether the field is required (default: false)
   * @throws ValidationError if validation fails
   */
  static validateBoolean(
    value: any,
    fieldName: string,
    required: boolean = false
  ): void {
    if (value === undefined || value === null) {
      if (required) {
        throw new ValidationError(`${fieldName} is required`);
      }
      return;
    }

    if (typeof value !== 'boolean') {
      throw new ValidationError(`${fieldName} must be a boolean`);
    }
  }

  /**
   * Validates enum values
   * @param value - Value to validate
   * @param fieldName - Field name for error messaging
   * @param allowedValues - Array of allowed values
   * @param required - Whether the field is required (default: true)
   * @throws ValidationError if value is not in allowed values
   */
  static validateEnum(
    value: any,
    fieldName: string,
    allowedValues: any[],
    required: boolean = true
  ): void {
    if (value === undefined || value === null) {
      if (required) {
        throw new ValidationError(`${fieldName} is required`);
      }
      return;
    }

    if (!allowedValues.includes(value)) {
      throw new ValidationError(
        `${fieldName} must be one of: ${allowedValues.join(', ')}`
      );
    }
  }

  /**
   * Validates JSON structure
   * @param value - Value to validate as JSON
   * @param fieldName - Field name for error messaging
   * @param required - Whether the field is required (default: true)
   * @throws ValidationError if JSON is invalid
   */
  static validateJson(
    value: any,
    fieldName: string,
    required: boolean = true
  ): any {
    if (value === undefined || value === null) {
      if (required) {
        throw new ValidationError(`${fieldName} is required`);
      }
      return null;
    }

    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error) {
        throw new ValidationError(`${fieldName} must be valid JSON`);
      }
    }

    if (typeof value === 'object') {
      return value;
    }

    throw new ValidationError(`${fieldName} must be a valid JSON object`);
  }

  /**
   * Validates search query parameters
   * @param query - Search query string
   * @param minLength - Minimum query length (default: 3)
   * @param maxLength - Maximum query length (default: 100)
   * @returns Trimmed query string
   * @throws ValidationError if query is invalid
   */
  static validateSearchQuery(
    query: string | null,
    minLength: number = 3,
    maxLength: number = 100
  ): string {
    if (!query || typeof query !== 'string') {
      throw new ValidationError('Search query is required');
    }

    const trimmed = query.trim();
    
    if (trimmed.length < minLength) {
      throw new ValidationError(
        `Search query must be at least ${minLength} characters long`
      );
    }

    if (trimmed.length > maxLength) {
      throw new ValidationError(
        `Search query must be no more than ${maxLength} characters long`
      );
    }

    return trimmed;
  }
}