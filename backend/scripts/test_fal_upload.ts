import * as fal from "@fal-ai/serverless-client";
import fs from 'fs';
import path from 'path';

// Load env vars
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

fal.config({
    credentials: process.env.FAL_KEY || '',
});

async function testUpload() {
    try {
        console.log('Testing Fal Storage Upload...');
        const testFile = path.join(__dirname, 'test_upload.txt');
        fs.writeFileSync(testFile, 'This is a test file for Fal storage upload.');

        console.log('Uploading file:', testFile);
        // Read as buffer to avoid duplex stream issue in Node fetch
        const fileBuffer = fs.readFileSync(testFile);
        // @ts-ignore
        const url = await fal.storage.upload(fileBuffer);
        console.log('Upload successful!');
        console.log('URL:', url);

        fs.unlinkSync(testFile);
    } catch (error) {
        console.error('Upload failed details:', error);
    }
}

testUpload();
