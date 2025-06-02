import { protectedProcedure } from '../../../create-context';
import { supabase } from '@/lib/supabase';

export const logoutProcedure = protectedProcedure
  .mutation(async ({ ctx }: { ctx: any }) => {
    try {
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Supabase logout error:', error);
      }

      console.log('User logged out:', ctx.userId);
      
      return {
        success: true,
        message: 'Logged out successfully',
      };
    } catch (error: any) {
      console.error('Logout error:', error);
      return {
        success: true,
        message: 'Logged out successfully',
      };
    }
  });