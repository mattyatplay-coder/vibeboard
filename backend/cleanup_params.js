
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        // Get all parameters
        const allParams = await prisma.modelParameter.findMany();

        // Group by type and value to find duplicates
        const seen = new Set();
        const duplicates = [];

        for (const param of allParams) {
            const key = `${param.projectId}-${param.type}-${param.value}`;
            if (seen.has(key)) {
                duplicates.push(param.id);
            } else {
                seen.add(key);
            }
        }

        console.log(`Found ${duplicates.length} duplicates.`);

        if (duplicates.length > 0) {
            await prisma.modelParameter.deleteMany({
                where: {
                    id: {
                        in: duplicates
                    }
                }
            });
            console.log("Duplicates removed.");
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
