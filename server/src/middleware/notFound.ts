import type { RequestHandler } from 'express';
import { AppError } from '../lib/appError.js';

/**
 * Turns an unmatched route into a normal AppError so unknown paths get the same JSON
 * envelope as everything else instead of Express's default HTML error page.
 */
export const notFoundHandler: RequestHandler = (_request, _response, next) => {
  next(new AppError('NOT_FOUND', 'That endpoint does not exist.'));
};
