import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';
import { database } from '../../../../db';
import { TRPCError } from '@trpc/server';

const timeEntrySchema = z.object({
  id: z.string(),
  jobId: z.string(),
  startTime: z.number(),
  endTime: z.number().nullable(),
  note: z.string().optional(),
  breaks: z.array(z.any()).optional(),
  isOnBreak: z.boolean().optional(),
  paidInPeriodId: z.string().optional(),
  createdAt: z.number(),
});

const syncTimeEntriesInputSchema = z.object({
  timeEntries: z.array(timeEntrySchema),
  operation: z.enum(['upsert', 'delete']),
});

export const syncTimeEntriesProcedure = protectedProcedure
  .input(syncTimeEntriesInputSchema)
  .mutation(async ({ input, ctx }) => {
    try {
      const { timeEntries, operation } = input;
      const userId = ctx.userId!;

      console.log(`Syncing ${timeEntries.length} time entries for user ${userId} (${operation})`);

      if (operation === 'upsert') {
        for (const entry of timeEntries) {
          const stmt = database.prepare(`
            INSERT INTO time_entries (id, userId, jobId, startTime, endTime, note, breaks, isOnBreak, paidInPeriodId, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              startTime = excluded.startTime,
              endTime = excluded.endTime,
              note = excluded.note,
              breaks = excluded.breaks,
              isOnBreak = excluded.isOnBreak,
              paidInPeriodId = excluded.paidInPeriodId
          `);
          
          stmt.run(
            entry.id,
            userId,
            entry.jobId,
            entry.startTime,
            entry.endTime,
            entry.note || null,
            entry.breaks ? JSON.stringify(entry.breaks) : null,
            entry.isOnBreak ? 1 : 0,
            entry.paidInPeriodId || null,
            entry.createdAt
          );
        }
      } else if (operation === 'delete') {
        for (const entry of timeEntries) {
          const stmt = database.prepare('DELETE FROM time_entries WHERE id = ? AND userId = ?');
          stmt.run(entry.id, userId);
        }
      }

      console.log(`Successfully synced ${timeEntries.length} time entries`);
      return { success: true, count: timeEntries.length };
    } catch (error: any) {
      console.error('Error syncing time entries:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Failed to sync time entries',
      });
    }
  });

export const getTimeEntriesProcedure = protectedProcedure
  .query(async ({ ctx }) => {
    try {
      const userId = ctx.userId!;
      console.log(`Fetching time entries for user ${userId}`);

      const stmt = database.prepare('SELECT * FROM time_entries WHERE userId = ?');
      const rows = stmt.all(userId) as any[];

      const timeEntries = rows.map(row => ({
        ...row,
        breaks: row.breaks ? JSON.parse(row.breaks) : [],
        isOnBreak: Boolean(row.isOnBreak),
      }));

      console.log(`Found ${timeEntries.length} time entries for user ${userId}`);
      return timeEntries;
    } catch (error: any) {
      console.error('Error fetching time entries:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Failed to fetch time entries',
      });
    }
  });
