import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { supabase } from '@/lib/supabase';

const supportInputSchema = z.object({
  message: z.string().min(10, 'Message must be at least 10 characters'),
  userEmail: z.string().email('Invalid email address'),
  deviceInfo: z.string().optional(),
  appVersion: z.string().optional(),
});

export const submitSupportProcedure = publicProcedure
  .input(supportInputSchema)
  .mutation(async ({ input }: { input: z.infer<typeof supportInputSchema> }) => {
    try {
      // Save to Supabase
      const { data, error } = await supabase
        .from('support_requests')
        .insert({
          user_email: input.userEmail,
          message: input.message,
          device_info: input.deviceInfo || null,
          app_version: input.appVersion || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw new Error('Failed to submit support request');
      }

      console.log('Support request saved to Supabase:', data);
      
      return {
        success: true,
        message: 'Your support request has been submitted successfully. We will get back to you soon!',
      };
    } catch (error) {
      console.error('Error submitting support request:', error);
      throw new Error('Failed to submit support request');
    }
  });