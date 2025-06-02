import { z } from 'zod';
import { publicProcedure } from '../../../create-context';

const supportInputSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
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