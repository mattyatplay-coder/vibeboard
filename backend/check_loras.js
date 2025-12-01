
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const loras = await prisma.loRA.findMany();
        console.log("Installed LoRAs:");
        if (loras.length === 0) {
            console.log("No LoRAs found in database.");
        } else {
            loras.forEach(l => {
                console.log(`- ${l.name} (${l.baseModel}): ${l.fileUrl} (Trigger: ${l.triggerWord || 'None'})`);
            });
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
