import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const elements = await prisma.element.findMany({
        where: { name: { contains: 'Generated Image' } },
        take: 20,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, fileUrl: true }
    });

    console.log("Recent Elements:");
    elements.forEach(e => console.log(`[${e.name}] -> ${e.fileUrl}`));
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
