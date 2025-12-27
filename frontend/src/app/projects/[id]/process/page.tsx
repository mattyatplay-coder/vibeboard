'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { TattooPlacementPanel } from '@/components/processing/TattooPlacementPanel';
import { MagicEraserPanel } from '@/components/processing/MagicEraserPanel';
import { RotoscopePanel } from '@/components/processing/RotoscopePanel';
import { SetExtensionPanel } from '@/components/processing/SetExtensionPanel';
import { Layers, Eraser, Loader2, Film, Expand } from 'lucide-react';

function ProcessPageContent() {
  const searchParams = useSearchParams();
  const imageUrl = searchParams.get('url');
  const videoUrl = searchParams.get('video');
  const tool = searchParams.get('tool'); // 'eraser', 'tattoo', 'rotoscope', or 'extend'

  // Compute initial tab based on URL param
  const getInitialTab = (): 'tattoo' | 'eraser' | 'rotoscope' | 'extend' => {
    if (tool === 'eraser') return 'eraser';
    if (tool === 'extend') return 'extend';
    if (tool === 'rotoscope' || videoUrl) return 'rotoscope';
    return 'tattoo';
  };
  const [activeTab, setActiveTab] = useState<'tattoo' | 'eraser' | 'rotoscope' | 'extend'>(getInitialTab());

  return (
    <div className="flex h-screen flex-1 flex-col overflow-hidden bg-[#0a0a0a] p-8 text-white">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Roto & Paint</h1>

        {/* Tabs */}
        <div className="flex rounded-lg border border-white/10 bg-white/5 p-1">
          <button
            onClick={() => setActiveTab('tattoo')}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'tattoo'
                ? 'bg-purple-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Layers className="h-4 w-4" /> Tattoo Studio
          </button>
          <button
            onClick={() => setActiveTab('eraser')}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'eraser'
                ? 'bg-pink-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Eraser className="h-4 w-4" /> Magic Eraser
          </button>
          <button
            onClick={() => setActiveTab('rotoscope')}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'rotoscope'
                ? 'bg-cyan-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Film className="h-4 w-4" /> Rotoscope
          </button>
          <button
            onClick={() => setActiveTab('extend')}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'extend'
                ? 'bg-teal-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Expand className="h-4 w-4" /> Set Extension
          </button>
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden">
        {activeTab === 'tattoo' && <TattooPlacementPanel initialImageUrl={imageUrl || undefined} />}
        {activeTab === 'eraser' && <MagicEraserPanel initialImageUrl={imageUrl || undefined} />}
        {activeTab === 'rotoscope' && <RotoscopePanel initialVideoUrl={videoUrl || undefined} />}
        {activeTab === 'extend' && <SetExtensionPanel initialImageUrl={imageUrl || undefined} />}
      </div>
    </div>
  );
}

export default function ProcessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen flex-1 items-center justify-center bg-[#0a0a0a]">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      }
    >
      <ProcessPageContent />
    </Suspense>
  );
}
