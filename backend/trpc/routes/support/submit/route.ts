import { z } from 'zod';
import { publicProcedure } from '../../create-context';

const supportInputSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  userEmail: z.string().email().optional(),
  deviceInfo: z.string().optional(),
  appVersion: z.string().optional(),
});

export const submitSupportProcedure = publicProcedure
  .input(supportInputSchema)
  .mutation(async ({ input }: { input: z.infer<typeof supportInputSchema> }) => {
    // In a real app, you'd save this to a database
    console.log('Support message received:', input);
    
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      success: true,
      message: 'Your support request has been submitted successfully. We will get back to you soon.',
    };
  });