import { Request, Response } from 'express';
import { LLMService } from '../services/LLMService';

export const generateText = async (req: Request, res: Response) => {
    try {
        const { prompt, systemPrompt, model, temperature, maxTokens } = req.body;

        const providerType = model?.includes('grok') ? 'grok' : 'ollama';
        const llmService = new LLMService(providerType);

        const result = await llmService.generate({
            prompt,
            systemPrompt,
            model,
            temperature,
            maxTokens
        });

        res.json(result);
    } catch (error: any) {
        console.error("LLM generation failed:", error);
        res.status(500).json({ error: error.message });
    }
};

export const streamText = async (req: Request, res: Response) => {
    try {
        const { prompt, systemPrompt, model, temperature, maxTokens } = req.body;

        const providerType = model?.includes('grok') ? 'grok' : 'ollama';
        const llmService = new LLMService(providerType);

        // Set headers for SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        await llmService.stream({
            prompt,
            systemPrompt,
            model,
            temperature,
            maxTokens
        }, (chunk) => {
            res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
        });

        res.write('data: [DONE]\n\n');
        res.end();
    } catch (error: any) {
        console.error("LLM stream failed:", error);
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
    }
};
