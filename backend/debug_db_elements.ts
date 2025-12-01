import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const elementsByProject = await prisma.element.groupBy({
        by: ['projectId'],
        _count: {
            id: true
        }
    });

    console.log("Elements per Project:");
    console.log(elementsByProject);

    const allProjects = await prisma.project.findMany();
    console.log("\nAll Projects:");
    allProjects.forEach(p => console.log(`- ${p.name} (${p.id})`));
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
