import { router } from './create-context';
import { hiProcedure } from './routes/example/hi/route';
import { submitSupportProcedure } from './routes/support/submit/route';
import { loginProcedure } from './routes/auth/login/route';
import { registerProcedure } from './routes/auth/register/route';
import { logoutProcedure } from './routes/auth/logout/route';
import { getProfileProcedure } from './routes/auth/profile/route';
import { syncJobsProcedure, getJobsProcedure } from './routes/data/sync-jobs/route';
import { syncTimeEntriesProcedure, getTimeEntriesProcedure } from './routes/data/sync-time-entries/route';
import { syncPayPeriodsProcedure, getPayPeriodsProcedure } from './routes/data/sync-pay-periods/route';

export const appRouter = router({
  example: router({
    hi: hiProcedure,
  }),
  support: router({
    submit: submitSupportProcedure,
  }),
  auth: router({
    login: loginProcedure,
    register: registerProcedure,
    logout: logoutProcedure,
    profile: getProfileProcedure,
  }),
  data: router({
    syncJobs: syncJobsProcedure,
    getJobs: getJobsProcedure,
    syncTimeEntries: syncTimeEntriesProcedure,
    getTimeEntries: getTimeEntriesProcedure,
    syncPayPeriods: syncPayPeriodsProcedure,
    getPayPeriods: getPayPeriodsProcedure,
  }),
});

export type AppRouter = typeof appRouter;