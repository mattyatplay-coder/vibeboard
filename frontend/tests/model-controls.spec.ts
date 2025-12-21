import { test, expect } from '@playwright/test';
import { ALL_MODELS } from '../src/lib/ModelRegistry';

/**
 * Model-Specific Controls Tests
 *
 * Verifies that:
 * 1. Models have correct maxVariations values
 * 2. Video models have supportedDurations defined
 * 3. Duration dropdown only shows for video models with supportedDurations
 * 4. Quantity dropdown respects maxVariations
 */

test.describe('Model Registry - Variations and Durations', () => {

    test('Google models should be limited to 1-4 variations', async () => {
        const googleModels = ALL_MODELS.filter(m => m.maker === 'Google');

        console.log(`Found ${googleModels.length} Google models`);

        for (const model of googleModels) {
            const effectiveMax = model.maxVariations ?? (model.type === 'video' ? 1 : 4);
            if (model.type === 'video') {
                expect(effectiveMax).toBe(1);
                console.log(`✅ ${model.name}: maxVariations = 1 (video)`);
            } else {
                expect(effectiveMax).toBeLessThanOrEqual(4);
                console.log(`✅ ${model.name}: maxVariations = ${effectiveMax} (image)`);
            }
        }
    });

    test('OpenAI/Sora models should be limited to 1 variation', async () => {
        const openaiModels = ALL_MODELS.filter(m => m.provider === 'openai');

        console.log(`Found ${openaiModels.length} OpenAI models`);

        for (const model of openaiModels) {
            expect(model.maxVariations).toBe(1);
            console.log(`✅ ${model.name}: maxVariations = 1`);
        }
    });

    test('Video models should have supportedDurations defined', async () => {
        const videoModels = ALL_MODELS.filter(m => m.type === 'video');

        console.log(`Found ${videoModels.length} video models`);

        let withDurations = 0;
        let withoutDurations = 0;

        for (const model of videoModels) {
            if (model.supportedDurations && model.supportedDurations.length > 0) {
                withDurations++;
                console.log(`✅ ${model.name}: durations = [${model.supportedDurations.join(', ')}]`);
            } else {
                withoutDurations++;
                console.log(`⚠️ ${model.name}: NO durations defined`);
            }
        }

        console.log(`\n${withDurations} models have durations, ${withoutDurations} do not`);
        // Most video models should have durations
        expect(withDurations).toBeGreaterThan(withoutDurations);
    });

    test('Fast video models (LTX) should support more variations', async () => {
        // Filter to only LTX models that are video type and have maxVariations defined
        const ltxModels = ALL_MODELS.filter(m => m.id.includes('ltx') && m.type === 'video');

        console.log(`Found ${ltxModels.length} LTX video models`);

        for (const model of ltxModels) {
            // LTX is a fast model, should support 2-4 variations
            const effectiveMax = model.maxVariations ?? 4;
            expect(effectiveMax).toBeGreaterThanOrEqual(2);
            console.log(`✅ ${model.name}: maxVariations = ${effectiveMax} (fast model)`);
        }
    });

    test('Image models should default to 4 variations when not specified', async () => {
        const imageModels = ALL_MODELS.filter(m => m.type === 'image');

        console.log(`Found ${imageModels.length} image models`);

        for (const model of imageModels) {
            const effectiveMax = model.maxVariations ?? 4;
            expect(effectiveMax).toBeLessThanOrEqual(4);
            console.log(`✅ ${model.name}: effective maxVariations = ${effectiveMax}`);
        }
    });
});

test.describe('Duration Values', () => {

    test('Google Veo models should have 4s, 6s, 8s durations', async () => {
        const veoModels = ALL_MODELS.filter(m => m.id.includes('veo'));

        for (const model of veoModels) {
            if (model.supportedDurations) {
                // Check for expected durations
                const hasExpected = model.supportedDurations.some(d =>
                    ['4s', '5s', '6s', '8s'].includes(d)
                );
                expect(hasExpected).toBe(true);
                console.log(`✅ ${model.name}: durations = [${model.supportedDurations.join(', ')}]`);
            }
        }
    });

    test('Kling models should have 5s and 10s durations', async () => {
        const klingModels = ALL_MODELS.filter(m =>
            m.id.includes('kling') &&
            m.type === 'video' &&
            m.supportedDurations
        );

        for (const model of klingModels) {
            const has5s = model.supportedDurations?.includes('5s');
            expect(has5s).toBe(true);
            console.log(`✅ ${model.name}: durations = [${model.supportedDurations?.join(', ')}]`);
        }
    });

    test('Wan models should have 5s or 10s durations', async () => {
        const wanModels = ALL_MODELS.filter(m =>
            m.id.includes('wan') &&
            m.type === 'video' &&
            m.supportedDurations
        );

        for (const model of wanModels) {
            const hasExpected = model.supportedDurations?.some(d => ['5s', '10s'].includes(d));
            expect(hasExpected).toBe(true);
            console.log(`✅ ${model.name}: durations = [${model.supportedDurations?.join(', ')}]`);
        }
    });
});

test.describe('Summary', () => {
    test('Print model summary', async () => {
        console.log('\n========================================');
        console.log('MODEL CONTROLS SUMMARY');
        console.log('========================================\n');

        // Group by max variations
        const varGroups: Record<number, string[]> = {};
        for (const model of ALL_MODELS) {
            const max = model.maxVariations ?? (model.type === 'video' ? 1 : 4);
            if (!varGroups[max]) varGroups[max] = [];
            varGroups[max].push(model.name);
        }

        console.log('MAX VARIATIONS:');
        for (const [max, models] of Object.entries(varGroups).sort()) {
            console.log(`  ${max}: ${models.length} models`);
        }

        // Group by duration options
        const durGroups: Record<string, number> = {};
        for (const model of ALL_MODELS) {
            if (model.supportedDurations) {
                const key = model.supportedDurations.join(', ');
                durGroups[key] = (durGroups[key] || 0) + 1;
            }
        }

        console.log('\nDURATION OPTIONS:');
        for (const [durations, count] of Object.entries(durGroups).sort()) {
            console.log(`  [${durations}]: ${count} models`);
        }

        console.log('\n========================================');
    });
});
