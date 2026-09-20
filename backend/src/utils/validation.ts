import { NextFunction, Request, Response } from 'express';
import { matchedData, query, validationResult } from 'express-validator';

export const paginationValidators = [
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('offset').optional().isInt({ min: 0, max: 10000 }).toInt(),
];

export const rejectInvalidRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: { message: 'Validation failed', details: errors.array() },
    });
  }
  return next();
};

export const getPagination = (req: Request): { limit: number; offset: number } => {
  const { limit, offset } = matchedData(req, { locations: ['query'] });
  return {
    limit: typeof limit === 'number' ? limit : 50,
    offset: typeof offset === 'number' ? offset : 0,
  };
};
