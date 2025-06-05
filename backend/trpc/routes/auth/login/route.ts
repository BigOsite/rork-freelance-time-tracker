import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { supabase } from '@/lib/supabase';
import { TRPCError } from '@trpc/server';

const loginInputSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const loginProcedure = publicProcedure
  .input(loginInputSchema)
  .mutation(async ({ input }: { input: z.infer<typeof loginInputSchema> }) => {
    try {
      const { email, password } = input;
      
      console.log('Login attempt for email:', email);
      
      // Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        console.error('Supabase auth error:', authError);
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password',
        });
      }

      if (!authData.user || !authData.session) {
        console.error('No user or session returned from Supabase');
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Login failed',
        });
      }

      const displayName = authData.user.user_metadata?.display_name || 
                         authData.user.email?.split('@')[0] || 
                         'User';

      const response = {
        success: true,
        user: {
          uid: authData.user.id,
          email: authData.user.email!,
          displayName,
          photoURL: authData.user.user_metadata?.avatar_url || null,
          isLoggedIn: true,
          createdAt: new Date(authData.user.created_at).getTime(),
        },
        token: authData.session.access_token,
      };

      console.log('Login successful for user:', authData.user.id);
      return response;
    } catch (error: any) {
      console.error('Login error:', error);
      
      // If it's already a TRPCError, re-throw it
      if (error.code) {
        throw error;
      }
      
      // Otherwise, wrap it in a TRPCError
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Login failed',
      });
    }
  });