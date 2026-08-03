import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code?: string;
  public readonly details?: unknown;
  public readonly isOperational = true;

  constructor(message: string, statusCode = 500, code?: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const asyncHandler =
  <TRequest extends Request = Request, TResponse extends Response = Response>(
    handler: (req: TRequest, res: TResponse, next: NextFunction) => Promise<unknown> | unknown,
  ): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(handler(req as TRequest, res as TResponse, next)).catch(next);
  };

const isDevelopment = process.env.NODE_ENV !== 'production';

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  let statusCode = 500;
  let message = 'Internal server error';
  let code = 'INTERNAL_ERROR';
  let details: unknown;

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    code = error.code ?? code;
    details = error.details;
  } else if (error instanceof ZodError) {
    statusCode = 400;
    message = 'Validation failed';
    code = 'VALIDATION_ERROR';
    details = error.issues;
  } else if (typeof error === 'object' && error !== null && 'code' in error) {
    const prismaError = error as { code?: string; meta?: unknown };
    code = prismaError.code ?? code;
    details = prismaError.meta;

    if (prismaError.code === 'P2002') {
      statusCode = 409;
      message = 'A record with this value already exists';
    } else if (prismaError.code === 'P2025') {
      statusCode = 404;
      message = 'Record not found';
    } else {
      message = 'Database request failed';
    }
  } else if (error instanceof SyntaxError && 'body' in error) {
    statusCode = 400;
    message = 'Invalid JSON payload';
    code = 'INVALID_JSON';
  } else if (error instanceof Error) {
    message = error.message || message;
  }

  res.status(statusCode).json({
    error: {
      message,
      code,
      ...(details !== undefined ? { details } : {}),
      ...(isDevelopment && error instanceof Error ? { stack: error.stack } : {}),
    },
  });
};
