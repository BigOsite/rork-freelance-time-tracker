import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { trpcServer } from '@hono/trpc-server';
import { appRouter } from './trpc/app-router';
import { createContext } from './trpc/create-context';

const app = new Hono();

// Add CORS middleware
app.use('*', cors({
  origin: ['http://localhost:8081', 'https://localhost:8081', 'exp://192.168.1.100:8081'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Add logger middleware
app.use('*', logger());

// Health check endpoint
app.get('/health', (c) => {
  return c.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'Hours Tracker API is running'
  });
});

// Root endpoint
app.get('/', (c) => {
  return c.json({ 
    message: 'Hours Tracker API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      trpc: '/api/trpc',
    }
  });
});

// tRPC endpoint
app.use('/api/trpc/*', trpcServer({
  router: appRouter,
  createContext,
  onError: ({ error, path }) => {
    console.error(`tRPC Error on ${path}:`, error);
  },
}));

// 404 handler
app.notFound((c) => {
  return c.json({ 
    error: 'Not Found',
    message: 'The requested endpoint does not exist',
    availableEndpoints: ['/health', '/api/trpc']
  }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Server Error:', err);
  return c.json({ 
    error: 'Internal Server Error',
    message: 'An unexpected error occurred'
  }, 500);
});

export default app;