import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { falTrainingService } from '../src/services/training/FalTrainingService';

// Mock Fal client to avoid real charges/calls during verify, OR use real test if safe
// For this verification, we want to verify OUR logic (zip, upload, params).
// We'll mock the internal calls if possible, or just run it and expect a failure from Fal if creds invalid, 
// but we verified upload works. 

// Let's rely on the real Fal SDK for upload (verified working) and queue.submit.
// We'll trust it works or fail with a clear error.

async function verifyTrainingFlow() {
    console.log('Verifying Training Flow...');

    // 1. Create dummy images
    const tempDir = path.resolve(__dirname, 'temp_verify_train');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

    const images = [];
    for (let i = 0; i < 3; i++) {
        const imgPath = path.join(tempDir, `img_${i}.txt`);
        fs.writeFileSync(imgPath, `dummy content ${i}`);
        images.push(imgPath);
    }

    try {
        // 2. Create Zip
        console.log('2. Creating Zip...');
        const zipPath = await falTrainingService.createDatasetZip(images, tempDir);
        console.log('Zip created:', zipPath);

        // 3. Upload Zip
        console.log('3. Uploading Zip...');
        const datasetUrl = await falTrainingService.uploadDataset(zipPath);
        console.log('Dataset uploaded:', datasetUrl);

        // 4. Submit Job (Dry run parameter check by just logging the call in service? 
        // No, we updated the service to actually call Fal. 
        // Submitting with dummy files might fail on Fal side if validation exists, but inputs are just URL.
        // We'll try. 
        console.log('4. Submitting Job...');
        const requestId = await falTrainingService.startTraining(datasetUrl, 'TEST_TRIGGER', 100);
        console.log('Job submitted, Request ID:', requestId);

        console.log('VERIFICATION SUCCESSFUL');
    } catch (error) {
        console.error('VERIFICATION FAILED:', error);
    } finally {
        // Cleanup
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    }
}

verifyTrainingFlow();
