import { protectedProcedure } from '../../create-context';

export const logoutProcedure = protectedProcedure
  .mutation(async ({ ctx }) => {
    // In a real app, you'd invalidate the token in your database
    console.log('User logged out:', ctx.userId);
    
    return {
      success: true,
      message: 'Logged out successfully',
    };
  });