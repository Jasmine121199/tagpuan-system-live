import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './server/routes';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON Body parsing with generous payload limit for high-resolution menu photos
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'TAGPUAN ERP API',
      version: '1.0.0-phase1',
      timestamp: new Date().toISOString()
    });
  });

  // Mount API Router
  app.use('/api', apiRouter);

  // Catch unmatched API routes to ensure they ALWAYS return JSON and never fall through to Vite SPA HTML
  app.all(['/api', '/api/*'], (req, res) => {
    res.status(404).json({
      error: `API endpoint not found: ${req.method} ${req.originalUrl}`,
      code: 'NOT_FOUND'
    });
  });

  // Catch all /api requests that were not matched by apiRouter
  app.use('/api', (req, res) => {
    res.status(404).json({
      error: `API endpoint not found: ${req.method} ${req.originalUrl}`,
      code: 'NOT_FOUND'
    });
  });

  // API error handler ensuring any API error (including body-parser errors) returns clean JSON
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path.startsWith('/api') || req.originalUrl.startsWith('/api')) {
      console.error(`[API Error] ${req.method} ${req.originalUrl}:`, err);
      const status = err.status || err.statusCode || 500;
      res.status(status).json({
        error: err.message || 'Internal Server Error',
        code: err.code || 'API_ERROR'
      });
      return;
    }
    next(err);
  });

  // Vite middleware for development vs Static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[TAGPUAN ERP] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[TAGPUAN ERP] Server startup failed:', err);
  process.exit(1);
});
