import app from './app.js';
import { prisma } from './lib/prisma.js';
import * as config from './config.js';

const configValue = (key: string, fallback = ''): string => {
  const moduleConfig = config as Record<string, unknown>;
  const appConfig = moduleConfig.config as { port?: number } | undefined;
  const nestedValues: Record<string, string | number | undefined> = {
    PORT: appConfig?.port,
  };
  const configured = moduleConfig[key] ?? nestedValues[key];
  if (typeof configured === 'number') {
    return String(configured);
  }

  return typeof configured === 'string' && configured.length > 0 ? configured : (process.env[key] ?? fallback);
};

const PORT = Number.parseInt(configValue('PORT', '4000'), 10);

const server = app.listen(PORT, () => {
  console.log(`SEO Vision AI API listening on port ${PORT}`);
});

const shutdown = async (signal: string): Promise<void> => {
  console.log(`${signal} received, shutting down API server`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
