'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { TattooPlacementPanel } from '@/components/processing/TattooPlacementPanel';
import { MagicEraserPanel } from '@/components/processing/MagicEraserPanel';
import { RotoscopePanel } from '@/components/processing/RotoscopePanel';
import { Layers, Eraser, Loader2, Film } from 'lucide-react';

function ProcessPageContent() {
    const searchParams = useSearchParams();
    const imageUrl = searchParams.get('url');
    const videoUrl = searchParams.get('video');
    const tool = searchParams.get('tool'); // 'eraser', 'tattoo', or 'rotoscope'

    // Compute initial tab based on URL param
    const getInitialTab = (): 'tattoo' | 'eraser' | 'rotoscope' => {
        if (tool === 'eraser') return 'eraser';
        if (tool === 'rotoscope' || videoUrl) return 'rotoscope';
        return 'tattoo';
    };
    const [activeTab, setActiveTab] = useState<'tattoo' | 'eraser' | 'rotoscope'>(getInitialTab());

    return (
        <div className="flex-1 flex flex-col h-screen bg-[#0a0a0a] text-white overflow-hidden p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Roto & Paint</h1>

                {/* Tabs */}
                <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
                    <button
                        onClick={() => setActiveTab('tattoo')}
                        className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${activeTab === 'tattoo' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        <Layers className="w-4 h-4" /> Tattoo Studio
                    </button>
                    <button
                        onClick={() => setActiveTab('eraser')}
                        className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${activeTab === 'eraser' ? 'bg-pink-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        <Eraser className="w-4 h-4" /> Magic Eraser
                    </button>
                    <button
                        onClick={() => setActiveTab('rotoscope')}
                        className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${activeTab === 'rotoscope' ? 'bg-cyan-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        <Film className="w-4 h-4" /> Rotoscope
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden relative">
                {activeTab === 'tattoo' && (
                    <TattooPlacementPanel initialImageUrl={imageUrl || undefined} />
                )}
                {activeTab === 'eraser' && (
                    <MagicEraserPanel initialImageUrl={imageUrl || undefined} />
                )}
                {activeTab === 'rotoscope' && (
                    <RotoscopePanel initialVideoUrl={videoUrl || undefined} />
                )}
            </div>
        </div>
    );
}

export default function ProcessPage() {
    return (
        <Suspense fallback={
            <div className="flex-1 flex items-center justify-center h-screen bg-[#0a0a0a]">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
        }>
            <ProcessPageContent />
        </Suspense>
    );
}
