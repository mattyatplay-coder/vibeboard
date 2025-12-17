
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkStatus() {
    try {
        const jobs = await prisma.trainingJob.findMany({
            orderBy: { createdAt: 'desc' },
            take: 1
        });

        if (jobs.length === 0) {
            console.log("No jobs found.");
            return;
        }

        const job = jobs[0];
        console.log(`Job ID: ${job.id}`);
        console.log(`Name: ${job.name}`);
        console.log(`Status: ${job.status}`);
        console.log(`Provider ID: ${job.providerJobId}`);
        console.log(`Created At: ${job.createdAt}`);

        // If we wanted to check Fal/Replicate directly we could, but let's trust the DB state 
        // which the backend should be updating if the frontend is polling.
        // Actually, since I can't rely on frontend polling updating the DB if the user isn't looking,
        // the DB might be stale.
        // But the user just asked "is it still running", so knowing the DB state is a good start.

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkStatus();
