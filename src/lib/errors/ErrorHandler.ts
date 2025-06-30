/**
 * Centralized Error Handler
 * 
 * Provides unified error processing for the entire application.
 * Handles logging, response formatting, and error classification.
 */

import { NextResponse } from 'next/server';
import { 
  AppError, 
  ErrorCode, 
  AuthenticationError, 
  ValidationError, 
  NotFoundError, 
  DatabaseError,
  InternalServerError 
} from './ErrorTypes';
import { ApiErrorResponse, createErrorResponse } from './ApiErrorResponse';

/**
 * Error logging levels
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

/**
 * Error context for enhanced logging
 */
export interface ErrorContext {
  userId?: string;
  requestId?: string;
  endpoint?: string;
  method?: string;
  userAgent?: string;
  ip?: string;
  timestamp?: string;
  [key: string]: unknown;
}

/**
 * Centralized error handler class
 */
export class ErrorHandler {
  /**
   * Handle application errors and return NextResponse
   */
  static handleApiError(
    error: unknown,
    context?: ErrorContext
  ): NextResponse<ApiErrorResponse> {
    const { appError, logLevel } = this.classifyError(error);
    const requestId = context?.requestId || appError.requestId || this.generateRequestId();
    
    // Log the error with context
    this.logError(appError, logLevel, { ...context, requestId });
    
    // Create standardized response
    const errorResponse = createErrorResponse(
      appError.code,
      appError.message,
      appError.details,
      requestId
    );
    
    return NextResponse.json(errorResponse, { 
      status: appError.statusCode,
      headers: {
        'X-Request-ID': requestId,
        'X-Error-Code': appError.code,
      }
    });
  }

  /**
   * Handle client-side errors and return error object
   */
  static handleClientError(
    error: unknown,
    context?: Partial<ErrorContext>
  ): ApiErrorResponse {
    const { appError } = this.classifyError(error);
    const requestId = context?.requestId || this.generateRequestId();
    
    // Log client errors (less verbose than server errors)
    console.warn(`[Client Error] ${appError.code}: ${appError.message}`, {
      requestId,
      details: appError.details,
      ...context,
    });
    
    return createErrorResponse(
      appError.code,
      appError.message,
      appError.details,
      requestId
    );
  }

  /**
   * Classify unknown errors into AppError instances
   */
  private static classifyError(error: unknown): {
    appError: AppError;
    logLevel: LogLevel;
  } {
    // Already an AppError
    if (error instanceof AppError) {
      const logLevel = this.getLogLevelForError(error);
      return { appError: error, logLevel };
    }

    // Standard Error objects
    if (error instanceof Error) {
      const appError = this.convertErrorToAppError(error);
      return { appError, logLevel: LogLevel.ERROR };
    }

    // String errors
    if (typeof error === 'string') {
      const appError = new InternalServerError(error);
      return { appError, logLevel: LogLevel.ERROR };
    }

    // Unknown error types
    const appError = new InternalServerError('An unexpected error occurred', error);
    return { appError, logLevel: LogLevel.ERROR };
  }

  /**
   * Convert generic Error to appropriate AppError
   */
  private static convertErrorToAppError(error: Error): AppError {
    const message = error.message || 'Unknown error';

    // Check for common error patterns
    if (message.includes('not found') || message.includes('Not found')) {
      return new NotFoundError('Resource', { originalError: error.message });
    }

    if (message.includes('unauthorized') || message.includes('authentication')) {
      return new AuthenticationError(ErrorCode.AUTH_UNAUTHORIZED, message);
    }

    if (message.includes('validation') || message.includes('invalid')) {
      return new ValidationError(message, { originalError: error.message });
    }

    if (message.includes('database') || message.includes('query')) {
      return new DatabaseError(ErrorCode.DATABASE_QUERY_ERROR, message, { originalError: error.message });
    }

    // Default to internal server error
    return new InternalServerError(message, { originalError: error.message });
  }

  /**
   * Determine appropriate log level based on error type
   */
  private static getLogLevelForError(error: AppError): LogLevel {
    if (error instanceof AuthenticationError) {
      return LogLevel.WARN; // Auth errors are expected, log as warning
    }

    if (error instanceof ValidationError) {
      return LogLevel.INFO; // Validation errors are user errors, log as info
    }

    if (error instanceof NotFoundError) {
      return LogLevel.INFO; // Not found is often user error
    }

    if (error instanceof DatabaseError) {
      return LogLevel.ERROR; // Database errors are critical
    }

    // Default to error level
    return LogLevel.ERROR;
  }

  /**
   * Log errors with appropriate level and context
   */
  private static logError(
    error: AppError,
    level: LogLevel,
    context?: ErrorContext
  ): void {
    const logData = {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      timestamp: error.timestamp,
      requestId: error.requestId,
      stack: error.stack,
      details: error.details,
      context,
    };

    const logMessage = `[${error.code}] ${error.message}`;

    switch (level) {
      case LogLevel.ERROR:
        console.error(logMessage, logData);
        break;
      case LogLevel.WARN:
        console.warn(logMessage, logData);
        break;
      case LogLevel.INFO:
        console.info(logMessage, logData);
        break;
      case LogLevel.DEBUG:
        console.debug(logMessage, logData);
        break;
    }

    // In production, you might want to send errors to external monitoring
    if (process.env.NODE_ENV === 'production' && level === LogLevel.ERROR) {
      this.sendToExternalMonitoring(error, context);
    }
  }

  /**
   * Send critical errors to external monitoring (placeholder)
   */
  private static sendToExternalMonitoring(
    error: AppError,
    context?: ErrorContext
  ): void {
    // TODO: Implement Sentry, LogRocket, or other monitoring service
    // Example:
    // Sentry.captureException(error, { 
    //   tags: { code: error.code },
    //   extra: { context }
    // });
    
    console.log(`[Monitoring] Would send error ${error.code} to external service`, {
      error: error.message,
      context,
    });
  }

  /**
   * Generate a unique request ID
   */
  private static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create error from validation failures (helper)
   */
  static createValidationError(
    field: string,
    value: unknown,
    reason: string,
    requestId?: string
  ): ValidationError {
    return new ValidationError(
      `Validation failed for field '${field}': ${reason}`,
      { field, value, reason },
      requestId
    );
  }

  /**
   * Create error from authentication failures (helper)
   */
  static createAuthError(
    code: ErrorCode = ErrorCode.AUTH_UNAUTHORIZED,
    message?: string,
    requestId?: string
  ): AuthenticationError {
    return new AuthenticationError(code, message, undefined, requestId);
  }

  /**
   * Create error from resource not found (helper)
   */
  static createNotFoundError(
    resource: string,
    id?: string | number,
    requestId?: string
  ): NotFoundError {
    const message = id ? `${resource} with ID ${id}` : resource;
    return new NotFoundError(message, { resource, id }, requestId);
  }
}