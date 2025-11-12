import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { db } from '../../../../db';
import { TRPCError } from '@trpc/server';

const loginInputSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const loginProcedure = publicProcedure
  .input(loginInputSchema)
  .mutation(async ({ input }: { input: z.infer<typeof loginInputSchema> }) => {
    try {
      const { email, password } = input;
      
      console.log('Login attempt for email:', email);
      
      // Verify user credentials
      const user = await db.verifyPassword(email, password);

      if (!user) {
        console.error('Invalid credentials');
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password. Please check your credentials and try again.',
        });
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

      console.log('Login successful for user:', user.id);
      return response;
    } catch (error: any) {
      console.error('Login error:', error);
      
      // If it's already a TRPCError, re-throw it
      if (error.code) {
        throw error;
      }
      
      // Otherwise, wrap it in a TRPCError
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Login failed. Please try again.',
      });
    }
  });