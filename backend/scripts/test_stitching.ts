import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3001/api';

async function testStitching() {
    console.log("Testing Video Stitching & Export...");

    try {
        // 1. Create a Project
        console.log("Creating project...");
        const projectRes = await axios.post(`${BASE_URL}/projects`, {
            name: "Stitching Test Project",
            description: "Testing video export"
        });
        const projectId = projectRes.data.id;
        console.log(`Project created: ${projectId}`);

        // 2. Create Scenes
        console.log("Creating scenes...");
        const scene1Res = await axios.post(`${BASE_URL}/projects/${projectId}/scenes`, { name: "Scene 1" });
        const scene2Res = await axios.post(`${BASE_URL}/projects/${projectId}/scenes`, { name: "Scene 2" });
        const scene1Id = scene1Res.data.id;
        const scene2Id = scene2Res.data.id;

        // 3. Create Generations (Mocking them in DB directly to save time/cost)
        console.log("Creating mock generations...");
        // Using small sample videos
        const video1 = "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4";
        const video2 = "https://test-videos.co.uk/vids/jellyfish/mp4/h264/360/Jellyfish_360_10s_1MB.mp4";

        const gen1 = await prisma.generation.create({
            data: {
                projectId,
                mode: "text_to_video",
                inputPrompt: "Test Video 1",
                status: "succeeded",
                outputs: [{ type: "video", url: video1 }]
            }
        });

        const gen2 = await prisma.generation.create({
            data: {
                projectId,
                mode: "text_to_video",
                inputPrompt: "Test Video 2",
                status: "succeeded",
                outputs: [{ type: "video", url: video2 }]
            }
        });

        // 4. Add Shots to Scenes
        console.log("Adding shots...");
        await axios.post(`${BASE_URL}/projects/${projectId}/scenes/${scene1Id}/shots`, {
            generationId: gen1.id,
            index: 0
        });
        await axios.post(`${BASE_URL}/projects/${projectId}/scenes/${scene2Id}/shots`, {
            generationId: gen2.id,
            index: 0
        });

        // 5. Trigger Export
        console.log("Triggering export...");
        // Note: This might take a while, so we might need to increase timeout
        const exportRes = await axios.post(`${BASE_URL}/projects/${projectId}/export`, {}, { timeout: 60000 });

        console.log("Export Result:", exportRes.data);

        if (exportRes.data.url) {
            console.log("SUCCESS: Export URL received:", exportRes.data.url);
        } else {
            console.error("FAILURE: No export URL received");
        }

    } catch (error: any) {
        console.error("Test failed:", error.response?.data || error.message);
    } finally {
        await prisma.$disconnect();
    }
}

testStitching();
