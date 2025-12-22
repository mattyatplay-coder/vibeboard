import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getParameters = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { type } = req.query;

    const where: any = { projectId };
    if (type) {
      where.type = type;
    }

    const parameters = await prisma.modelParameter.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    res.json(parameters);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch parameters' });
  }
};

export const createParameter = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { type, name, value } = req.body;

    if (!['sampler', 'scheduler'].includes(type)) {
      return res.status(400).json({ error: 'Invalid parameter type' });
    }

    const parameter = await prisma.modelParameter.create({
      data: {
        projectId,
        type,
        name,
        value,
      },
    });
    res.json(parameter);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create parameter' });
  }
};

export const deleteParameter = async (req: Request, res: Response) => {
  try {
    const { projectId, parameterId } = req.params;
    await prisma.modelParameter.delete({
      where: { id: parameterId, projectId },
    });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete parameter' });
  }
};
