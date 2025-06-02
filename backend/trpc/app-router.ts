import { router } from './create-context';
import { hiProcedure } from './routes/example/hi/route';
import { submitSupportProcedure } from './routes/support/submit/route';

export const appRouter = router({
  example: router({
    hi: hiProcedure,
  }),
  support: router({
    submit: submitSupportProcedure,
  }),
});

export type AppRouter = typeof appRouter;