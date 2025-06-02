import { z } from 'zod';
import { publicProcedure } from '../../../create-context';

const submitSupportSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  userEmail: z.string().email().optional(),
  deviceInfo: z.string().optional(),
  appVersion: z.string().optional(),
});

export const submitSupportProcedure = publicProcedure
  .input(submitSupportSchema)
  .mutation(async ({ input }) => {
    // In a real app, you would save this to a database
    // For now, we'll just log it and return a success message
    console.log('Support message received:', {
      message: input.message,
      userEmail: input.userEmail,
      deviceInfo: input.deviceInfo,
      appVersion: input.appVersion,
      timestamp: new Date().toISOString(),
    });

    // Simulate saving to database
    // await db.supportMessages.create({ data: input });

    return {
      success: true,
      message: 'Your message has been sent successfully! We will review it and respond if you provided an email address.',
    };
  });