#!/usr/bin/env ts-node
/**
 * VibeBoard Health Check Script
 *
 * Run: npm run health (add to package.json)
 * Or:  npx ts-node scripts/health-check.ts
 *
 * Checks:
 * - PostgreSQL connection
 * - Redis/BullMQ connection
 * - R2 Storage accessibility
 * - RunPod GPU endpoint status
 * - Fal.ai API status
 * - Local services (MMAudio)
 */

import IORedis from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';

interface HealthResult {
    service: string;
    status: 'GREEN' | 'YELLOW' | 'RED';
    message: string;
    latencyMs?: number;
}

const results: HealthResult[] = [];

// ANSI colors for terminal output
const colors = {
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    reset: '\x1b[0m',
    bold: '\x1b[1m',
};

function log(result: HealthResult) {
    const color = result.status === 'GREEN' ? colors.green
        : result.status === 'YELLOW' ? colors.yellow
        : colors.red;
    const latency = result.latencyMs ? ` (${result.latencyMs}ms)` : '';
    console.log(`${color}[${result.status}]${colors.reset} ${result.service}: ${result.message}${latency}`);
    results.push(result);
}

async function checkPostgres(): Promise<void> {
    const start = Date.now();
    try {
        const prisma = new PrismaClient();
        await prisma.$queryRaw`SELECT 1`;
        await prisma.$disconnect();
        log({
            service: 'PostgreSQL',
            status: 'GREEN',
            message: 'Connected successfully',
            latencyMs: Date.now() - start,
        });
    } catch (error: any) {
        log({
            service: 'PostgreSQL',
            status: 'RED',
            message: error.message || 'Connection failed',
        });
    }
}

async function checkRedis(): Promise<void> {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
        log({
            service: 'Redis',
            status: 'YELLOW',
            message: 'REDIS_URL not configured (queue features disabled)',
        });
        return;
    }

    // Check if it's a production URL that won't work locally
    if (redisUrl.includes('railway.internal') || redisUrl.includes('.railway.app')) {
        log({
            service: 'Redis',
            status: 'YELLOW',
            message: 'Railway Redis (production only, not accessible from local)',
        });
        return;
    }

    const start = Date.now();
    try {
        const redis = new IORedis(redisUrl, {
            maxRetriesPerRequest: 1,
            connectTimeout: 5000,
            lazyConnect: true,  // Suppress connection errors until we explicitly connect
        });

        // Suppress unhandled error events during connection attempt
        redis.on('error', () => { /* handled below */ });

        await redis.connect();

        await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Connection timeout')), 5000);
            if (redis.status === 'ready') {
                clearTimeout(timeout);
                resolve();
            } else {
                redis.once('ready', () => {
                    clearTimeout(timeout);
                    resolve();
                });
                redis.once('error', (err) => {
                    clearTimeout(timeout);
                    reject(err);
                });
            }
        });

        await redis.ping();
        await redis.quit();

        log({
            service: 'Redis',
            status: 'GREEN',
            message: 'Connected and responsive',
            latencyMs: Date.now() - start,
        });
    } catch (error: any) {
        log({
            service: 'Redis',
            status: 'RED',
            message: error.message || 'Connection failed',
        });
    }
}

async function checkR2Storage(): Promise<void> {
    const accountId = process.env.R2_ACCOUNT_ID;
    const bucketName = process.env.R2_BUCKET_NAME;
    const accessKey = process.env.AWS_ACCESS_KEY_ID;
    const secretKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (!accountId || !bucketName || !accessKey || !secretKey) {
        log({
            service: 'R2 Storage',
            status: 'YELLOW',
            message: 'R2 credentials not fully configured',
        });
        return;
    }

    const start = Date.now();
    try {
        const client = new S3Client({
            region: 'auto',
            endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId: accessKey,
                secretAccessKey: secretKey,
            },
        });

        await client.send(new HeadBucketCommand({ Bucket: bucketName }));

        log({
            service: 'R2 Storage',
            status: 'GREEN',
            message: `Bucket '${bucketName}' accessible`,
            latencyMs: Date.now() - start,
        });
    } catch (error: any) {
        log({
            service: 'R2 Storage',
            status: 'RED',
            message: error.message || 'Bucket check failed',
        });
    }
}

async function checkRunPod(): Promise<void> {
    const apiKey = process.env.RUNPOD_API_KEY;
    const endpointId = process.env.RUNPOD_ENDPOINT_ID;
    const mode = process.env.GPU_WORKER_MODE;

    if (mode !== 'runpod') {
        log({
            service: 'RunPod GPU',
            status: 'YELLOW',
            message: `GPU_WORKER_MODE is '${mode}' (not using RunPod)`,
        });
        return;
    }

    if (!apiKey || !endpointId) {
        log({
            service: 'RunPod GPU',
            status: 'RED',
            message: 'RUNPOD_API_KEY or RUNPOD_ENDPOINT_ID not configured',
        });
        return;
    }

    const start = Date.now();
    try {
        const response = await fetch(`https://api.runpod.ai/v2/${endpointId}/health`, {
            headers: { 'Authorization': `Bearer ${apiKey}` },
        });

        if (response.ok) {
            const data = await response.json();
            log({
                service: 'RunPod GPU',
                status: 'GREEN',
                message: `Endpoint ${endpointId} healthy (workers: ${data.workers?.ready || 0})`,
                latencyMs: Date.now() - start,
            });
        } else {
            log({
                service: 'RunPod GPU',
                status: 'RED',
                message: `Health check failed: ${response.status}`,
            });
        }
    } catch (error: any) {
        log({
            service: 'RunPod GPU',
            status: 'RED',
            message: error.message || 'Request failed',
        });
    }
}

async function checkFalAI(): Promise<void> {
    const falKey = process.env.FAL_KEY;

    if (!falKey) {
        log({
            service: 'Fal.ai',
            status: 'RED',
            message: 'FAL_KEY not configured',
        });
        return;
    }

    const start = Date.now();
    try {
        // Check a simple endpoint
        const response = await fetch('https://fal.run/fal-ai/flux/dev', {
            method: 'OPTIONS',
            headers: { 'Authorization': `Key ${falKey}` },
        });

        // Fal.ai doesn't have a dedicated health endpoint, so we just check connectivity
        log({
            service: 'Fal.ai',
            status: 'GREEN',
            message: 'API key configured and endpoint reachable',
            latencyMs: Date.now() - start,
        });
    } catch (error: any) {
        log({
            service: 'Fal.ai',
            status: 'YELLOW',
            message: 'Could not verify (may still work)',
        });
    }
}

async function checkLocalServices(): Promise<void> {
    const mmAudioUrl = process.env.MMAUDIO_LOCAL_URL || 'http://localhost:8765';

    const start = Date.now();
    try {
        const response = await fetch(`${mmAudioUrl}/health`, {
            signal: AbortSignal.timeout(3000),
        });

        if (response.ok) {
            log({
                service: 'MMAudio (Local)',
                status: 'GREEN',
                message: 'Service running',
                latencyMs: Date.now() - start,
            });
        } else {
            log({
                service: 'MMAudio (Local)',
                status: 'YELLOW',
                message: 'Service not responding (optional)',
            });
        }
    } catch {
        log({
            service: 'MMAudio (Local)',
            status: 'YELLOW',
            message: 'Not running (optional for video enhancement)',
        });
    }
}

async function main() {
    console.log(`\n${colors.bold}=== VibeBoard Health Check ===${colors.reset}\n`);
    console.log(`Timestamp: ${new Date().toISOString()}\n`);

    // Load environment
    require('dotenv').config();

    // Run all checks
    await checkPostgres();
    await checkRedis();
    await checkR2Storage();
    await checkRunPod();
    await checkFalAI();
    await checkLocalServices();

    // Summary
    console.log(`\n${colors.bold}=== Summary ===${colors.reset}`);
    const green = results.filter(r => r.status === 'GREEN').length;
    const yellow = results.filter(r => r.status === 'YELLOW').length;
    const red = results.filter(r => r.status === 'RED').length;

    console.log(`${colors.green}GREEN: ${green}${colors.reset} | ${colors.yellow}YELLOW: ${yellow}${colors.reset} | ${colors.red}RED: ${red}${colors.reset}`);

    if (red > 0) {
        console.log(`\n${colors.red}${colors.bold}CRITICAL: ${red} service(s) are down!${colors.reset}`);
        process.exit(1);
    } else if (yellow > 0) {
        console.log(`\n${colors.yellow}WARNING: ${yellow} service(s) have warnings${colors.reset}`);
        process.exit(0);
    } else {
        console.log(`\n${colors.green}${colors.bold}All systems operational!${colors.reset}`);
        process.exit(0);
    }
}

main().catch((err) => {
    console.error('Health check failed:', err);
    process.exit(1);
});
