import { protectedProcedure } from '../../../create-context';
import { supabase } from '@/lib/supabase';
import { TRPCError } from '@trpc/server';

export const logoutProcedure = protectedProcedure
  .mutation(async ({ ctx }) => {
    try {
      console.log('Logout attempt for user:', ctx.userId);
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Supabase logout error:', error);
        // Don't throw error for logout - just log it
      }

      console.log('Logout successful for user:', ctx.userId);
      return { success: true };
    } catch (error: any) {
      console.error('Logout error:', error);
      
      // For logout, we should always return success even if there's an error
      // The client will clear local state regardless
      return { success: true };
    }
  });