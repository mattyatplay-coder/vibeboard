import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Testing Scene Chain...");
    let project = await prisma.project.findFirst();
    if (!project) {
        console.log("Creating test project...");
        project = await prisma.project.create({
            data: { name: "Test Project" }
        });
    }

    const chain = await prisma.sceneChain.create({
        data: {
            projectId: project.id,
            name: "Test Chain",
            description: "A test scene chain"
        }
    });
    console.log("Created chain:", chain.id);

    const scene = await prisma.scene.create({
        data: {
            projectId: project.id,
            name: "Test Scene in Chain",
            sceneChainId: chain.id
        }
    });
    console.log("Created scene in chain:", scene.id);

    const fetchedChain = await prisma.sceneChain.findUnique({
        where: { id: chain.id },
        include: { scenes: true }
    });
    console.log("Fetched chain with scenes:", fetchedChain?.scenes.length);

    // Cleanup
    await prisma.scene.delete({ where: { id: scene.id } });
    await prisma.sceneChain.delete({ where: { id: chain.id } });
    console.log("Cleanup complete");
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
