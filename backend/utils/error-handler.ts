/**
 * error-handler.ts
 * Standardized error handling for the application
 */

import { Request, Response, NextFunction } from 'express';

// Type definitions
interface ErrorDetails {
    [key: string]: any;
}

interface ErrorResponseBody {
    success: boolean;
    error: {
        code: string;
        message: string;
        statusCode: number;
        details?: ErrorDetails;
        stack?: string;
        timestamp: string;
    };
}

export class AppError extends Error {
    statusCode: number;
    code: string;
    details: ErrorDetails;
    timestamp: string;

    constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR', details: ErrorDetails = {}) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.timestamp = new Date().toISOString();
        Error.captureStackTrace(this, this.constructor);
    }
}

export class ValidationError extends AppError {
    constructor(message: string, details: ErrorDetails = {}) {
        super(message, 400, 'VALIDATION_ERROR', details);
    }
}

export class NotFoundError extends AppError {
    constructor(message: string, details: ErrorDetails = {}) {
        super(message, 404, 'NOT_FOUND', details);
    }
}

export class AuthenticationError extends AppError {
    constructor(message: string, details: ErrorDetails = {}) {
        super(message, 401, 'AUTHENTICATION_ERROR', details);
    }
}

export class AuthorizationError extends AppError {
    constructor(message: string, details: ErrorDetails = {}) {
        super(message, 403, 'AUTHORIZATION_ERROR', details);
    }
}

export class ConflictError extends AppError {
    constructor(message: string, details: ErrorDetails = {}) {
        super(message, 409, 'CONFLICT_ERROR', details);
    }
}

export class DatabaseError extends AppError {
    constructor(message: string, details: ErrorDetails = {}) {
        super(message, 500, 'DATABASE_ERROR', details);
    }
}

export class ExternalServiceError extends AppError {
    constructor(message: string, details: ErrorDetails = {}) {
        super(message, 503, 'EXTERNAL_SERVICE_ERROR', details);
    }
}

/**
 * Global error handler middleware
 */
export const errorHandler = (err: Error | AppError, req: Request, res: Response, next: NextFunction): Response => {
    let error: AppError = err as AppError;

    if (!(err instanceof AppError)) {
        if ((err as any).name === 'ValidationError') {
            error = new ValidationError(err.message, { details: (err as any).errors });
        } else if ((err as any).name === 'CastError') {
            error = new ValidationError('Invalid ID format');
        } else if ((err as any).name === 'JsonWebTokenError') {
            error = new AuthenticationError('Invalid token');
        } else if ((err as any).name === 'TokenExpiredError') {
            error = new AuthenticationError('Token expired');
        } else {
            error = new AppError(err.message, 500, 'INTERNAL_ERROR', {
                originalError: (err as any).name
            });
        }
    }

    const logLevel = error.statusCode >= 500 ? 'ERROR' : 'WARN';
    console.log(`[${logLevel}] ${error.code} - ${error.message}`);
    if (process.env.NODE_ENV === 'development') {
        console.log(`      Stack: ${error.stack}`);
    }

    return res.status(error.statusCode).json({
        success: false,
        error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode,
            ...(process.env.NODE_ENV === 'development' && { details: error.details }),
            timestamp: error.timestamp
        }
    });
};

/**
 * Async error wrapper
 */
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
    (req: Request, res: Response, next: NextFunction): Promise<any> => {
        return Promise.resolve(fn(req, res, next)).catch(next);
    };

/**
 * Error response formatter
 */
export const formatErrorResponse = (error: AppError | Error, statusCode: number = 500): ErrorResponseBody => {
    const appError = error as AppError;
    return {
        success: false,
        error: {
            code: appError.code || 'UNKNOWN_ERROR',
            message: error.message || 'An unexpected error occurred',
            statusCode,
            timestamp: new Date().toISOString(),
            ...(process.env.NODE_ENV === 'development' && {
                details: appError.details,
                stack: error.stack
            })
        }
    };
};

// CommonJS export
module.exports = {
    AppError,
    ValidationError,
    NotFoundError,
    AuthenticationError,
    AuthorizationError,
    ConflictError,
    DatabaseError,
    ExternalServiceError,
    errorHandler,
    asyncHandler,
    formatErrorResponse
};
