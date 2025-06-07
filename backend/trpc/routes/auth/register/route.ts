import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { supabase } from '@/lib/supabase';
import { TRPCError } from '@trpc/server';

const registerInputSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  displayName: z.string().min(1, 'Display name is required'),
});

export const registerProcedure = publicProcedure
  .input(registerInputSchema)
  .mutation(async ({ input }: { input: z.infer<typeof registerInputSchema> }) => {
    try {
      const { email, password, displayName } = input;
      
      console.log('Registration attempt for email:', email);
      
      // Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
          },
        },
      });

      if (authError) {
        console.error('Supabase auth error:', authError);
        
        // Provide more specific error messages
        if (authError.message?.includes('User already registered')) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'An account with this email already exists. Please sign in instead.',
          });
        } else if (authError.message?.includes('Password should be at least 6 characters')) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Password must be at least 6 characters long.',
          });
        } else if (authError.message?.includes('Unable to validate email address')) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Please enter a valid email address.',
          });
        } else if (authError.message?.includes('signup is disabled')) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Account registration is currently disabled. Please contact support.',
          });
        } else {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Registration failed. Please check your information and try again.',
          });
        }
      }

      if (!authData.user || !authData.session) {
        console.error('No user or session returned from Supabase');
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Registration failed - no user data returned',
        });
      }

      const response = {
        success: true,
        user: {
          uid: authData.user.id,
          email: authData.user.email!,
          displayName,
          photoURL: authData.user.user_metadata?.avatar_url || authData.user.user_metadata?.photo_url || null,
          isLoggedIn: true,
          createdAt: new Date(authData.user.created_at).getTime(),
        },
        token: authData.session.access_token,
      };

      console.log('Registration successful for user:', authData.user.id);
      return response;
    } catch (error: any) {
      console.error('Registration error:', error);
      
      // If it's already a TRPCError, re-throw it
      if (error.code) {
        throw error;
      }
      
      // Handle network and other errors
      if (error.message?.includes('fetch') || error.message?.includes('network')) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Network error. Please check your connection and try again.',
        });
      }
      
      // Otherwise, wrap it in a TRPCError
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Registration failed. Please try again.',
      });
    }
  });