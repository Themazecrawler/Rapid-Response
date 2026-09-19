import { Request, Response } from 'express';
import { errorHandler, AppError } from '../middleware/errorHandler';

const mockRes = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

describe('errorHandler', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    jest.restoreAllMocks();
  });

  it('defaults to 500 and a generic message when the error has neither', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = mockRes();
    const err: AppError = new Error('') as AppError;
    err.message = '';

    errorHandler(err, {} as Request, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ message: 'Internal Server Error' }),
      })
    );
  });

  it('uses the error-provided status code and message when present', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = mockRes();
    const err: AppError = new Error('Not found') as AppError;
    err.statusCode = 404;

    errorHandler(err, {} as Request, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ message: 'Not found' }) })
    );
  });

  it('omits the stack trace outside development', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    process.env.NODE_ENV = 'production';
    const res = mockRes();
    const err: AppError = new Error('boom') as AppError;

    errorHandler(err, {} as Request, res, jest.fn());

    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.error.stack).toBeUndefined();
  });

  it('includes the stack trace in development', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    process.env.NODE_ENV = 'development';
    const res = mockRes();
    const err: AppError = new Error('boom') as AppError;

    errorHandler(err, {} as Request, res, jest.fn());

    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.error.stack).toBeDefined();
  });
});
