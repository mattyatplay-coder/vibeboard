
import { PrismaClient } from '@prisma/client';
import { GrokAdapter } from '../services/llm/GrokAdapter';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main() {
    console.log("🔍 Finding latest generation...");
    const generation = await prisma.generation.findFirst({
        where: { status: 'succeeded' },
        orderBy: { createdAt: 'desc' },
        take: 1
    });

    if (!generation || !generation.outputs) {
        console.error("❌ No succeeded generation found.");
        return;
    }

    let imageUrl: string;
    try {
        const outputs = JSON.parse(generation.outputs);
        console.log("📄 FULL OUTPUTS:", JSON.stringify(outputs, null, 2));
        imageUrl = outputs[0]?.url;
    } catch (e) {
        console.error("❌ Failed to parse outputs");
        return;
    }

    if (!imageUrl) {
        console.error("❌ No image URL in output");
        return;
    }

    console.log(`✅ Found Generation URL: ${imageUrl}`);

    // Validate accessibility
    /*
    try {
        const check = await fetch(imageUrl);
        console.log(`   URL Check: ${check.status} ${check.statusText}`);
    } catch (e) {
        console.log(`   URL Check Failed: ${e.message}`);
    }
    */

    const grok = new GrokAdapter();
    console.log("\n🧪 Sending to Grok...");

    try {
        const res = await grok.analyzeImage([imageUrl], "Describe this image in detail.");
        console.log("✅ Success!", res.substring(0, 100));
    } catch (e: any) {
        console.error("❌ Grok Failed:", e.message);
        if (e.response?.data) {
            console.error("⬇️ RESPONSE DATA ⬇️");
            console.error(JSON.stringify(e.response.data, null, 2));
        }
    }
}

main().finally(() => prisma.$disconnect());
