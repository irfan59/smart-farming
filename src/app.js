import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import pinoHttp from 'pino-http';
import env from './config/env.js';
import { errorHandler } from './middleware/error.js';
import authRoutes from './routes/auth.routes.js';
import meRoutes from './routes/me.routes.js';
import catalogRoutes from './routes/catalog.routes.js';
import plotsRoutes from './routes/plots.routes.js';
import cropCyclesRoutes from './routes/cropCycles.routes.js';
import transactionsRoutes from './routes/transactions.routes.js';
import uploadsRoutes from './routes/uploads.routes.js';
import reportsRoutes from './routes/reports.routes.js';
import announcementsRoutes from './routes/announcements.routes.js';
import adminRoutes from './routes/admin.routes.js';

export function buildApp() {
  const app = express();
  app.use(helmet());
  app.use(express.json({ limit: '1mb' }));

  const origins = env.CORS_ORIGINS ? env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean) : [];
  app.use(cors({ origin: origins.length ? origins : true, credentials: true }));

  if (env.NODE_ENV !== 'test') app.use(pinoHttp());

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

  app.use('/api/auth', authRoutes);
  app.use('/api/me', meRoutes);
  app.use('/api/catalog', catalogRoutes);
  app.use('/api/plots', plotsRoutes);
  app.use('/api/crop-cycles', cropCyclesRoutes);
  app.use('/api/transactions', transactionsRoutes);
  app.use('/api/uploads', uploadsRoutes);
  app.use('/api/reports', reportsRoutes);
  app.use('/api/announcements', announcementsRoutes);
  app.use('/api/admin', adminRoutes);

  app.use((req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } }));
  app.use(errorHandler);
  return app;
}
