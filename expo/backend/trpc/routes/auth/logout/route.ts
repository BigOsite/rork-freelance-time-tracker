import { protectedProcedure } from '../../../create-context';
import { database } from '../../../../db';

export const logoutProcedure = protectedProcedure
  .mutation(async ({ ctx }) => {
    try {
      console.log('Logout attempt for user:', ctx.userId);
      
      // Delete session from database
      if (ctx.token) {
        await database.deleteSession(ctx.token);
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