import { Request, Response } from 'express';
import { prisma } from '../prisma';

export const templateController = {
    // Create a new template
    createTemplate: async (req: Request, res: Response) => {
        try {
            const { name, description, category, config, previewUrl, isPublic, userId } = req.body;

            if (!name || !config) {
                return res.status(400).json({ error: 'Name and config are required' });
            }

            const template = await prisma.workflowTemplate.create({
                data: {
                    name,
                    description,
                    category: category || 'Custom',
                    config,
                    previewUrl,
                    isPublic: isPublic || false,
                    userId
                }
            });

            res.json(template);
        } catch (error) {
            console.error('Failed to create template:', error);
            res.status(500).json({ error: 'Failed to create template' });
        }
    },

    // Get all templates (public + user's private)
    getTemplates: async (req: Request, res: Response) => {
        try {
            const userId = req.query.userId as string | undefined;

            const where: any = {
                OR: [
                    { isPublic: true }
                ]
            };

            if (userId) {
                where.OR.push({ userId });
            }

            const templates = await prisma.workflowTemplate.findMany({
                where,
                orderBy: { createdAt: 'desc' }
            });

            res.json(templates);
        } catch (error) {
            console.error('Failed to fetch templates:', error);
            res.status(500).json({ error: 'Failed to fetch templates' });
        }
    },

    // Delete a template
    deleteTemplate: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;

            await prisma.workflowTemplate.delete({
                where: { id }
            });

            res.json({ success: true });
        } catch (error) {
            console.error('Failed to delete template:', error);
            res.status(500).json({ error: 'Failed to delete template' });
        }
    }
};
