
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const PROJECT_ID = 'f7a8877f-e66e-4114-b8dd-05cb874d462a';

async function verifyGeneration() {
    console.log("🔍 Verifying Latest Generation...");

    const generation = await prisma.generation.findFirst({
        where: { projectId: PROJECT_ID },
        orderBy: { createdAt: 'desc' },
    });

    if (!generation) {
        console.error("❌ No generations found!");
        process.exit(1);
    }

    console.log("--- Generation Details ---");
    console.log(`ID: ${generation.id}`);
    console.log(`Status: ${generation.status}`);
    console.log(`Mode: ${generation.mode}`);
    console.log(`Engine: ${generation.engine}`);
    console.log(`Aspect Ratio: ${generation.aspectRatio}`);
    console.log(`Source Element IDs: ${generation.sourceElementIds}`);
    console.log(`Input Prompt: ${generation.inputPrompt}`);

    // Validation Logic
    const isImageToVideo = generation.mode === 'image_to_video';
    // const isAspectRatioCorrect = generation.aspectRatio === '9:16'; // Note: Frontend might send "9:16" or "9x16"?
    // actually schema says String?

    const hasSourceElements = generation.sourceElementIds && generation.sourceElementIds !== '[]';

    if (isImageToVideo && hasSourceElements) {
        console.log("✅ SUCCESS: Generation used Image-to-Video mode with Source Elements.");
    } else {
        console.error("❌ FAILURE: Generation parameters incorrect.");
        if (!isImageToVideo) console.log(`   - expected mode 'image_to_video', got '${generation.mode}'`);
        if (!hasSourceElements) console.log(`   - sourceElementIds is empty or null`);
        process.exit(1);
    }
}

verifyGeneration()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
