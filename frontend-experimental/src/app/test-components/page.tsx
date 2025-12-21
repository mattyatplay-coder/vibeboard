'use client';

import { useState } from 'react';
import { TagSelector } from '@/components/tag-system/TagSelector';
import { EnhancedMotionSlider } from '@/components/motion-slider/EnhancedMotionSlider';
import type { Tag } from '@/components/tag-system/TagSelector';

export default function TestComponentsPage() {
    const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
    const [motionScale, setMotionScale] = useState(0.5);
    const [engineType, setEngineType] = useState<'kling' | 'veo' | 'sora' | 'wan' | 'luma'>('kling');

    // Build a sample prompt from selected tags
    const buildPrompt = () => {
        const basePrompt = "A beautiful scene";
        const tagKeywords = selectedTags.map(t => t.promptKeyword).join(', ');
        const motionDesc = getMotionDescription(motionScale);

        return `${basePrompt}${tagKeywords ? `, ${tagKeywords}` : ''}. ${motionDesc}`;
    };

    const getMotionDescription = (value: number): string => {
        if (value === 0) return 'Camera locked, minimal motion';
        if (value <= 0.2) return 'Very subtle camera movement';
        if (value <= 0.4) return 'Gentle camera motion';
        if (value <= 0.6) return 'Moderate camera movement';
        if (value <= 0.8) return 'Active, energetic motion';
        return 'Fast, dramatic camera movements';
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div className="text-center space-y-2">
                    <h1 className="text-4xl font-bold text-gray-900">
                        Component Test Page
                    </h1>
                    <p className="text-gray-600">
                        Testing TagSelector and EnhancedMotionSlider components
                    </p>
                </div>

                {/* Tag Selector Section */}
                <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
                    <div className="flex items-center justify-between border-b pb-3">
                        <h2 className="text-2xl font-semibold text-gray-800">
                            Tag System
                        </h2>
                        <span className="text-sm text-gray-500">
                            Select visual tags for your prompt
                        </span>
                    </div>

                    <TagSelector
                        selectedTags={selectedTags}
                        onTagsChange={setSelectedTags}
                        maxTags={10}
                    />
                </div>

                {/* Motion Slider Section */}
                <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
                    <div className="flex items-center justify-between border-b pb-3">
                        <h2 className="text-2xl font-semibold text-gray-800">
                            Motion Control
                        </h2>
                        <div className="flex gap-2">
                            {(['kling', 'veo', 'sora', 'wan', 'luma'] as const).map((engine) => (
                                <button
                                    key={engine}
                                    onClick={() => setEngineType(engine)}
                                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${engineType === engine
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    {engine.charAt(0).toUpperCase() + engine.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <EnhancedMotionSlider
                        value={motionScale}
                        onChange={setMotionScale}
                        engineType={engineType}
                        showRecommendations={true}
                    />
                </div>

                {/* Generated Prompt Preview */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl shadow-lg p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-blue-200 pb-3">
                        <h2 className="text-2xl font-semibold text-gray-800">
                            Generated Prompt Preview
                        </h2>
                        <button
                            onClick={() => navigator.clipboard.writeText(buildPrompt())}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                            Copy to Clipboard
                        </button>
                    </div>

                    <div className="space-y-3">
                        <div className="bg-white rounded-lg p-4 border-2 border-blue-200">
                            <p className="text-gray-800 font-mono text-sm leading-relaxed">
                                {buildPrompt()}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="bg-white rounded-lg p-3 border border-gray-200">
                                <div className="text-gray-600 font-medium mb-1">Selected Tags</div>
                                <div className="text-gray-900">
                                    {selectedTags.length > 0
                                        ? selectedTags.map(t => t.name).join(', ')
                                        : 'None selected'}
                                </div>
                            </div>

                            <div className="bg-white rounded-lg p-3 border border-gray-200">
                                <div className="text-gray-600 font-medium mb-1">Motion Scale</div>
                                <div className="text-gray-900">
                                    {motionScale.toFixed(2)} ({getMotionDescription(motionScale)})
                                </div>
                            </div>

                            <div className="bg-white rounded-lg p-3 border border-gray-200">
                                <div className="text-gray-600 font-medium mb-1">Engine</div>
                                <div className="text-gray-900 capitalize">{engineType}</div>
                            </div>

                            <div className="bg-white rounded-lg p-3 border border-gray-200">
                                <div className="text-gray-600 font-medium mb-1">Tag Count</div>
                                <div className="text-gray-900">{selectedTags.length} / 10</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Instructions */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">
                        How to Use
                    </h3>
                    <ul className="space-y-2 text-gray-700 text-sm">
                        <li className="flex items-start gap-2">
                            <span className="text-blue-600 font-bold">1.</span>
                            <span>Select visual tags from the Tag System above (Style, Lighting, Camera, Mood, Quality)</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-blue-600 font-bold">2.</span>
                            <span>Adjust the Motion Scale slider or click preset buttons</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-blue-600 font-bold">3.</span>
                            <span>Switch between different engines to see optimal motion ranges</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-blue-600 font-bold">4.</span>
                            <span>View the generated prompt in the preview section</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-blue-600 font-bold">5.</span>
                            <span>Copy the prompt to use in your video generation workflow</span>
                        </li>
                    </ul>
                </div>

                {/* Back to Home */}
                <div className="text-center">
                    <a
                        href="/"
                        className="inline-block px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors font-medium"
                    >
                        ← Back to Home
                    </a>
                </div>
            </div>
        </div>
    );
}
