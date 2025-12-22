import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const exportData = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    // Fetch all relevant data for the project
    const loras = await prisma.loRA.findMany({ where: { projectId } });
    const workflows = await prisma.workflow.findMany({ where: { projectId } });
    const modelParameters = await prisma.modelParameter.findMany({ where: { projectId } });

    const backupData = {
      version: 1,
      timestamp: new Date().toISOString(),
      projectId,
      data: {
        loras,
        workflows,
        modelParameters,
      },
    };

    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="vibeboard-backup-${projectId}-${Date.now()}.json"`
    );

    res.json(backupData);
  } catch (error) {
    console.error('Export failed:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
};

export const importData = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { data } = req.body;

    if (!data || !data.loras || !data.workflows) {
      return res.status(400).json({ error: 'Invalid backup format' });
    }

    console.log(`[Import] Importing data for project ${projectId}...`);

    // Import LoRAs
    let loraCount = 0;
    for (const lora of data.loras) {
      // Check if exists by name to avoid duplicates, or just upsert by ID if ID is preserved
      // Since IDs are UUIDs, we can try to upsert by ID.
      // However, if importing to a DIFFERENT project, we should ignore the ID and create new.
      // For now, let's assume we want to restore to the SAME project or a new one,
      // but we should overwrite the projectId in the data with the current projectId.

      const { id, projectId: oldPid, createdAt, updatedAt, ...loraData } = lora;

      // We use name as unique key for "logic" but ID for DB.
      // Let's check if a LoRA with this name exists in this project.
      const existing = await prisma.loRA.findFirst({
        where: { projectId, name: loraData.name },
      });

      if (existing) {
        // Update
        await prisma.loRA.update({
          where: { id: existing.id },
          data: { ...loraData, projectId },
        });
      } else {
        // Create
        await prisma.loRA.create({
          data: { ...loraData, projectId },
        });
      }
      loraCount++;
    }

    // Import Workflows
    let workflowCount = 0;
    for (const wf of data.workflows) {
      const { id, projectId: oldPid, createdAt, updatedAt, ...wfData } = wf;

      const existing = await prisma.workflow.findFirst({
        where: { projectId, name: wfData.name },
      });

      if (existing) {
        await prisma.workflow.update({
          where: { id: existing.id },
          data: { ...wfData, projectId },
        });
      } else {
        await prisma.workflow.create({
          data: { ...wfData, projectId },
        });
      }
      workflowCount++;
    }

    // Import Model Parameters
    let paramCount = 0;
    if (data.modelParameters) {
      for (const param of data.modelParameters) {
        const { id, projectId: oldPid, createdAt, updatedAt, ...paramData } = param;

        // Unique by name AND type
        const existing = await prisma.modelParameter.findFirst({
          where: { projectId, name: paramData.name, type: paramData.type },
        });

        if (existing) {
          await prisma.modelParameter.update({
            where: { id: existing.id },
            data: { ...paramData, projectId },
          });
        } else {
          await prisma.modelParameter.create({
            data: { ...paramData, projectId },
          });
        }
        paramCount++;
      }
    }

    res.json({
      success: true,
      counts: {
        loras: loraCount,
        workflows: workflowCount,
        modelParameters: paramCount,
      },
    });
  } catch (error) {
    console.error('Import failed:', error);
    res.status(500).json({ error: 'Failed to import data' });
  }
};
