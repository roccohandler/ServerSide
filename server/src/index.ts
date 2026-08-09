/**
 * Public surface of the server package.
 *
 * The Vercel adapter in `/api` imports from here, which is what keeps the deployment
 * target out of the application: nothing below this file knows how it is hosted.
 */
export { createApp, type CreateAppOptions } from './app/app.js';
export {
  EnvironmentConfigError,
  getServerConfig,
  loadServerConfig,
  type ServerConfig,
} from './config/env.js';
export { createLogger, type Logger, type LogLevel } from './lib/logger.js';
export { AppError, type AppErrorCode } from './lib/appError.js';
export type { ApiResponse, ApiFailure, ApiSuccess } from './lib/apiResponse.js';
export type { LeadSubmissionResponse } from './features/leads/lead.controller.js';
export { INQUIRY_TYPES, type InquiryType } from './features/leads/lead.types.js';
