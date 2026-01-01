/**
 * Story Controller
 *
 * Handles CRUD operations for Story drafts from the Story Editor.
 */

import { Request, Response } from 'express';
import { prisma } from '../prisma';

/**
 * Get all stories for a project
 * GET /api/projects/:projectId/stories
 */
export async function getStories(req: Request, res: Response) {
    try {
        const { projectId } = req.params;

        const stories = await prisma.story.findMany({
            where: { projectId },
            orderBy: { updatedAt: 'desc' },
            select: {
                id: true,
                name: true,
                genre: true,
                concept: true,
                status: true,
                allowNSFW: true,
                targetDuration: true,
                createdAt: true,
                updatedAt: true,
                exportedAt: true
            }
        });

        res.json(stories);
    } catch (error) {
        console.error('Failed to get stories:', error);
        res.status(500).json({
            error: 'Failed to get stories',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}

/**
 * Get a single story by ID
 * GET /api/projects/:projectId/stories/:storyId
 */
export async function getStory(req: Request, res: Response) {
    try {
        const { projectId, storyId } = req.params;

        const story = await prisma.story.findFirst({
            where: {
                id: storyId,
                projectId
            }
        });

        if (!story) {
            return res.status(404).json({ error: 'Story not found' });
        }

        // Parse JSON fields
        const parsed = {
            ...story,
            outline: story.outline ? JSON.parse(story.outline) : null,
            scenes: story.scenes ? JSON.parse(story.scenes) : [],
            prompts: story.prompts ? JSON.parse(story.prompts) : [],
            characters: story.characters ? JSON.parse(story.characters) : []
        };

        res.json(parsed);
    } catch (error) {
        console.error('Failed to get story:', error);
        res.status(500).json({
            error: 'Failed to get story',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}

/**
 * Create a new story
 * POST /api/projects/:projectId/stories
 */
export async function createStory(req: Request, res: Response) {
    try {
        const { projectId } = req.params;
        const {
            name,
            genre,
            concept,
            outline,
            script,
            scenes,
            prompts,
            allowNSFW,
            targetDuration,
            shotDuration,
            directorStyle,
            style,
            pace,
            characters,
            status
        } = req.body;

        if (!name || !genre || !concept) {
            return res.status(400).json({
                error: 'Missing required fields: name, genre, concept'
            });
        }

        const story = await prisma.story.create({
            data: {
                projectId,
                name,
                genre,
                concept,
                outline: outline ? JSON.stringify(outline) : null,
                script: script || null,
                scenes: scenes ? JSON.stringify(scenes) : null,
                prompts: prompts ? JSON.stringify(prompts) : null,
                allowNSFW: allowNSFW || false,
                targetDuration: targetDuration || null,
                shotDuration: shotDuration || null,
                directorStyle: directorStyle || null,
                style: style || null,
                pace: pace || null,
                characters: characters ? JSON.stringify(characters) : null,
                status: status || 'draft'
            }
        });

        res.status(201).json(story);
    } catch (error) {
        console.error('Failed to create story:', error);
        res.status(500).json({
            error: 'Failed to create story',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}

/**
 * Update an existing story
 * PATCH /api/projects/:projectId/stories/:storyId
 */
export async function updateStory(req: Request, res: Response) {
    try {
        const { projectId, storyId } = req.params;
        const {
            name,
            genre,
            concept,
            outline,
            script,
            scenes,
            prompts,
            allowNSFW,
            targetDuration,
            shotDuration,
            directorStyle,
            style,
            pace,
            characters,
            status,
            exportedAt
        } = req.body;

        // Verify story exists and belongs to project
        const existing = await prisma.story.findFirst({
            where: { id: storyId, projectId }
        });

        if (!existing) {
            return res.status(404).json({ error: 'Story not found' });
        }

        const updateData: any = {};

        if (name !== undefined) updateData.name = name;
        if (genre !== undefined) updateData.genre = genre;
        if (concept !== undefined) updateData.concept = concept;
        if (outline !== undefined) updateData.outline = JSON.stringify(outline);
        if (script !== undefined) updateData.script = script;
        if (scenes !== undefined) updateData.scenes = JSON.stringify(scenes);
        if (prompts !== undefined) updateData.prompts = JSON.stringify(prompts);
        if (allowNSFW !== undefined) updateData.allowNSFW = allowNSFW;
        if (targetDuration !== undefined) updateData.targetDuration = targetDuration;
        if (shotDuration !== undefined) updateData.shotDuration = shotDuration;
        if (directorStyle !== undefined) updateData.directorStyle = directorStyle;
        if (style !== undefined) updateData.style = style;
        if (pace !== undefined) updateData.pace = pace;
        if (characters !== undefined) updateData.characters = JSON.stringify(characters);
        if (status !== undefined) updateData.status = status;
        if (exportedAt !== undefined) updateData.exportedAt = exportedAt ? new Date(exportedAt) : null;

        const story = await prisma.story.update({
            where: { id: storyId },
            data: updateData
        });

        res.json(story);
    } catch (error) {
        console.error('Failed to update story:', error);
        res.status(500).json({
            error: 'Failed to update story',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}

/**
 * Delete a story
 * DELETE /api/projects/:projectId/stories/:storyId
 */
export async function deleteStory(req: Request, res: Response) {
    try {
        const { projectId, storyId } = req.params;

        // Verify story exists and belongs to project
        const existing = await prisma.story.findFirst({
            where: { id: storyId, projectId }
        });

        if (!existing) {
            return res.status(404).json({ error: 'Story not found' });
        }

        await prisma.story.delete({
            where: { id: storyId }
        });

        res.json({ success: true, message: 'Story deleted' });
    } catch (error) {
        console.error('Failed to delete story:', error);
        res.status(500).json({
            error: 'Failed to delete story',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
