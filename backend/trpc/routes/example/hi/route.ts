import { protectedProcedure } from '../../create-context';

export const hiProcedure = protectedProcedure.query(() => {
  return 'hello tRPC v10!';
});