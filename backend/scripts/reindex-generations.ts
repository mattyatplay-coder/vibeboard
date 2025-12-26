/**
 * Batch Reindex Script
 *
 * Indexes all unindexed generations in a project or all projects.
 *
 * Usage:
 *   npx ts-node scripts/reindex-generations.ts --project <projectId>
 *   npx ts-node scripts/reindex-generations.ts --all
 *   npx ts-node scripts/reindex-generations.ts --all --batch-size 50
 */

import { PrismaClient } from '@prisma/client';
import { SemanticIndexService } from '../src/services/search/SemanticIndexService';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
    const args = process.argv.slice(2);

    let projectId: string | null = null;
    let indexAll = false;
    let batchSize = 10;
    let maxTotal = 1000; // Safety limit

    // Parse arguments
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--project' && args[i + 1]) {
            projectId = args[i + 1];
            i++;
        } else if (args[i] === '--all') {
            indexAll = true;
        } else if (args[i] === '--batch-size' && args[i + 1]) {
            batchSize = parseInt(args[i + 1]);
            i++;
        } else if (args[i] === '--max' && args[i + 1]) {
            maxTotal = parseInt(args[i + 1]);
            i++;
        }
    }

    if (!projectId && !indexAll) {
        console.log(`
Usage:
  npx ts-node scripts/reindex-generations.ts --project <projectId>
  npx ts-node scripts/reindex-generations.ts --all [--batch-size 10] [--max 1000]

Options:
  --project <id>    Index a specific project
  --all             Index all projects
  --batch-size <n>  Process n generations at a time (default: 10)
  --max <n>         Maximum total to index (default: 1000)
        `);
        process.exit(1);
    }

    console.log('='.repeat(60));
    console.log('🔍 Semantic Index - Batch Reindex Script');
    console.log('='.repeat(60));

    const service = SemanticIndexService.getInstance();

    if (indexAll) {
        // Get all projects
        const projects = await prisma.project.findMany({
            select: { id: true, name: true }
        });

        console.log(`Found ${projects.length} projects\n`);

        let totalProcessed = 0;
        let totalErrors = 0;

        for (const project of projects) {
            if (totalProcessed >= maxTotal) {
                console.log(`\n⚠️  Reached max limit of ${maxTotal}. Stopping.`);
                break;
            }

            console.log(`\n📁 Project: ${project.name} (${project.id})`);

            const stats = await service.getIndexStats(project.id);
            console.log(`   Total: ${stats.total}, Indexed: ${stats.indexed}, Pending: ${stats.pending}`);

            if (stats.pending === 0) {
                console.log('   ✓ Already fully indexed');
                continue;
            }

            // Process in batches
            let processed = 0;
            while (processed < stats.pending && totalProcessed < maxTotal) {
                const result = await service.batchIndex(project.id, batchSize);
                processed += result.processed;
                totalProcessed += result.processed;
                totalErrors += result.errors;

                console.log(`   Batch: +${result.processed} indexed, ${result.errors} errors`);

                // Rate limiting - wait between batches
                if (result.processed > 0) {
                    await new Promise(r => setTimeout(r, 2000));
                }

                if (result.processed === 0) break; // No more to process
            }

            console.log(`   Done: ${processed} processed`);
        }

        console.log('\n' + '='.repeat(60));
        console.log(`✅ Complete: ${totalProcessed} indexed, ${totalErrors} errors`);

    } else if (projectId) {
        // Single project
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: { id: true, name: true }
        });

        if (!project) {
            console.error(`❌ Project not found: ${projectId}`);
            process.exit(1);
        }

        console.log(`\n📁 Project: ${project.name} (${project.id})`);

        const stats = await service.getIndexStats(project.id);
        console.log(`   Total: ${stats.total}, Indexed: ${stats.indexed}, Pending: ${stats.pending}`);

        if (stats.pending === 0) {
            console.log('   ✓ Already fully indexed');
            process.exit(0);
        }

        let totalProcessed = 0;
        let totalErrors = 0;

        // Process all pending in batches
        while (totalProcessed < stats.pending && totalProcessed < maxTotal) {
            const result = await service.batchIndex(project.id, batchSize);
            totalProcessed += result.processed;
            totalErrors += result.errors;

            console.log(`   Batch: +${result.processed} indexed, ${result.errors} errors`);

            if (result.processed === 0) break;

            // Rate limiting
            await new Promise(r => setTimeout(r, 2000));
        }

        console.log('\n' + '='.repeat(60));
        console.log(`✅ Complete: ${totalProcessed} indexed, ${totalErrors} errors`);
    }

    await prisma.$disconnect();
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
