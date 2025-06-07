import { protectedProcedure } from '../../../create-context';
import { TRPCError } from '@trpc/server';

export const getProfileProcedure = protectedProcedure
  .query(async ({ ctx }) => {
    try {
      if (!ctx.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        });
      }

      console.log('Getting profile for user:', ctx.user.id);

      const displayName = ctx.user.user_metadata?.display_name || 
                         ctx.user.email?.split('@')[0] || 
                         'User';

      const profile = {
        uid: ctx.user.id,
        email: ctx.user.email!,
        displayName,
        photoURL: ctx.user.user_metadata?.avatar_url || ctx.user.user_metadata?.photo_url || null,
        isLoggedIn: true,
        createdAt: new Date(ctx.user.created_at).getTime(),
      };

      console.log('Profile retrieved successfully for user:', ctx.user.id);
      return profile;
    } catch (error: any) {
      console.error('Profile retrieval error:', error);
      
      // If it's already a TRPCError, re-throw it
      if (error.code) {
        throw error;
      }
      
      // Otherwise, wrap it in a TRPCError
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Failed to retrieve profile. Please try again.',
      });
    }
  });