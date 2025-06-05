import { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { supabase } from "@/lib/supabase";

// Context creation function
export const createContext = async (opts: FetchCreateContextFnOptions) => {
  try {
    // Extract authorization header for auth
    const authorization = opts.req.headers.get('authorization');
    const token = authorization?.replace('Bearer ', '');
    
    console.log('Creating TRPC context with token:', token ? 'present' : 'missing');
    
    return {
      req: opts.req,
      token,
      // You can add more context items here like database connections, auth, etc.
    };
  } catch (error) {
    console.error('Error creating context:', error);
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to create context',
    });
  }
};

export type Context = Awaited<ReturnType<typeof createContext>>;

// Initialize tRPC
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter: ({ shape, error }) => {
    console.log('TRPC Error:', error.message, 'Code:', error.code);
    return {
      ...shape,
      data: {
        ...shape.data,
        code: error.code,
        httpStatus: getHTTPStatusCodeFromError(error),
      },
    };
  },
});

// Helper function to map tRPC error codes to HTTP status codes
function getHTTPStatusCodeFromError(error: any): number {
  switch (error.code) {
    case 'PARSE_ERROR':
      return 400;
    case 'BAD_REQUEST':
      return 400;
    case 'UNAUTHORIZED':
      return 401;
    case 'FORBIDDEN':
      return 403;
    case 'NOT_FOUND':
      return 404;
    case 'METHOD_NOT_SUPPORTED':
      return 405;
    case 'TIMEOUT':
      return 408;
    case 'CONFLICT':
      return 409;
    case 'PRECONDITION_FAILED':
      return 412;
    case 'PAYLOAD_TOO_LARGE':
      return 413;
    case 'UNPROCESSABLE_CONTENT':
      return 422;
    case 'TOO_MANY_REQUESTS':
      return 429;
    case 'CLIENT_CLOSED_REQUEST':
      return 499;
    case 'INTERNAL_SERVER_ERROR':
      return 500;
    default:
      return 500;
  }
}

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  // Validate the JWT token with Supabase
  if (!ctx.token) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'No authorization token provided',
    });
  }

  try {
    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(ctx.token);
    
    if (error || !user) {
      console.error('Token validation error:', error);
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
      });
    }

    console.log('Token validated for user:', user.id);

    return next({
      ctx: {
        ...ctx,
        userId: user.id,
        user,
      },
    });
  } catch (error: any) {
    console.error('Token validation error:', error);
    
    if (error.code) {
      throw error;
    }
    
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Token validation failed',
    });
  }
});