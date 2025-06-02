import { protectedProcedure } from '../../../create-context';

export const getProfileProcedure = protectedProcedure
  .query(async ({ ctx }: { ctx: any }) => {
    // In a real app, you'd fetch user data from database
    // Mock user data based on token
    return {
      uid: ctx.userId,
      email: 'demo@example.com',
      displayName: 'Demo User',
      photoURL: null,
      isLoggedIn: true,
      createdAt: Date.now() - 86400000, // 1 day ago
    };
  });