import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { trpcServer } from '@hono/trpc-server';
import { appRouter } from './trpc/app-router';
import { createContext } from './trpc/create-context';
import { db } from './db';

const app = new Hono();

// Initialize demo account on server start
(async () => {
  try {
    await db.initializeDemoAccount();
    console.log('Backend database initialized');
  } catch (error) {
    console.error('Failed to initialize demo account:', error);
  }
})();

// Add CORS middleware with more permissive settings for development
app.use('*', cors({
  origin: (origin, c) => {
    // Allow all origins in development
    if (process.env.NODE_ENV === 'development') {
      return origin || '*';
    }
    
    // In production, be more restrictive
    const allowedOrigins = [
      'http://localhost:8081',
      'https://localhost:8081',
      'exp://192.168.1.100:8081',
      'exp://localhost:8081',
      'http://localhost:3000',
      'https://localhost:3000'
    ];
    
    return allowedOrigins.includes(origin || '') ? origin || null : null;
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400, // 24 hours
}));

// Add logger middleware
app.use('*', logger());

// Add error handling middleware
app.use('*', async (c, next) => {
  try {
    await next();
  } catch (error) {
    console.error('Request error:', error);
    return c.json({ 
      error: 'Internal Server Error',
      message: 'An unexpected error occurred'
    }, 500);
  }
});

// Health check endpoint
app.get('/health', (c) => {
  return c.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'Hours Tracker API is running',
    version: '1.0.0'
  });
});

// Root endpoint
app.get('/', (c) => {
  return c.json({ 
    message: 'Hours Tracker API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      trpc: '/api/trpc',
    },
    timestamp: new Date().toISOString()
  });
});

// API status endpoint
app.get('/api', (c) => {
  return c.json({ 
    message: 'Hours Tracker API - tRPC Endpoint',
    version: '1.0.0',
    trpcEndpoint: '/api/trpc',
    timestamp: new Date().toISOString()
  });
});

// tRPC endpoint with enhanced error handling
app.use('/api/trpc/*', trpcServer({
  router: appRouter,
  createContext,
  onError: ({ error, path, type, input }) => {
    console.error(`tRPC Error on ${path} (${type}):`, {
      error: error.message,
      code: error.code,
      input: input ? JSON.stringify(input).substring(0, 200) : 'none'
    });
  },
  responseMeta: ({ ctx, paths, errors, type }) => {
    // Add CORS headers to tRPC responses
    return {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    };
  },
}));

// Catch-all for API routes
app.all('/api/*', (c) => {
  return c.json({ 
    error: 'Not Found',
    message: 'API endpoint not found',
    availableEndpoints: ['/api/trpc'],
    requestedPath: c.req.path
  }, 404);
});

// 404 handler
app.notFound((c) => {
  return c.json({ 
    error: 'Not Found',
    message: 'The requested endpoint does not exist',
    availableEndpoints: ['/health', '/api/trpc'],
    requestedPath: c.req.path
  }, 404);
});

// Global error handler
app.onError((err, c) => {
  console.error('Global Server Error:', err);
  return c.json({ 
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
    timestamp: new Date().toISOString()
  }, 500);
});

export default app;