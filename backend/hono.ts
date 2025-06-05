import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { trpcServer } from '@hono/trpc-server';
import { appRouter } from './trpc/app-router';
import { createContext } from './trpc/create-context';

const app = new Hono();

// Enable CORS for all origins in development
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Health check endpoint
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// tRPC endpoint
app.use('/api/trpc/*', trpcServer({
  router: appRouter,
  createContext,
  onError: ({ error, path }) => {
    console.error(`tRPC Error on ${path}:`, error);
  },
}));

// Catch-all for API routes
app.all('/api/*', (c) => {
  return c.json({ error: 'API endpoint not found' }, 404);
});

// Default route
app.get('/', (c) => {
  return c.json({ 
    message: 'HoursTracker API Server',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      trpc: '/api/trpc',
    }
  });
});

export default app;