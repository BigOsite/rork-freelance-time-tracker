import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { db } from '../../../../db';
import { TRPCError } from '@trpc/server';

const registerInputSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  displayName: z.string().min(1, 'Display name is required'),
});

export const registerProcedure = publicProcedure
  .input(registerInputSchema)
  .mutation(async ({ input }: { input: z.infer<typeof registerInputSchema> }) => {
    try {
      const { email, password, displayName } = input;
      
      console.log('Registration attempt for email:', email);
      
      // Create user
      let user;
      try {
        user = await db.createUser(email, password, displayName);
      } catch (createError: any) {
        console.error('User creation error:', createError);
        
        if (createError.message?.includes('already exists')) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'An account with this email already exists. Please sign in instead.',
          });
        }
        throw createError;
      }

      // Create session
      const session = await db.createSession(user.id);

      const response = {
        success: true,
        user: {
          uid: user.id,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          isLoggedIn: true,
          createdAt: user.createdAt,
        },
        token: session.token,
      };

      console.log('Registration successful for user:', user.id);
      return response;
    } catch (error: any) {
      console.error('Registration error:', error);
      
      // If it's already a TRPCError, re-throw it
      if (error.code) {
        throw error;
      }
      
      // Otherwise, wrap it in a TRPCError
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Registration failed. Please try again.',
      });
    }
  });