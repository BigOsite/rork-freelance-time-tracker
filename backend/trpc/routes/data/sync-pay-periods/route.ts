import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';
import { database } from '../../../../db';
import { TRPCError } from '@trpc/server';

const payPeriodSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  startDate: z.number(),
  endDate: z.number(),
  totalDuration: z.number(),
  totalEarnings: z.number(),
  isPaid: z.boolean(),
  paidDate: z.number().optional(),
  timeEntryIds: z.array(z.string()),
  createdAt: z.number(),
});

const syncPayPeriodsInputSchema = z.object({
  payPeriods: z.array(payPeriodSchema),
  operation: z.enum(['upsert', 'delete']),
});

export const syncPayPeriodsProcedure = protectedProcedure
  .input(syncPayPeriodsInputSchema)
  .mutation(async ({ input, ctx }) => {
    try {
      const { payPeriods, operation } = input;
      const userId = ctx.userId!;

      console.log(`Syncing ${payPeriods.length} pay periods for user ${userId} (${operation})`);

      if (operation === 'upsert') {
        for (const period of payPeriods) {
          const stmt = database.prepare(`
            INSERT INTO pay_periods (id, userId, jobId, startDate, endDate, totalDuration, totalEarnings, isPaid, paidDate, timeEntryIds, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              startDate = excluded.startDate,
              endDate = excluded.endDate,
              totalDuration = excluded.totalDuration,
              totalEarnings = excluded.totalEarnings,
              isPaid = excluded.isPaid,
              paidDate = excluded.paidDate,
              timeEntryIds = excluded.timeEntryIds
          `);
          
          stmt.run(
            period.id,
            userId,
            period.jobId,
            period.startDate,
            period.endDate,
            period.totalDuration,
            period.totalEarnings,
            period.isPaid ? 1 : 0,
            period.paidDate || null,
            JSON.stringify(period.timeEntryIds),
            period.createdAt
          );
        }
      } else if (operation === 'delete') {
        for (const period of payPeriods) {
          const stmt = database.prepare('DELETE FROM pay_periods WHERE id = ? AND userId = ?');
          stmt.run(period.id, userId);
        }
      }

      console.log(`Successfully synced ${payPeriods.length} pay periods`);
      return { success: true, count: payPeriods.length };
    } catch (error: any) {
      console.error('Error syncing pay periods:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Failed to sync pay periods',
      });
    }
  });

export const getPayPeriodsProcedure = protectedProcedure
  .query(async ({ ctx }) => {
    try {
      const userId = ctx.userId!;
      console.log(`Fetching pay periods for user ${userId}`);

      const stmt = database.prepare('SELECT * FROM pay_periods WHERE userId = ?');
      const rows = stmt.all(userId) as any[];

      const payPeriods = rows.map(row => ({
        ...row,
        isPaid: Boolean(row.isPaid),
        timeEntryIds: JSON.parse(row.timeEntryIds),
      }));

      console.log(`Found ${payPeriods.length} pay periods for user ${userId}`);
      return payPeriods;
    } catch (error: any) {
      console.error('Error fetching pay periods:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Failed to fetch pay periods',
      });
    }
  });
