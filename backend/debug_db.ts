import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const generations = await prisma.generation.findMany();
    console.log(`Found ${generations.length} generations:`);
    generations.forEach(g => {
        console.log(`- ID: ${g.id}, Project: ${g.projectId}, Session: ${g.sessionId}, Created: ${g.createdAt}`);
    });

    const sessions = await prisma.session.findMany();
    console.log(`\nFound ${sessions.length} sessions:`);
    sessions.forEach(s => {
        console.log(`- ID: ${s.id}, Name: ${s.name}, Project: ${s.projectId}`);
    });

    if (generations.length > 0 && sessions.length > 0) {
        const lastGen = generations[0]; // ordered by createdAt desc usually? No, findMany default order is undefined.
        // Let's sort to get latest
        generations.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        const latest = generations[0];
        const firstSession = sessions[0];

        console.log(`\nAssigning Generation ${latest.id} to Session ${firstSession.id} (${firstSession.name})...`);

        await prisma.generation.update({
            where: { id: latest.id },
            data: { sessionId: firstSession.id }
        });
        console.log("Done.");
    }

}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
