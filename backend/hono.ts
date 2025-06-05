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
  return c.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'HoursTracker API Server is running'
  });
});

// tRPC endpoint with enhanced error handling
app.use('/api/trpc/*', trpcServer({
  router: appRouter,
  createContext,
  onError: ({ error, path, type, input }) => {
    console.error(`tRPC Error on ${path} (${type}):`, {
      message: error.message,
      code: error.code,
      input: input ? JSON.stringify(input).substring(0, 200) : 'none',
      stack: error.stack?.substring(0, 500)
    });
  },
  responseMeta: ({ ctx, paths, errors, type }) => {
    // Add custom headers for better debugging
    return {
      headers: {
        'X-tRPC-Path': paths?.join(',') || 'unknown',
        'X-tRPC-Type': type,
        'X-tRPC-Errors': errors.length.toString(),
      },
    };
  },
}));

// Catch-all for API routes
app.all('/api/*', (c) => {
  return c.json({ 
    error: 'API endpoint not found',
    path: c.req.path,
    method: c.req.method,
    availableEndpoints: [
      '/health',
      '/api/trpc/*'
    ]
  }, 404);
});

// Default route with more information
app.get('/', (c) => {
  return c.json({ 
    message: 'HoursTracker API Server',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      trpc: '/api/trpc',
      docs: 'https://trpc.io/docs'
    },
    environment: process.env.NODE_ENV || 'development'
  });
});

// Global error handler
app.onError((err, c) => {
  console.error('Global error handler:', err);
  
  return c.json({
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred',
    timestamp: new Date().toISOString(),
    path: c.req.path
  }, 500);
});

export default app;