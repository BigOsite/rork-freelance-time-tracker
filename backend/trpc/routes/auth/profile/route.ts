import { protectedProcedure } from '../../../create-context';
import { TRPCError } from '@trpc/server';
import { db } from '../../../../db';

export const getProfileProcedure = protectedProcedure
  .query(async ({ ctx }) => {
    try {
      if (!ctx.userId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        });
      }

      console.log('Getting profile for user:', ctx.userId);

      // Get user from database
      const user = await db.findUserById(ctx.userId);
      
      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      const profile = {
        uid: user.id,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        isLoggedIn: true,
        createdAt: user.createdAt,
      };

      console.log('Profile retrieved successfully for user:', user.id);
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