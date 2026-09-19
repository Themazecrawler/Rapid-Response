import { Request, Response, NextFunction } from 'express';
import { log } from '../observability';

export interface AppError extends Error {
  statusCode?: number;
  status?: number;
  isOperational?: boolean;
}

export const errorHandler = (err: AppError, req: Request, res: Response, _next: NextFunction) => {
  const statusCode = err.statusCode || err.status || 500;
  const message =
    statusCode >= 500 && process.env.NODE_ENV === 'production'
      ? 'Internal Server Error'
      : err.message || 'Internal Server Error';

  log('error', 'request_error', {
    requestId: req.requestId,
    status: statusCode,
    message: err.message || 'Internal Server Error',
    stack: err.stack,
  });

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      requestId: req.requestId,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
};
