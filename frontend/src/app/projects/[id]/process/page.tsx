'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import { TattooPlacementPanel } from '@/components/processing/TattooPlacementPanel';
import { MagicEraserPanel } from '@/components/processing/MagicEraserPanel';
import { RotoscopePanel } from '@/components/processing/RotoscopePanel';
import { SetExtensionPanel } from '@/components/processing/SetExtensionPanel';
import { CastAssemblerPanel } from '@/components/processing/CastAssemblerPanel';
import { TextFixerPanel } from '@/components/processing/TextFixerPanel';
import { AIReshootPanel } from '@/components/processing/AIReshootPanel';
import { Layers, Eraser, Loader2, Film, Expand, Users, Type, Clapperboard } from 'lucide-react';
import { usePageAutoSave, ProcessSession, hasRecoverableContent } from '@/lib/pageSessionStore';
import { RecoveryToast } from '@/components/ui/RecoveryToast';

function ProcessPageContent() {
  const params = useParams();
  const projectId = params.id as string;
  const searchParams = useSearchParams();
  const imageUrl = searchParams.get('url');
  const videoUrl = searchParams.get('video');
  const tool = searchParams.get('tool'); // 'eraser', 'tattoo', 'rotoscope', 'extend', 'cast', 'text', or 'reshoot'

  // Compute initial tab based on URL param
  const getInitialTab = ():
    | 'tattoo'
    | 'eraser'
    | 'rotoscope'
    | 'extend'
    | 'cast'
    | 'text'
    | 'reshoot' => {
    if (tool === 'eraser') return 'eraser';
    if (tool === 'extend') return 'extend';
    if (tool === 'cast') return 'cast';
    if (tool === 'text') return 'text';
    if (tool === 'reshoot') return 'reshoot';
    if (tool === 'rotoscope' || videoUrl) return 'rotoscope';
    return 'tattoo';
  };
  const [activeTab, setActiveTab] = useState<
    'tattoo' | 'eraser' | 'rotoscope' | 'extend' | 'cast' | 'text' | 'reshoot'
  >(getInitialTab());

  // Session recovery
  const [hasMounted, setHasMounted] = useState(false);
  const [showRecoveryToast, setShowRecoveryToast] = useState(false);
  const [recoverableSession, setRecoverableSession] = useState<ProcessSession | null>(null);
  const { saveSession, getSession, clearSession, dismissRecovery, isRecoveryDismissed } =
    usePageAutoSave<ProcessSession>('process');

  // Mount detection
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Check for recoverable session
  useEffect(() => {
    if (!hasMounted || !projectId) return;
    const session = getSession(projectId);
    if (session && hasRecoverableContent(session) && !isRecoveryDismissed(projectId)) {
      setRecoverableSession(session);
      setShowRecoveryToast(true);
    }
  }, [hasMounted, projectId, getSession, isRecoveryDismissed]);

  // Auto-save (save current image URL and tool)
  useEffect(() => {
    if (!projectId || !hasMounted) return;
    const currentImageUrl = imageUrl || videoUrl;
    if (!currentImageUrl) return;

    const saveInterval = setInterval(() => {
      type ActiveToolType =
        | 'magic-eraser'
        | 'roto'
        | 'tattoo'
        | 'set-extension'
        | 'cast-assembler'
        | 'text-fixer'
        | 'ai-reshoot';
      const toolMap: Record<string, ActiveToolType> = {
        tattoo: 'tattoo',
        eraser: 'magic-eraser',
        rotoscope: 'roto',
        extend: 'set-extension',
        cast: 'cast-assembler',
        text: 'text-fixer',
        reshoot: 'ai-reshoot',
      };
      saveSession({
        projectId,
        currentImageUrl,
        activeTool: toolMap[activeTab] || 'tattoo',
        toolSettings: {},
        historyIndex: 0,
        isDirty: true,
      });
    }, 500);
    return () => clearInterval(saveInterval);
  }, [projectId, hasMounted, imageUrl, videoUrl, activeTab, saveSession]);

  const handleRestoreSession = () => {
    if (!recoverableSession) return;
    if (recoverableSession.activeTool) {
      const toolMap: Record<
        string,
        'tattoo' | 'eraser' | 'rotoscope' | 'extend' | 'cast' | 'text' | 'reshoot'
      > = {
        tattoo: 'tattoo',
        'magic-eraser': 'eraser',
        roto: 'rotoscope',
        'set-extension': 'extend',
        'cast-assembler': 'cast',
        'text-fixer': 'text',
        'ai-reshoot': 'reshoot',
      };
      setActiveTab(toolMap[recoverableSession.activeTool] || 'tattoo');
    }
    setShowRecoveryToast(false);
    setRecoverableSession(null);
  };

  const handleDismissRecovery = () => {
    if (projectId) {
      dismissRecovery(projectId);
      clearSession(projectId);
    }
    setShowRecoveryToast(false);
    setRecoverableSession(null);
  };

  return (
    <div className="flex h-screen flex-1 flex-col overflow-hidden bg-[#0a0a0a] p-8 text-white">
      {/* Session Recovery Toast */}
      {recoverableSession && (
        <RecoveryToast
          isVisible={showRecoveryToast}
          savedAt={recoverableSession.savedAt}
          pageType="process"
          onRestore={handleRestoreSession}
          onDismiss={handleDismissRecovery}
        />
      )}

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
          <button
            onClick={() => setActiveTab('cast')}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'cast'
                ? 'bg-violet-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Users className="h-4 w-4" /> Cast Assembler
          </button>
          <button
            onClick={() => setActiveTab('text')}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'text'
                ? 'bg-emerald-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Type className="h-4 w-4" /> Text Fixer
          </button>
          <button
            onClick={() => setActiveTab('reshoot')}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'reshoot'
                ? 'bg-amber-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Clapperboard className="h-4 w-4" /> AI Reshoot
          </button>
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden">
        {activeTab === 'tattoo' && <TattooPlacementPanel initialImageUrl={imageUrl || undefined} />}
        {activeTab === 'eraser' && <MagicEraserPanel initialImageUrl={imageUrl || undefined} />}
        {activeTab === 'rotoscope' && <RotoscopePanel initialVideoUrl={videoUrl || undefined} />}
        {activeTab === 'extend' && <SetExtensionPanel initialImageUrl={imageUrl || undefined} />}
        {activeTab === 'cast' && <CastAssemblerPanel projectId={projectId} />}
        {activeTab === 'text' && <TextFixerPanel initialImageUrl={imageUrl || undefined} />}
        {activeTab === 'reshoot' && <AIReshootPanel initialImageUrl={imageUrl || undefined} />}
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
