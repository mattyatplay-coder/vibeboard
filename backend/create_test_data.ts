import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Creating test data...");

    // 1. Create a dummy project
    const project = await prisma.project.create({
        data: {
            name: "Test Project (For Verification)",
            description: "A project to test cross-project element filtering."
        }
    });
    console.log(`Created Project: ${project.name} (${project.id})`);

    // 2. Create dummy elements in this project
    const elements = await prisma.element.createMany({
        data: [
            {
                projectId: project.id,
                name: "Test Element 1 (Global)",
                type: "character",
                fileUrl: "/uploads/placeholder.png", // Dummy URL
                tags: ["test", "global"]
            },
            {
                projectId: project.id,
                name: "Test Element 2 (Global)",
                type: "prop",
                fileUrl: "/uploads/placeholder.png", // Dummy URL
                tags: ["test", "global"]
            }
        ]
    });

    console.log(`Created ${elements.count} elements in Test Project.`);
    console.log("Verification Steps:");
    console.log("1. Refresh your main project page.");
    console.log("2. Check the Reference Bar -> These new elements should NOT be there.");
    console.log("3. Type '@Test' in the prompt -> These elements SHOULD appear.");
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
