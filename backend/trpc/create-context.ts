import { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { supabase } from "@/lib/supabase";

// Context creation function
export const createContext = async (opts: FetchCreateContextFnOptions) => {
  // Extract authorization header for auth
  const authorization = opts.req.headers.get('authorization');
  const token = authorization?.replace('Bearer ', '');
  
  return {
    req: opts.req,
    token,
    // You can add more context items here like database connections, auth, etc.
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

// Initialize tRPC
const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  // Validate the JWT token with Supabase
  if (!ctx.token) {
    throw new Error('Unauthorized');
  }

  try {
    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(ctx.token);
    
    if (error || !user) {
      throw new Error('Invalid token');
    }

    return next({
      ctx: {
        ...ctx,
        userId: user.id,
        user,
      },
    });
  } catch (error) {
    throw new Error('Unauthorized');
  }
});