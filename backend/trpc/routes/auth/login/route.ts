import { z } from 'zod';
import { publicProcedure } from '../../create-context';

const loginInputSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const loginProcedure = publicProcedure
  .input(loginInputSchema)
  .mutation(async ({ input }) => {
    // In a real app, you'd validate credentials against a database
    // This is a mock implementation
    const { email, password } = input;
    
    // Simulate database lookup
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock validation - in production, hash and compare passwords
    if (email === 'demo@example.com' && password === 'password123') {
      // Generate a mock JWT token (in production, use proper JWT library)
      const token = `mock_token_${Date.now()}_${Math.random()}`;
      
      return {
        success: true,
        user: {
          uid: 'user_123',
          email,
          displayName: 'Demo User',
          isLoggedIn: true,
        },
        token,
      };
    }
    
    throw new Error('Invalid email or password');
  });