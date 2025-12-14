import { PrismaClient } from '@prisma/client';
import { GenerationService } from '../src/services/GenerationService';
import { GenerationOptions } from '../src/services/generators/GenerationProvider';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const service = new GenerationService();

async function main() {
    const logFile = path.join(__dirname, 'test_results.md');
    const log = (msg: string) => {
        console.log(msg);
        fs.appendFileSync(logFile, msg + '\n');
    };

    fs.writeFileSync(logFile, '# Model Test Results\n\n');
    log("🚀 Starting Comprehensive Model Test...");

    // 1. Fetch Reference Elements
    log("🔍 Fetching reference elements...");
    const zoomElement = await prisma.element.findFirst({
        where: { name: { contains: 'zoom in over ocean', mode: 'insensitive' } }
    });
    const characterElement = await prisma.element.findFirst({
        where: { name: { contains: 'myllin.character.sheet', mode: 'insensitive' } }
    });

    const zoomUrl = zoomElement?.fileUrl || "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"; // Fallback
    const charUrl = characterElement?.fileUrl || "https://fal.media/files/monkey/learning_monkey.jpg"; // Fallback

    log(`   - Zoom Ref: ${zoomUrl}`);
    log(`   - Char Ref: ${charUrl}`);

    // 2. Define Test Prompt
    const prompt = `Create an 8 second 3D animated cinematic shot in 16:9. Use @zoom in over ocean as the exact reference for environment, and lighting. Use @myllin.character.sheet for the character design. Start with a long 7 second FPV drone, High Energy Flight, camera shot from the drones perspective, of the Hawaiian coastline at golden hour using @zoom in over ocean as the starting Frame, and ending with @zoom the boy standing on the rocky ledge, tiny against the glowing ocean. The clouds are soft and pastel, the water glows with reflected sun. Keep the boy still in silhouette, hair moving slightly in the breeze. Style: modern Disney/Pixar ocean adventure, saturated colors, soft shapes, subtle filmic depth of field.`;

    // 3. Define Test Cases
    const testCases: { name: string; options: GenerationOptions; image?: string }[] = [
        {
            name: "Google Veo 3.1 (Text-to-Video)",
            options: {
                prompt,
                model: 'veo-3.1',
                mode: 'text_to_video',
                duration: '8',
                aspectRatio: '16:9',
                cameraMovement: { type: 'pan', direction: 'right', intensity: 5 } // Should be converted to prompt
            }
        },
        {
            name: "Fal Kling (Text-to-Video + Camera)",
            options: {
                prompt,
                model: 'fal-ai/kling-video/v1/standard/text-to-video',
                mode: 'text_to_video',
                duration: '5',
                aspectRatio: '16:9',
                cameraMovement: { type: 'zoom', direction: 'in', intensity: 8 } // Should use API params
            }
        },
        {
            name: "Fal Wan 2.1 (Image-to-Video)",
            options: {
                prompt,
                model: 'fal-ai/wan-i2v', // Try standard path again
                mode: 'image_to_video',
                duration: '5',
                aspectRatio: '16:9'
            },
            image: charUrl // Use character sheet as input
        },
        {
            name: "Fal LTX (Text-to-Video)",
            options: {
                prompt,
                model: 'fal-ai/ltx-video',
                mode: 'text_to_video',
                duration: '5', // Maps to 6
                aspectRatio: '16:9'
            }
        }
    ];

    // 4. Run Tests
    for (const test of testCases) {
        log(`\n## Testing: ${test.name}`);
        try {
            // Mock the prompt builder's work by manually injecting references if needed, 
            // but GenerationService usually expects the prompt to be pre-processed or handles it.
            // Here we pass the raw prompt. The adapters generally pass it through.
            // Note: Real app uses PromptBuilder before calling Service. 
            // We are testing the Service/Adapter layer here.

            const result = await service.generateVideo(test.image, test.options);

            if (result.status === 'succeeded') {
                log(`   ✅ **Success!**`);
                log(`   - Output: ${result.outputs?.[0]}`);
                log(`   - Provider: ${result.provider}`);
            } else {
                log(`   ❌ **Failed**`);
                log(`   - Error: ${result.error}`);
            }
        } catch (error: any) {
            log(`   ❌ **Exception**`);
            log(`   - Message: ${error.message}`);
        }
    }

    log("\n🏁 Test Complete.");
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
