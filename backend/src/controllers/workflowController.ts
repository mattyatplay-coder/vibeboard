import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { StorageService } from '../services/StorageService';
import fs from 'fs';

const prisma = new PrismaClient();

export const uploadWorkflow = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const file = req.file;
    const { name, description } = req.body;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Upload to storage
    const storageService = new StorageService();
    const fileUrl = await storageService.uploadFile(
      fs.readFileSync(file.path),
      file.mimetype,
      `projects/${projectId}/workflows`
    );

    // Create DB record
    const workflow = await prisma.workflow.create({
      data: {
        projectId,
        name: name || file.originalname,
        description,
        fileUrl,
      },
    });

    // Clean up local file
    if (file.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    res.status(201).json(workflow);
  } catch (error) {
    console.error('Failed to upload workflow:', error);
    res.status(500).json({ error: 'Failed to upload workflow' });
  }
};

export const getWorkflows = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    const workflows = await prisma.workflow.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(workflows);
  } catch (error) {
    console.error('Failed to fetch workflows:', error);
    res.status(500).json({ error: 'Failed to fetch workflows' });
  }
};

export const deleteWorkflow = async (req: Request, res: Response) => {
  try {
    const { projectId, workflowId } = req.params;

    // Verify ownership
    const workflow = await prisma.workflow.findFirst({
      where: { id: workflowId, projectId },
    });

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Delete from DB
    await prisma.workflow.delete({
      where: { id: workflowId },
    });

    // TODO: Delete from storage if needed (StorageService might need a delete method)

    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete workflow:', error);
    res.status(500).json({ error: 'Failed to delete workflow' });
  }
};
