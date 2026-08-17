import { createApp } from './app/app.js';
import { EnvironmentConfigError, getServerConfig } from './config/env.js';
import { createLogger, describeError } from './lib/logger.js';

/**
 * Standalone entry point for local development and for any traditional Node host
 * (Railway, Render, Fly, a VPS). Vercel does not use this file — it imports the app
 * directly — which is what keeps the two deployment paths from drifting apart.
 */
function start(): void {
  let config;

  try {
    config = getServerConfig();
  } catch (error) {
    if (error instanceof EnvironmentConfigError) {
      // Configuration problems are for a human to fix, so print them plainly and stop
      // rather than starting a server that will fail on its first real request.
      process.stderr.write(`\n${error.message}\n\nSee .env.example for the expected values.\n\n`);
      process.exit(1);
    }
    throw error;
  }

  const logger = createLogger({
    level: config.logLevel,
    format: config.isProduction ? 'json' : 'pretty',
  });

  const app = createApp({ config, logger });

  const server = app.listen(config.port, () => {
    logger.info('server.started', {
      port: config.port,
      nodeEnv: config.nodeEnv,
      database: config.database.enabled ? 'configured' : 'not-configured',
      email: config.email.enabled ? 'configured' : 'not-configured',
    });
  });

  const shutdown = (signal: string) => {
    logger.info('server.shutting_down', { signal });
    server.close((error) => {
      if (error) {
        logger.error('server.shutdown_failed', describeError(error));
        process.exit(1);
      }
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // A rejection that reached here escaped the request pipeline; record it rather than
  // letting Node print a bare warning and carry on in an unknown state.
  process.on('unhandledRejection', (reason) => {
    logger.error('process.unhandled_rejection', describeError(reason));
  });
}

start();
