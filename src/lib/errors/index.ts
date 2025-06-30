/**
 * Error Handling System
 * 
 * Standardized error handling for the entire application.
 * Exports all error types, handlers, and response formats.
 */

// Error Types
export {
  ErrorCode,
  AppError,
  AuthenticationError,
  ValidationError,
  NotFoundError,
  ConflictError,
  DatabaseError,
  ExternalServiceError,
  VerificationError,
  InternalServerError,
  RateLimitError,
} from './ErrorTypes';

// API Response Formats
export {
  type ApiErrorResponse,
  type ApiSuccessResponse,
  type ApiResponse,
  createErrorResponse,
  createSuccessResponse,
  type LegacyErrorFormats,
} from './ApiErrorResponse';

// Error Handler
export {
  ErrorHandler,
  LogLevel,
  type ErrorContext,
} from './ErrorHandler';

// Convenience exports for common operations
export { ErrorHandler as Handler } from './ErrorHandler';
export { createErrorResponse as errorResponse } from './ApiErrorResponse';
export { createSuccessResponse as successResponse } from './ApiErrorResponse';