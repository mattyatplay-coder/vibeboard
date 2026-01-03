/**
 * Asset Archive Service - Asset Hygiene Automation
 *
 * When a MasterPass is approved, automatically archives lower-quality passes:
 * - Draft passes become archived
 * - Review passes become archived
 * - Master pass remains active
 *
 * This reduces storage costs and keeps the Asset Bin clean.
 * Archived assets can still be viewed via "Show Archived" toggle.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type ArchiveReason = 'master_approved' | 'manual' | 'auto_cleanup' | 'superseded';

export interface ArchiveResult {
  success: boolean;
  archivedCount: number;
  archivedIds: string[];
  error?: string;
}

export interface ArchiveStats {
  totalPasses: number;
  activePasses: number;
  archivedPasses: number;
  byQuality: {
    draft: { active: number; archived: number };
    review: { active: number; archived: number };
    master: { active: number; archived: number };
  };
}

export class AssetArchiveService {
  private static instance: AssetArchiveService;

  private constructor() {
    console.log('[AssetArchiveService] Initialized');
  }

  public static getInstance(): AssetArchiveService {
    if (!AssetArchiveService.instance) {
      AssetArchiveService.instance = new AssetArchiveService();
    }
    return AssetArchiveService.instance;
  }

  /**
   * Archive all draft/review passes for a job when master is approved
   *
   * Called when a RenderPass with quality='master' is marked as approved/complete
   */
  async archiveOnMasterApproval(jobId: string, masterPassId: string): Promise<ArchiveResult> {
    try {
      // Find all non-master passes for this job that aren't already archived
      const passesToArchive = await prisma.renderPass.findMany({
        where: {
          jobId,
          id: { not: masterPassId },
          archived: false,
          quality: { in: ['draft', 'review'] },
        },
        select: { id: true },
      });

      if (passesToArchive.length === 0) {
        return {
          success: true,
          archivedCount: 0,
          archivedIds: [],
        };
      }

      const idsToArchive = passesToArchive.map(p => p.id);

      // Archive all found passes
      await prisma.renderPass.updateMany({
        where: {
          id: { in: idsToArchive },
        },
        data: {
          archived: true,
          archivedAt: new Date(),
          archivedReason: 'master_approved',
        },
      });

      console.log(
        `[AssetArchiveService] Archived ${idsToArchive.length} passes for job ${jobId} (master: ${masterPassId})`
      );

      return {
        success: true,
        archivedCount: idsToArchive.length,
        archivedIds: idsToArchive,
      };
    } catch (error) {
      console.error('[AssetArchiveService] Error archiving passes:', error);
      return {
        success: false,
        archivedCount: 0,
        archivedIds: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Archive a specific pass manually
   */
  async archivePass(passId: string, reason: ArchiveReason = 'manual'): Promise<ArchiveResult> {
    try {
      await prisma.renderPass.update({
        where: { id: passId },
        data: {
          archived: true,
          archivedAt: new Date(),
          archivedReason: reason,
        },
      });

      return {
        success: true,
        archivedCount: 1,
        archivedIds: [passId],
      };
    } catch (error) {
      return {
        success: false,
        archivedCount: 0,
        archivedIds: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Bulk archive multiple passes
   */
  async archivePasses(passIds: string[], reason: ArchiveReason = 'manual'): Promise<ArchiveResult> {
    try {
      await prisma.renderPass.updateMany({
        where: { id: { in: passIds } },
        data: {
          archived: true,
          archivedAt: new Date(),
          archivedReason: reason,
        },
      });

      return {
        success: true,
        archivedCount: passIds.length,
        archivedIds: passIds,
      };
    } catch (error) {
      return {
        success: false,
        archivedCount: 0,
        archivedIds: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Restore an archived pass
   */
  async restorePass(passId: string): Promise<boolean> {
    try {
      await prisma.renderPass.update({
        where: { id: passId },
        data: {
          archived: false,
          archivedAt: null,
          archivedReason: null,
        },
      });
      return true;
    } catch (error) {
      console.error('[AssetArchiveService] Error restoring pass:', error);
      return false;
    }
  }

  /**
   * Bulk restore archived passes
   */
  async restorePasses(passIds: string[]): Promise<number> {
    try {
      const result = await prisma.renderPass.updateMany({
        where: { id: { in: passIds } },
        data: {
          archived: false,
          archivedAt: null,
          archivedReason: null,
        },
      });
      return result.count;
    } catch (error) {
      console.error('[AssetArchiveService] Error restoring passes:', error);
      return 0;
    }
  }

  /**
   * Get archive statistics for a project
   */
  async getArchiveStats(projectId: string): Promise<ArchiveStats> {
    // Get all passes for jobs in this project
    const passes = await prisma.renderPass.findMany({
      where: {
        job: {
          projectId,
        },
      },
      select: {
        quality: true,
        archived: true,
      },
    });

    const stats: ArchiveStats = {
      totalPasses: passes.length,
      activePasses: passes.filter(p => !p.archived).length,
      archivedPasses: passes.filter(p => p.archived).length,
      byQuality: {
        draft: { active: 0, archived: 0 },
        review: { active: 0, archived: 0 },
        master: { active: 0, archived: 0 },
      },
    };

    for (const pass of passes) {
      const quality = pass.quality as keyof typeof stats.byQuality;
      if (stats.byQuality[quality]) {
        if (pass.archived) {
          stats.byQuality[quality].archived++;
        } else {
          stats.byQuality[quality].active++;
        }
      }
    }

    return stats;
  }

  /**
   * Auto-cleanup old archived passes after retention period
   * Default: 30 days
   */
  async cleanupOldArchives(
    projectId: string,
    retentionDays: number = 30
  ): Promise<{ deletedCount: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    try {
      // Delete archived passes older than retention period
      const result = await prisma.renderPass.deleteMany({
        where: {
          job: {
            projectId,
          },
          archived: true,
          archivedAt: {
            lt: cutoffDate,
          },
        },
      });

      console.log(
        `[AssetArchiveService] Cleaned up ${result.count} archived passes older than ${retentionDays} days for project ${projectId}`
      );

      return { deletedCount: result.count };
    } catch (error) {
      console.error('[AssetArchiveService] Error cleaning up archives:', error);
      return { deletedCount: 0 };
    }
  }

  /**
   * Archive all passes except the latest for each quality tier
   * Useful for bulk cleanup when a project has many iterations
   */
  async archiveAllExceptLatest(jobId: string): Promise<ArchiveResult> {
    try {
      // Get all passes for the job, grouped by quality
      const passes = await prisma.renderPass.findMany({
        where: { jobId, archived: false },
        orderBy: { createdAt: 'desc' },
      });

      // Group by quality and keep only the latest of each
      const latestByQuality: Record<string, string> = {};
      const toArchive: string[] = [];

      for (const pass of passes) {
        if (!latestByQuality[pass.quality]) {
          latestByQuality[pass.quality] = pass.id;
        } else {
          toArchive.push(pass.id);
        }
      }

      if (toArchive.length === 0) {
        return {
          success: true,
          archivedCount: 0,
          archivedIds: [],
        };
      }

      await prisma.renderPass.updateMany({
        where: { id: { in: toArchive } },
        data: {
          archived: true,
          archivedAt: new Date(),
          archivedReason: 'superseded',
        },
      });

      return {
        success: true,
        archivedCount: toArchive.length,
        archivedIds: toArchive,
      };
    } catch (error) {
      return {
        success: false,
        archivedCount: 0,
        archivedIds: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

// Export singleton
export const assetArchiveService = AssetArchiveService.getInstance();
