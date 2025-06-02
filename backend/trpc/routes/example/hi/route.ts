import { publicProcedure } from '../../create-context';

export const hiProcedure = publicProcedure.query(() => {
  return { message: 'Hello from tRPC!' };
});