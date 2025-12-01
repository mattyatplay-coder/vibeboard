#!/usr/bin/env ts-node
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment
dotenv.config({ path: path.join(__dirname, '../.env') });

console.log('=== Environment Check ===');
console.log('REPLICATE_API_TOKEN:', process.env.REPLICATE_API_TOKEN ? `Set (${process.env.REPLICATE_API_TOKEN.substring(0, 10)}...)` : 'NOT SET');
console.log('FAL_KEY:', process.env.FAL_KEY ? 'Set' : 'NOT SET');
console.log('TOGETHER_API_KEY:', process.env.TOGETHER_API_KEY ? 'Set' : 'NOT SET');

// Test Replicate import
try {
    const { ReplicateAdapter } = require('../src/services/generators/ReplicateAdapter');
    const adapter = new ReplicateAdapter();
    console.log('\n✅ Replicate adapter initialized successfully');
} catch (err) {
    console.error('\n❌ Replicate adapter failed:', err);
}
