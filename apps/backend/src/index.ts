import { app } from './app.js';
import { config } from './config.js';

const server = app.listen(config.port, () => {
  console.log(`[LoanLens Backend] Running on http://localhost:${config.port} in ${config.nodeEnv} mode`);
  console.log(`[LoanLens Backend] Allowed CORS Origin: ${config.frontendUrl}`);
});

function handleShutdown(signal: string) {
  console.log(`\n[LoanLens Backend] Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    console.log('[LoanLens Backend] HTTP server closed.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
