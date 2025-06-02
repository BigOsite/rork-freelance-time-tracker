import { protectedProcedure } from '../../../create-context';
import { supabase } from '@/lib/supabase';

export const getProfileProcedure = protectedProcedure
  .query(async ({ ctx }: { ctx: any }) => {
    try {
      // Get user from Supabase using the token
      const { data: { user }, error } = await supabase.auth.getUser(ctx.token);

      if (error || !user) {
        throw new Error('Invalid token or user not found');
      }

      const displayName = user.user_metadata?.display_name || 
                         user.email?.split('@')[0] || 
                         'User';

      return {
        uid: user.id,
        email: user.email!,
        displayName,
        photoURL: user.user_metadata?.avatar_url,
        isLoggedIn: true,
        createdAt: new Date(user.created_at).getTime(),
      };
    } catch (error: any) {
      console.error('Profile fetch error:', error);
      throw new Error('Failed to fetch profile');
    }
  });