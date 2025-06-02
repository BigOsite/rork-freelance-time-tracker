import { z } from 'zod';
import { publicProcedure } from '../../../create-context';

const supportInputSchema = z.object({
  message: z.string().min(10, 'Message must be at least 10 characters'),
  userEmail: z.string().email('Invalid email address'),
  deviceInfo: z.string().optional(),
  appVersion: z.string().optional(),
});

export const submitSupportProcedure = publicProcedure
  .input(supportInputSchema)
  .mutation(async ({ input }: { input: z.infer<typeof supportInputSchema> }) => {
    // In a real app, you'd save this to a database or send an email
    console.log('Support request received:', input);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      success: true,
      message: 'Your support request has been submitted successfully. We will get back to you soon!',
    };
  });