/**
 * Script to update LoRA metadata from CivitAI
 *
 * Usage: npx ts-node scripts/update-lora-metadata.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CivitaiModelVersion {
    id: number;
    modelId: number;
    name: string;
    baseModel: string;
    trainedWords: string[];
    model: {
        name: string;
        type: string;
    };
}

// Extract version ID from CivitAI URL
function extractVersionId(url: string): string | null {
    if (!url || !url.includes('civitai.com')) return null;

    // Pattern 1: https://civitai.com/api/download/models/XXXXXX
    const downloadMatch = url.match(/civitai\.com\/api\/download\/models\/(\d+)/);
    if (downloadMatch) return downloadMatch[1];

    // Pattern 2: ?modelVersionId=XXXXXX
    const versionMatch = url.match(/modelVersionId=(\d+)/);
    if (versionMatch) return versionMatch[1];

    return null;
}

// Fetch model version details from CivitAI
async function fetchCivitaiVersion(versionId: string): Promise<CivitaiModelVersion | null> {
    try {
        const response = await fetch(`https://civitai.com/api/v1/model-versions/${versionId}`);
        if (!response.ok) {
            console.log(`  ❌ CivitAI API returned ${response.status} for version ${versionId}`);
            return null;
        }
        return await response.json();
    } catch (error) {
        console.log(`  ❌ Failed to fetch from CivitAI: ${error}`);
        return null;
    }
}

// Normalize base model name
function normalizeBaseModel(civitaiBase: string): string {
    if (!civitaiBase) return 'Unknown';

    const lower = civitaiBase.toLowerCase();

    // Flux variants
    if (lower.includes('flux') && lower.includes('dev')) return 'Flux.1 Dev';
    if (lower.includes('flux') && lower.includes('schnell')) return 'Flux.1 Schnell';
    if (lower.includes('flux')) return 'Flux.1';

    // Pony
    if (lower.includes('pony')) return 'Pony';

    // SD3
    if (lower.includes('sd 3') || lower.includes('sd3')) return 'SD3';

    // SDXL
    if (lower.includes('sdxl') || lower.includes('xl')) return 'SDXL 1.0';

    // SD 1.5
    if (lower.includes('sd 1.5') || lower.includes('sd1.5') || lower === 'sd 1.5') return 'SD 1.5';

    // Wan
    if (lower.includes('wan')) {
        if (lower.includes('i2v') && lower.includes('14b')) return 'Wan 2.2 I2V-A14B';
        if (lower.includes('t2v')) return 'Wan 2.2 T2V';
        return 'Wan 2.2';
    }

    // Hunyuan
    if (lower.includes('hunyuan')) return 'Hunyuan Video';

    return civitaiBase; // Return as-is if no match
}

async function updateLoRAMetadata() {
    console.log('🔍 Fetching all LoRAs from database...\n');

    // Get all LoRAs
    const loras = await prisma.loRA.findMany();
    console.log(`Found ${loras.length} LoRAs in database\n`);

    let updated = 0;
    let skipped = 0;
    let failed = 0;

    for (const lora of loras) {
        console.log(`\n📦 Processing: ${lora.name}`);
        console.log(`   Current baseModel: ${lora.baseModel}`);
        console.log(`   Current triggerWord: ${lora.triggerWord || '(none)'}`);

        const versionId = extractVersionId(lora.fileUrl);

        if (!versionId) {
            // Check if it's an Angelica LoRA (user specified these are Flux.1 Dev)
            if (lora.name.toLowerCase().includes('angelica')) {
                console.log(`   ℹ️  Angelica LoRA - setting to Flux.1 Dev per user specification`);
                await prisma.loRA.update({
                    where: { id: lora.id },
                    data: {
                        baseModel: 'Flux.1 Dev',
                        triggerWord: lora.triggerWord || 'ohwx_angelica'
                    }
                });
                updated++;
                continue;
            }

            console.log(`   ⏭️  Skipping - not a CivitAI URL: ${lora.fileUrl.substring(0, 50)}...`);
            skipped++;
            continue;
        }

        console.log(`   🌐 Fetching CivitAI version ${versionId}...`);

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

        const civitaiData = await fetchCivitaiVersion(versionId);

        if (!civitaiData) {
            console.log(`   ❌ Failed to fetch from CivitAI`);
            failed++;
            continue;
        }

        const newBaseModel = normalizeBaseModel(civitaiData.baseModel);
        const newTriggerWords = civitaiData.trainedWords || [];
        const newTriggerWord = newTriggerWords.length > 0 ? newTriggerWords[0] : lora.triggerWord;

        console.log(`   📊 CivitAI data:`);
        console.log(`      - baseModel: ${civitaiData.baseModel} → ${newBaseModel}`);
        console.log(`      - trainedWords: ${newTriggerWords.join(', ') || '(none)'}`);

        // Update the LoRA
        await prisma.loRA.update({
            where: { id: lora.id },
            data: {
                baseModel: newBaseModel,
                triggerWord: newTriggerWord,
                triggerWords: newTriggerWords.length > 0 ? JSON.stringify(newTriggerWords) : lora.triggerWords
            }
        });

        console.log(`   ✅ Updated!`);
        updated++;
    }

    // Now update GlobalLoRA table
    console.log('\n\n🔍 Fetching all Global LoRAs from database...\n');

    const globalLoras = await prisma.globalLoRA.findMany();
    console.log(`Found ${globalLoras.length} Global LoRAs in database\n`);

    for (const lora of globalLoras) {
        console.log(`\n📦 Processing Global: ${lora.name}`);
        console.log(`   Current baseModel: ${lora.baseModel}`);

        const versionId = extractVersionId(lora.fileUrl);

        if (!versionId) {
            // Check if it's an Angelica LoRA
            if (lora.name.toLowerCase().includes('angelica')) {
                console.log(`   ℹ️  Angelica LoRA - setting to Flux.1 Dev per user specification`);
                await prisma.globalLoRA.update({
                    where: { id: lora.id },
                    data: {
                        baseModel: 'Flux.1 Dev',
                        triggerWord: lora.triggerWord || 'ohwx_angelica'
                    }
                });
                updated++;
                continue;
            }

            console.log(`   ⏭️  Skipping - not a CivitAI URL`);
            skipped++;
            continue;
        }

        console.log(`   🌐 Fetching CivitAI version ${versionId}...`);

        await new Promise(resolve => setTimeout(resolve, 500));

        const civitaiData = await fetchCivitaiVersion(versionId);

        if (!civitaiData) {
            console.log(`   ❌ Failed to fetch from CivitAI`);
            failed++;
            continue;
        }

        const newBaseModel = normalizeBaseModel(civitaiData.baseModel);
        const newTriggerWords = civitaiData.trainedWords || [];
        const newTriggerWord = newTriggerWords.length > 0 ? newTriggerWords[0] : lora.triggerWord;

        console.log(`   📊 CivitAI data:`);
        console.log(`      - baseModel: ${civitaiData.baseModel} → ${newBaseModel}`);
        console.log(`      - trainedWords: ${newTriggerWords.join(', ') || '(none)'}`);

        await prisma.globalLoRA.update({
            where: { id: lora.id },
            data: {
                baseModel: newBaseModel,
                triggerWord: newTriggerWord
            }
        });

        console.log(`   ✅ Updated!`);
        updated++;
    }

    console.log('\n\n========================================');
    console.log('📊 SUMMARY');
    console.log('========================================');
    console.log(`✅ Updated: ${updated}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`❌ Failed: ${failed}`);
    console.log('========================================\n');
}

updateLoRAMetadata()
    .then(() => {
        console.log('Done!');
        process.exit(0);
    })
    .catch(error => {
        console.error('Error:', error);
        process.exit(1);
    })
    .finally(() => {
        prisma.$disconnect();
    });
