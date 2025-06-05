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
    return {
      ...shape,
      data: {
        ...shape.data,
        code: error.code,
      },
    };
  },
});

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
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
      });
    }

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