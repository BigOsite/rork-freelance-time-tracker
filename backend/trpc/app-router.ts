import { createTRPCRouter, publicProcedure } from "./create-context";
import { z } from "zod";
import hiRoute from "./routes/example/hi/route";

// In-memory storage for support messages (in production, this would be a database)
const supportMessages: Array<{
  id: string;
  message: string;
  userEmail?: string;
  deviceInfo?: string;
  appVersion?: string;
  createdAt: number;
  status: 'new' | 'in-progress' | 'resolved';
}> = [];

const supportRouter = createTRPCRouter({
  submit: publicProcedure
    .input(z.object({
      message: z.string().min(1, "Message is required"),
      userEmail: z.string().email().optional(),
      deviceInfo: z.string().optional(),
      appVersion: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const supportMessage = {
        id: Date.now().toString(),
        message: input.message,
        userEmail: input.userEmail,
        deviceInfo: input.deviceInfo,
        appVersion: input.appVersion,
        createdAt: Date.now(),
        status: 'new' as const,
      };

      // Store the message (in production, this would be saved to a database)
      supportMessages.push(supportMessage);

      return {
        success: true,
        messageId: supportMessage.id,
        message: "Your message has been submitted successfully. We'll get back to you soon!",
      };
    }),

  getAll: publicProcedure
    .query(async () => {
      // This would typically require admin authentication
      return supportMessages.sort((a, b) => b.createdAt - a.createdAt);
    }),
});

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  support: supportRouter,
});

export type AppRouter = typeof appRouter;