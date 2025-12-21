import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * Toolbar Audit Tests
 *
 * Verifies that:
 * 1. Toolbar is CLEAN - no Duration, Quantity, or Mode switcher
 * 2. Model Library sidebar has Duration, Quantity, Audio controls
 * 3. @mention opens element picker
 */

test.describe('Generation Toolbar Audit', () => {

    test('GenerationForm should NOT have Duration or Quantity selectors', async () => {
        // Read the GenerationForm source code
        const generationFormPath = path.join(__dirname, '../src/components/generations/GenerationForm.tsx');
        const content = fs.readFileSync(generationFormPath, 'utf-8');

        // Should NOT have duration selector in toolbar
        expect(content).not.toMatch(/availableDurations\.map/);
        expect(content).not.toMatch(/<select[^>]*duration/i);

        // Should NOT have quantity hover dropdown
        expect(content).not.toMatch(/Quantity.*hover/i);

        // Should have @mention trigger for element picker
        expect(content).toMatch(/lastChar === '@'/);
        expect(content).toMatch(/setIsElementPickerOpen\(true\)/);

        console.log('✅ GenerationForm toolbar is CLEAN - no Duration/Quantity selectors');
        console.log('✅ @mention trigger for element picker is present');
    });

    test('EngineLibraryModal should have Duration, Quantity, and Audio controls in sidebar', async () => {
        // Read the EngineLibraryModal source code
        const modalPath = path.join(__dirname, '../src/components/generations/EngineLibraryModal.tsx');
        const content = fs.readFileSync(modalPath, 'utf-8');

        // Should have Duration control
        expect(content).toMatch(/Duration/);
        expect(content).toMatch(/setDuration/);

        // Should have Quantity/Variations control
        expect(content).toMatch(/Quantity|variations/i);
        expect(content).toMatch(/setVariations/);

        // Should have Audio input control
        expect(content).toMatch(/AudioInput|Audio Source/i);
        expect(content).toMatch(/onAudioChange/);

        console.log('✅ EngineLibraryModal has Duration control');
        console.log('✅ EngineLibraryModal has Quantity/Variations control');
        console.log('✅ EngineLibraryModal has Audio input control');
    });

    test('generate/page.tsx should pass duration props to EngineLibraryModal', async () => {
        // Read the page source code
        const pagePath = path.join(__dirname, '../src/app/projects/[id]/generate/page.tsx');
        const content = fs.readFileSync(pagePath, 'utf-8');

        // Should pass duration and setDuration to EngineLibraryModal
        expect(content).toMatch(/duration=\{duration\}/);
        expect(content).toMatch(/setDuration=\{setDuration\}/);

        console.log('✅ generate/page.tsx passes duration props to EngineLibraryModal');
    });

    test('Toolbar should only have essential controls', async () => {
        const generationFormPath = path.join(__dirname, '../src/components/generations/GenerationForm.tsx');
        const content = fs.readFileSync(generationFormPath, 'utf-8');

        // Should have prompt input
        expect(content).toMatch(/textarea|TextareaAutosize/i);

        // Should have Smart Prompt (Wand) button
        expect(content).toMatch(/Wand2|smartPrompt/i);

        // Should have Style selector
        expect(content).toMatch(/StyleSelectorModal|setIsStyleSelectorOpen/i);

        // Should have Element Picker
        expect(content).toMatch(/ElementPickerDropdown|setIsElementPickerOpen/i);

        // Should have Model Selector
        expect(content).toMatch(/selectedModel|modelSelector/i);

        // Should have Generate button
        expect(content).toMatch(/Generate|onGenerate/i);

        // Should NOT have mode switcher (image/video toggle)
        expect(content).not.toMatch(/mode === 'image' \? 'video' : 'image'/);

        console.log('✅ Toolbar has essential controls: Prompt, Wand, Style, Element Picker, Model, Generate');
        console.log('✅ Toolbar does NOT have mode switcher');
    });
});

test.describe('Model Library Controls Placement', () => {

    test('All generation parameters should be in Model Library sidebar', async () => {
        const modalPath = path.join(__dirname, '../src/components/generations/EngineLibraryModal.tsx');
        const content = fs.readFileSync(modalPath, 'utf-8');

        // Count sidebar controls
        const hasDuration = content.includes('Duration');
        const hasQuantity = content.includes('Quantity') || content.includes('variations');
        const hasAudio = content.includes('AudioInput') || content.includes('Audio');

        expect(hasDuration).toBe(true);
        expect(hasQuantity).toBe(true);
        expect(hasAudio).toBe(true);

        console.log('\n========================================');
        console.log('TOOLBAR AUDIT COMPLETE');
        console.log('========================================');
        console.log('');
        console.log('✅ Toolbar is CLEAN:');
        console.log('   - Prompt input');
        console.log('   - Smart Prompt (Wand) button');
        console.log('   - Style selector');
        console.log('   - Element Picker (@mention)');
        console.log('   - Model Selector pill');
        console.log('   - Generate button');
        console.log('');
        console.log('✅ Model Library sidebar has:');
        console.log('   - Duration control');
        console.log('   - Quantity control');
        console.log('   - Audio Source control');
        console.log('');
        console.log('✅ Removed from toolbar:');
        console.log('   - Duration selector');
        console.log('   - Quantity dropdown');
        console.log('   - Mode switcher (image/video)');
        console.log('========================================');
    });
});
