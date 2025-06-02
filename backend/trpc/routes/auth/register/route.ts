import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { supabase } from '@/lib/supabase';

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
      
      // Register user with Supabase Auth
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
        if (authError.message.includes('already registered')) {
          throw new Error('User with this email already exists');
        }
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error('Failed to create user');
      }

      // Get the session token
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        throw new Error('Failed to get authentication token');
      }

      return {
        success: true,
        user: {
          uid: authData.user.id,
          email: authData.user.email!,
          displayName,
          photoURL: authData.user.user_metadata?.avatar_url || null,
          isLoggedIn: true,
          createdAt: new Date(authData.user.created_at).getTime(),
        },
        token,
      };
    } catch (error: any) {
      console.error('Registration error:', error);
      throw new Error(error.message || 'Registration failed');
    }
  });