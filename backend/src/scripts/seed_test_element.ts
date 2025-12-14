
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();
const PROJECT_ID = 'f7a8877f-e66e-4114-b8dd-05cb874d462a'; // From current URL
const TEST_IMAGE_PATH = '/Users/matthenrichmacbook/.gemini/antigravity/brain/17ac625b-e3f9-4172-9eaf-ae1fc044cef8/uploaded_image_1765717687371.png';

async function seed() {
    console.log("🌱 Seeding Test Element...");

    // 1. Verify Image Exists
    if (!fs.existsSync(TEST_IMAGE_PATH)) {
        console.error(`❌ Test image not found at ${TEST_IMAGE_PATH}`);
        process.exit(1);
    }

    // 2. Create Element Record
    // Note: In a real app we'd upload the file to /uploads. 
    // For this test, we'll assume the backend can serve the 'brain' path or we copy it.
    // Actually, backend only serves 'uploads'. We should copy it.

    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const fileName = `test_consistency_${Date.now()}.png`;
    const destPath = path.join(uploadDir, fileName);

    fs.copyFileSync(TEST_IMAGE_PATH, destPath);
    console.log(`✅ Copied image to ${destPath}`);

    const element = await prisma.element.create({
        data: {
            name: "Consistency Test Subject",
            type: "image",
            // url: `/uploads/${fileName}`, // Removed as per schema
            fileUrl: `/uploads/${fileName}`, // Internal Path (relative to root/public or whatever logic)
            projectId: PROJECT_ID,
            // category: "character", // Removed as per schema
        }
    });

    console.log(`✅ Created Element: ${element.id} (${element.name})`);
    console.log("Done.");
}

seed()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
