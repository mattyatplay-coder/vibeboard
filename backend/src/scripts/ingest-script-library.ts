#!/usr/bin/env ts-node
/**
 * Script Library Ingestion Utility
 *
 * Ingests scripts from the Script Library into the vector database for RAG retrieval.
 * Supports PDF, TXT, and RTF file formats.
 *
 * Usage:
 *   npx ts-node src/scripts/ingest-script-library.ts [--genre <genre>] [--dry-run] [--force]
 *
 * Options:
 *   --genre <genre>  Only ingest scripts from a specific genre folder
 *   --dry-run        List scripts that would be ingested without actually ingesting
 *   --force          Re-ingest scripts even if already indexed
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { getScriptAnalyzer } from '../services/story/ScriptAnalyzer';
import { embeddingService } from '../services/llm/VectorEmbeddingService';

const prisma = new PrismaClient();

// Script Library location
const SCRIPT_LIBRARY_BASE = '/Volumes/Samsung.SSD.990.PRO.2TB/vibeboard backup/Script Library';

// Supported file extensions
const SUPPORTED_EXTENSIONS = ['.txt', '.rtf'];
// Note: PDF support requires additional library (pdf-parse) - can be added later

interface IngestOptions {
    genre?: string;
    dryRun: boolean;
    force: boolean;
}

interface ScriptFile {
    filePath: string;
    title: string;
    genre: string;
    extension: string;
}

/**
 * Extract text content from a script file
 */
async function extractContent(filePath: string): Promise<string> {
    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.txt') {
        return fs.readFileSync(filePath, 'utf-8');
    }

    if (ext === '.rtf') {
        // Basic RTF stripping - remove RTF control codes
        const rtfContent = fs.readFileSync(filePath, 'utf-8');
        // Remove RTF headers and control sequences
        let text = rtfContent
            .replace(/\{\\rtf[^}]*\}/g, '')  // Remove RTF headers
            .replace(/\\[a-z0-9]+\s?/gi, ' ')  // Remove control words
            .replace(/[{}]/g, '')  // Remove braces
            .replace(/\s+/g, ' ')  // Normalize whitespace
            .trim();
        return text;
    }

    // PDF support placeholder - requires pdf-parse library
    if (ext === '.pdf') {
        console.warn(`[Ingest] PDF support not yet implemented: ${filePath}`);
        return '';
    }

    throw new Error(`Unsupported file type: ${ext}`);
}

/**
 * Calculate content hash for change detection
 */
function calculateHash(content: string): string {
    return crypto.createHash('md5').update(content).digest('hex');
}

/**
 * Discover all script files in the library
 */
function discoverScripts(genreFilter?: string): ScriptFile[] {
    const scripts: ScriptFile[] = [];

    if (!fs.existsSync(SCRIPT_LIBRARY_BASE)) {
        console.error(`[Ingest] Script library not found: ${SCRIPT_LIBRARY_BASE}`);
        return scripts;
    }

    const genres = fs.readdirSync(SCRIPT_LIBRARY_BASE);

    for (const genre of genres) {
        // Skip hidden folders and analysis cache
        if (genre.startsWith('.') || genre.startsWith('_')) continue;

        // Apply genre filter if specified
        if (genreFilter && genre.toLowerCase() !== genreFilter.toLowerCase()) continue;

        const genrePath = path.join(SCRIPT_LIBRARY_BASE, genre);

        if (!fs.statSync(genrePath).isDirectory()) continue;

        const files = fs.readdirSync(genrePath);

        for (const file of files) {
            if (file.startsWith('.')) continue;

            const ext = path.extname(file).toLowerCase();
            if (!SUPPORTED_EXTENSIONS.includes(ext)) continue;

            const filePath = path.join(genrePath, file);
            const title = path.basename(file, ext)
                .replace(/_/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();

            scripts.push({
                filePath,
                title,
                genre,
                extension: ext,
            });
        }
    }

    return scripts;
}

/**
 * Check if a script needs re-indexing
 */
async function needsIndexing(script: ScriptFile, force: boolean): Promise<boolean> {
    if (force) return true;

    try {
        const existing = await prisma.scriptLibrary.findUnique({
            where: { title: script.title },
            select: { contentHash: true, indexed: true },
        });

        if (!existing || !existing.indexed) return true;

        // Check if content has changed
        const content = await extractContent(script.filePath);
        const currentHash = calculateHash(content);

        return existing.contentHash !== currentHash;
    } catch {
        return true;
    }
}

/**
 * Ingest a single script into the database
 */
async function ingestScript(script: ScriptFile): Promise<boolean> {
    console.log(`[Ingest] Processing: ${script.title} (${script.genre})`);

    try {
        // Extract content
        const content = await extractContent(script.filePath);
        if (!content || content.length < 100) {
            console.warn(`[Ingest] Skipping - content too short: ${script.title}`);
            return false;
        }

        const contentHash = calculateHash(content);

        // Get script analyzer
        const analyzer = getScriptAnalyzer(false);

        // Analyze the script
        console.log(`[Ingest] Analyzing: ${script.title}`);
        const analysis = await analyzer.analyzeScript(content, script.title, script.genre);

        // Create synopsis from analysis
        const synopsis = [
            `${analysis.narrativeVoice.tone.join(', ')} ${script.genre}`,
            `featuring ${analysis.characterPatterns.archetypes.slice(0, 3).join(', ')}`,
            `with themes of ${analysis.signatureElements.recurringThemes.slice(0, 3).join(', ')}`,
        ].join(' ');

        // Create embedding text
        const embeddingText = [
            script.title,
            script.genre,
            synopsis,
            analysis.narrativeVoice.dialogueStyle,
            analysis.signatureElements.recurringThemes.join(' '),
            analysis.characterPatterns.archetypes.join(' '),
            analysis.visualSuggestions.colorPalette.join(' '),
        ].join(' | ');

        console.log(`[Ingest] Generating embedding: ${script.title}`);
        const embedding = await embeddingService.getEmbedding(embeddingText);

        // Upsert into database
        console.log(`[Ingest] Saving to database: ${script.title}`);
        await prisma.$executeRaw`
            INSERT INTO "ScriptLibrary" (
                id, title, genre, "subGenres", synopsis,
                "narrativeVoice", "characterPatterns", "storyStructure",
                "visualStyle", "signatureElements", "sampleExcerpts", "promptTemplates",
                "sourceFilePath", "contentHash", indexed, "indexedAt",
                embedding, "createdAt", "updatedAt"
            ) VALUES (
                gen_random_uuid(),
                ${script.title},
                ${script.genre},
                ${JSON.stringify(analysis.subGenres || [])}::jsonb,
                ${synopsis},
                ${JSON.stringify(analysis.narrativeVoice)}::jsonb,
                ${JSON.stringify(analysis.characterPatterns)}::jsonb,
                ${JSON.stringify(analysis.storyStructure)}::jsonb,
                ${JSON.stringify(analysis.visualSuggestions)}::jsonb,
                ${JSON.stringify(analysis.signatureElements)}::jsonb,
                ${JSON.stringify(analysis.sampleExcerpts)}::jsonb,
                ${JSON.stringify(analysis.promptTemplates)}::jsonb,
                ${script.filePath},
                ${contentHash},
                true,
                NOW(),
                ${embedding}::vector,
                NOW(),
                NOW()
            )
            ON CONFLICT (title) DO UPDATE SET
                synopsis = EXCLUDED.synopsis,
                "narrativeVoice" = EXCLUDED."narrativeVoice",
                "characterPatterns" = EXCLUDED."characterPatterns",
                "storyStructure" = EXCLUDED."storyStructure",
                "visualStyle" = EXCLUDED."visualStyle",
                "signatureElements" = EXCLUDED."signatureElements",
                "sampleExcerpts" = EXCLUDED."sampleExcerpts",
                "promptTemplates" = EXCLUDED."promptTemplates",
                "contentHash" = EXCLUDED."contentHash",
                indexed = true,
                "indexedAt" = NOW(),
                embedding = EXCLUDED.embedding,
                "updatedAt" = NOW()
        `;

        console.log(`[Ingest] ✓ Successfully ingested: ${script.title}`);
        return true;
    } catch (error: any) {
        console.error(`[Ingest] ✗ Failed to ingest ${script.title}: ${error.message}`);
        return false;
    }
}

/**
 * Main ingestion function
 */
async function main() {
    const args = process.argv.slice(2);

    const options: IngestOptions = {
        dryRun: args.includes('--dry-run'),
        force: args.includes('--force'),
    };

    // Parse --genre option
    const genreIndex = args.indexOf('--genre');
    if (genreIndex !== -1 && args[genreIndex + 1]) {
        options.genre = args[genreIndex + 1];
    }

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('Script Library Ingestion Utility');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`Library Path: ${SCRIPT_LIBRARY_BASE}`);
    console.log(`Genre Filter: ${options.genre || 'All'}`);
    console.log(`Mode: ${options.dryRun ? 'DRY RUN' : 'LIVE'}`);
    console.log(`Force Re-index: ${options.force}`);
    console.log('───────────────────────────────────────────────────────────────');

    // Discover scripts
    const scripts = discoverScripts(options.genre);
    console.log(`\nDiscovered ${scripts.length} script files`);

    if (scripts.length === 0) {
        console.log('No scripts found to ingest.');
        await prisma.$disconnect();
        return;
    }

    // Group by genre for display
    const byGenre: Record<string, ScriptFile[]> = {};
    for (const script of scripts) {
        if (!byGenre[script.genre]) byGenre[script.genre] = [];
        byGenre[script.genre].push(script);
    }

    console.log('\nScripts by genre:');
    for (const [genre, genreScripts] of Object.entries(byGenre)) {
        console.log(`  ${genre}: ${genreScripts.length} scripts`);
    }

    if (options.dryRun) {
        console.log('\n[DRY RUN] Would ingest the following scripts:');
        for (const script of scripts) {
            const needs = await needsIndexing(script, options.force);
            const status = needs ? '→ WILL INGEST' : '→ SKIP (already indexed)';
            console.log(`  ${script.genre}/${script.title} ${status}`);
        }
        await prisma.$disconnect();
        return;
    }

    // Ingest scripts
    console.log('\n───────────────────────────────────────────────────────────────');
    console.log('Starting ingestion...\n');

    let success = 0;
    let skipped = 0;
    let failed = 0;

    for (const script of scripts) {
        const needs = await needsIndexing(script, options.force);
        if (!needs) {
            console.log(`[Ingest] Skipping (already indexed): ${script.title}`);
            skipped++;
            continue;
        }

        const result = await ingestScript(script);
        if (result) {
            success++;
        } else {
            failed++;
        }

        // Rate limiting - avoid overwhelming the embedding API
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('Ingestion Complete');
    console.log('───────────────────────────────────────────────────────────────');
    console.log(`  ✓ Success: ${success}`);
    console.log(`  → Skipped: ${skipped}`);
    console.log(`  ✗ Failed:  ${failed}`);
    console.log('═══════════════════════════════════════════════════════════════');

    await prisma.$disconnect();
}

// Run the script
main().catch(async (error) => {
    console.error('Fatal error:', error);
    await prisma.$disconnect();
    process.exit(1);
});
