import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001/api';
const PROJECT_ID = 'test-project-id'; // Assuming this exists or we can use a dummy one if FKs are loose

async function testAudioGeneration() {
    console.log('Testing Audio Generation API...');

    try {
        // 1. Create Audio Generation
        console.log('\n1. Creating Audio Generation...');

        // Fetch a project ID
        const projectsRes = await fetch(`${BASE_URL}/projects`);
        const projects = await projectsRes.json() as any[];
        const projectId = projects.length > 0 ? projects[0].id : 'dummy-uuid';

        const res = await fetch(`${BASE_URL}/projects/${projectId}/generations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                projectId,
                mode: 'text_to_audio',
                inputPrompt: "Cinematic orchestral build-up",
                duration: "5",
                engine: 'fal'
            })
        });

        const generation = await res.json() as any;
        console.log('Generation created:', generation.id);

        if (generation.id) {
            // 2. Poll for status
            console.log('\n2. Polling for status...');
            let attempts = 0;
            const poll = async () => {
                if (attempts > 30) {
                    console.error('Timeout waiting for audio generation');
                    return;
                }

                const checkRes = await fetch(`${BASE_URL}/projects/${projectId}/generations`); // Fetch all for project
                // Or better, fetch all and find by ID
                const gens = await checkRes.json() as any[];
                const gen = gens.find((g: any) => g.id === generation.id);

                if (gen) {
                    console.log(`Status: ${gen.status}`);
                    if (gen.status === 'succeeded') {
                        console.log('Audio Generation Succeeded!');
                        console.log('Outputs:', gen.outputs);
                        if (gen.outputs && gen.outputs.length > 0 && gen.outputs[0].type === 'audio') {
                            console.log('Verified output type is audio.');
                        } else {
                            console.error('Output type mismatch or missing.');
                        }
                    } else if (gen.status === 'failed') {
                        console.error('Audio Generation Failed:', gen.failureReason);
                    } else {
                        attempts++;
                        setTimeout(poll, 2000);
                    }
                } else {
                    console.error('Generation not found in list');
                }
            };
            poll();
        }

    } catch (err) {
        console.error('Test failed:', err);
    }
}

testAudioGeneration();
