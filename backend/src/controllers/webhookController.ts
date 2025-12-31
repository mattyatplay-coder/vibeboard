/**
 * Webhook Controller
 *
 * Handles incoming webhooks from AI providers (Fal.ai, Replicate)
 * to update training job status without polling.
 */

import { Request, Response } from 'express';
import { prisma } from '../prisma';

/**
 * Handle Fal.ai training completion webhook
 * POST /api/webhooks/fal
 *
 * Fal.ai sends:
 * {
 *   request_id: string,
 *   status: 'COMPLETED' | 'FAILED' | 'IN_PROGRESS',
 *   payload?: { diffusers_lora_file?: { url: string } },
 *   error?: string
 * }
 */
export const handleFalWebhook = async (req: Request, res: Response) => {
  const { request_id, status, payload, error } = req.body;

  console.log(`[Webhook] Received Fal update for ${request_id}: ${status}`);

  try {
    // 1. Find job by provider ID
    const job = await prisma.trainingJob.findFirst({
      where: { providerJobId: request_id },
    });

    if (!job) {
      console.warn(`[Webhook] Job not found for request ${request_id}`);
      return res.status(404).json({ message: 'Job not found' });
    }

    // 2. Update Status based on webhook payload
    if (status === 'COMPLETED') {
      // Fal usually sends the result in 'payload'
      // Adjust path based on actual model output structure (flux-lora)
      const loraUrl =
        payload?.diffusers_lora_file?.url || payload?.weights?.url || payload?.lora_url;

      await prisma.trainingJob.update({
        where: { id: job.id },
        data: {
          status: 'completed',
          loraUrl: loraUrl || null,
        },
      });

      console.log(`[Webhook] Job ${job.id} marked completed. LoRA: ${loraUrl}`);
    } else if (status === 'FAILED') {
      await prisma.trainingJob.update({
        where: { id: job.id },
        data: {
          status: 'failed',
          error: error || 'Training failed (via webhook)',
        },
      });

      console.log(`[Webhook] Job ${job.id} marked failed: ${error}`);
    } else if (status === 'IN_PROGRESS') {
      // Update progress if provided
      console.log(`[Webhook] Job ${job.id} still in progress`);
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('[Webhook] Error processing:', err);
    res.status(500).json({ error: 'Internal Error' });
  }
};

/**
 * Handle Replicate training completion webhook
 * POST /api/webhooks/replicate
 *
 * Replicate sends:
 * {
 *   id: string,
 *   status: 'succeeded' | 'failed' | 'processing',
 *   output?: { weights: string },
 *   error?: string
 * }
 */
export const handleReplicateWebhook = async (req: Request, res: Response) => {
  const { id, status, output, error } = req.body;

  console.log(`[Webhook] Received Replicate update for ${id}: ${status}`);

  try {
    // 1. Find job by provider ID
    const job = await prisma.trainingJob.findFirst({
      where: { providerJobId: id },
    });

    if (!job) {
      console.warn(`[Webhook] Job not found for Replicate training ${id}`);
      return res.status(404).json({ message: 'Job not found' });
    }

    // 2. Update Status
    if (status === 'succeeded') {
      const loraUrl = output?.weights || output?.version;

      await prisma.trainingJob.update({
        where: { id: job.id },
        data: {
          status: 'completed',
          loraUrl: loraUrl || null,
        },
      });

      console.log(`[Webhook] Replicate job ${job.id} completed. Output: ${loraUrl}`);
    } else if (status === 'failed') {
      await prisma.trainingJob.update({
        where: { id: job.id },
        data: {
          status: 'failed',
          error: error || 'Training failed (Replicate webhook)',
        },
      });

      console.log(`[Webhook] Replicate job ${job.id} failed: ${error}`);
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('[Webhook] Error processing Replicate webhook:', err);
    res.status(500).json({ error: 'Internal Error' });
  }
};
