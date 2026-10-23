import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { errorHandler, AppError } from './middleware/errorHandler.js';
import {
  type HealthResponse,
  type AppInfoResponse,
  INITIAL_MODULES
} from '@loanlens/shared';
import { loanAdvisorRouter } from './modules/loanAdvisor/loanAdvisor.routes.js';

export const app = express();

const startTime = Date.now();

// Configure CORS
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests (e.g. curl, tests, server-to-server) or configured frontend
      if (!origin || origin === config.frontendUrl) {
        callback(null, true);
      } else {
        callback(new AppError(403, `CORS origin '${origin}' is not permitted`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
  })
);

app.use(express.json());

// Base API route
app.get('/api', (_req, res) => {
  const info: AppInfoResponse = {
    name: 'LoanLens AI API',
    version: '0.1.0',
    description: 'Intelligent Lending Platform & Decision Support System',
    modules: INITIAL_MODULES
  };

  res.status(200).json(info);
});

// Health check endpoint
app.get('/api/health', (_req, res) => {
  const health: HealthResponse = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Number(((Date.now() - startTime) / 1000).toFixed(2)),
    environment: config.nodeEnv,
    service: 'loanlens-backend'
  };

  res.status(200).json(health);
});

// Loan Advisor Module Routes
app.use('/api/loan-advisor', loanAdvisorRouter);

// 404 Handler
app.use((req, _res, next) => {
  next(new AppError(404, `Route not found: ${req.method} ${req.path}`));
});

// Centralized error handler
app.use(errorHandler);
