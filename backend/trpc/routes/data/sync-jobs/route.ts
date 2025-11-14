import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';
import { database } from '../../../../db';
import { TRPCError } from '@trpc/server';

const jobSchema = z.object({
  id: z.string(),
  name: z.string(),
  client: z.string(),
  hourlyRate: z.number(),
  color: z.string().optional(),
  settings: z.any().optional(),
  createdAt: z.number(),
});

const syncJobsInputSchema = z.object({
  jobs: z.array(jobSchema),
  operation: z.enum(['upsert', 'delete']),
});

export const syncJobsProcedure = protectedProcedure
  .input(syncJobsInputSchema)
  .mutation(async ({ input, ctx }) => {
    try {
      const { jobs, operation } = input;
      const userId = ctx.userId!;

      console.log(`Syncing ${jobs.length} jobs for user ${userId} (${operation})`);

      if (operation === 'upsert') {
        for (const job of jobs) {
          const stmt = database.prepare(`
            INSERT INTO jobs (id, userId, name, client, hourlyRate, color, settings, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              name = excluded.name,
              client = excluded.client,
              hourlyRate = excluded.hourlyRate,
              color = excluded.color,
              settings = excluded.settings
          `);
          
          stmt.run(
            job.id,
            userId,
            job.name,
            job.client,
            job.hourlyRate,
            job.color || null,
            job.settings ? JSON.stringify(job.settings) : null,
            job.createdAt
          );
        }
      } else if (operation === 'delete') {
        for (const job of jobs) {
          const stmt = database.prepare('DELETE FROM jobs WHERE id = ? AND userId = ?');
          stmt.run(job.id, userId);
        }
      }

      console.log(`Successfully synced ${jobs.length} jobs`);
      return { success: true, count: jobs.length };
    } catch (error: any) {
      console.error('Error syncing jobs:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Failed to sync jobs',
      });
    }
  });

export const getJobsProcedure = protectedProcedure
  .query(async ({ ctx }) => {
    try {
      const userId = ctx.userId!;
      console.log(`Fetching jobs for user ${userId}`);

      const stmt = database.prepare('SELECT * FROM jobs WHERE userId = ?');
      const rows = stmt.all(userId) as any[];

      const jobs = rows.map(row => ({
        ...row,
        settings: row.settings ? JSON.parse(row.settings) : null,
      }));

      console.log(`Found ${jobs.length} jobs for user ${userId}`);
      return jobs;
    } catch (error: any) {
      console.error('Error fetching jobs:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Failed to fetch jobs',
      });
    }
  });
