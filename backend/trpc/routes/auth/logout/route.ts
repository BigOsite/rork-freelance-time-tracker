import { protectedProcedure } from '../../../create-context';
import { supabase } from '@/lib/supabase';
import { TRPCError } from '@trpc/server';

export const logoutProcedure = protectedProcedure
  .mutation(async ({ ctx }: { ctx: any }) => {
    try {
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('Logout error:', error);
        // Don't throw error for logout - just log it
      }

      return {
        success: true,
        message: 'Logged out successfully',
      };
    } catch (error: any) {
      console.error('Logout error:', error);
      
      // For logout, we should always return success even if there's an error
      // because the client should clear local state regardless
      return {
        success: true,
        message: 'Logged out successfully',
      };
    }
  });