import { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { initTRPC } from "@trpc/server";
import superjson from "superjson";

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
  // Simple auth check - in production you'd validate the JWT token
  if (!ctx.token) {
    throw new Error('Unauthorized');
  }
  return next({
    ctx: {
      ...ctx,
      userId: ctx.token, // In production, extract user ID from validated JWT
    },
  });
});