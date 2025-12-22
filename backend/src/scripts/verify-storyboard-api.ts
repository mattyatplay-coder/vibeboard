import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

const API_URL = 'http://localhost:3001/api/storyboard';

async function verifyApi() {
  try {
    console.log('🚀 Starting Storyboard API Verification');

    // 1. Create Element
    console.log('\n1. Creating Element...');
    const form = new FormData();
    form.append('name', 'Myllin');
    form.append('type', 'CHARACTER');

    // Create a dummy file
    const dummyPath = path.join(__dirname, 'dummy.txt');
    fs.writeFileSync(dummyPath, 'dummy content');
    form.append('views', fs.createReadStream(dummyPath));

    const elementRes = await axios.post(`${API_URL}/elements`, form, {
      headers: { ...form.getHeaders() },
    });
    console.log('✅ Element Created:', elementRes.data.id, elementRes.data.name);

    // 2. Create Project
    console.log('\n2. Creating Project...');
    const projectRes = await axios.post(`${API_URL}/projects`, {
      name: 'Test Project',
      description: 'Integration Test',
    });
    console.log('✅ Project Created:', projectRes.data.id);

    // 3. Create Shot with Reference
    console.log('\n3. Creating Shot with @Myllin reference...');
    const shotRes = await axios.post(`${API_URL}/shots`, {
      projectId: projectRes.data.id,
      prompt: '@Myllin walks through the forest',
    });
    console.log('✅ Shot Created:', shotRes.data.id);
    console.log('   Prompt:', shotRes.data.prompt);

    // Check if element was linked
    if (shotRes.data.elements && shotRes.data.elements.length > 0) {
      console.log('✅ Element Linked:', shotRes.data.elements[0].elementId);
    } else {
      console.error('❌ Element NOT Linked!');
    }

    // 4. Get Project Details
    console.log('\n4. Fetching Project Details...');
    const projectDetails = await axios.get(`${API_URL}/projects/${projectRes.data.id}`);
    console.log('✅ Project Details Fetched');
    console.log('   Total Shots:', projectDetails.data.shots.length);

    console.log('\n🎉 Verification Complete!');

    // Cleanup
    fs.unlinkSync(dummyPath);
  } catch (error: any) {
    console.error('❌ Verification Failed:');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('   Message:', error.message);
    }
    process.exit(1);
  }
}

verifyApi();
