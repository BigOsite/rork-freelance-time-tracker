import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { supabase } from '@/lib/supabase';

const loginInputSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const loginProcedure = publicProcedure
  .input(loginInputSchema)
  .mutation(async ({ input }: { input: z.infer<typeof loginInputSchema> }) => {
    try {
      const { email, password } = input;
      
      // Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        throw new Error('Invalid email or password');
      }

      if (!authData.user || !authData.session) {
        throw new Error('Login failed');
      }

      const displayName = authData.user.user_metadata?.display_name || 
                         authData.user.email?.split('@')[0] || 
                         'User';

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
        token: authData.session.access_token,
      };
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.message || 'Login failed');
    }
  });