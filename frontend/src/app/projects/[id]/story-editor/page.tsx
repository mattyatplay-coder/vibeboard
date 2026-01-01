/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import {
  FileText,
  Lightbulb,
  BookOpen,
  Film,
  Camera,
  Wand2,
  Play,
  ChevronRight,
  ChevronDown,
  Loader2,
  Check,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Clock,
  Upload,
  PenTool,
  Users,
  X,
  Plus,
  Save,
  FolderOpen,
  Trash2,
  Image,
  Package,
} from 'lucide-react';
import { fetchAPI, BACKEND_URL } from '@/lib/api';
import { usePageAutoSave, StoryEditorSession, hasRecoverableContent } from '@/lib/pageSessionStore';
import { RecoveryToast } from '@/components/ui/RecoveryToast';
import { GenreSelector, GenrePills } from '@/components/storyboard/GenreSelector';
import { Tooltip } from '@/components/ui/Tooltip';
import { Genre, GENRE_TEMPLATES, getGenreTemplate } from '@/data/GenreTemplates';
import ThumbnailGeneratorPanel from '@/components/content/ThumbnailGeneratorPanel';
import { useStoryGenerationStore, PipelineStage, StageStatus, StoryCharacter as GlobalStoryCharacter, ContinueFromData } from '@/lib/storyGenerationStore';

// Story character for prompt injection
interface StoryCharacter {
  name: string;
  elementId?: string;
  loraId?: string;
  triggerWord?: string;
  visualDescription: string;
  referenceImageUrl?: string;
  role?: 'protagonist' | 'antagonist' | 'supporting' | 'minor';
}

// Element from project library
interface ProjectElement {
  id: string;
  name: string;
  type: string;
  url?: string;
  fileUrl?: string;
  thumbnail?: string;
  metadata?: {
    triggerWord?: string;
    loraId?: string;
    visualDescription?: string;
    [key: string]: any;
  };
}

// Pipeline stages (use imported types from store)
type LocalPipelineStage = PipelineStage;

interface LocalStageStatus {
  status: 'pending' | 'in_progress' | 'complete' | 'error';
  data?: any;
  error?: string;
}

export default function StoryEditorPage() {
  const params = useParams();
  const projectId = params.id as string;

  // Input mode: 'concept' for generating from scratch, 'script' for uploading existing screenplay
  const [inputMode, setInputMode] = useState<'concept' | 'script'>('concept');

  // Form state
  const [concept, setConcept] = useState('');
  const [uploadedScript, setUploadedScript] = useState(''); // For uploaded/pasted screenplay
  const [selectedGenre, setSelectedGenre] = useState<Genre | null>(null);
  const [style, setStyle] = useState('');
  const [pace, setPace] = useState<'slow' | 'medium' | 'fast'>('medium');
  const [targetDuration, setTargetDuration] = useState<string>(''); // User input (e.g., "5s", "2m", "90min")
  const [targetDurationSeconds, setTargetDurationSeconds] = useState<number | null>(null); // Parsed value
  const [shotDuration, setShotDuration] = useState<number>(5); // Default duration per video shot in seconds
  const [allowNSFW, setAllowNSFW] = useState(false); // Allow NSFW content in prompts

  // Pipeline state
  const [currentStage, setCurrentStage] = useState<PipelineStage>('concept');
  const [stages, setStages] = useState<Record<PipelineStage, StageStatus>>({
    concept: { status: 'pending' },
    outline: { status: 'pending' },
    script: { status: 'pending' },
    breakdown: { status: 'pending' },
    prompts: { status: 'pending' },
    complete: { status: 'pending' },
  });

  // Results
  const [outline, setOutline] = useState<any>(null);
  const [script, setScript] = useState<string>('');
  const [scenes, setScenes] = useState<any[]>([]);
  const [prompts, setPrompts] = useState<any[]>([]);

  // UI state
  const [expandedSections, setExpandedSections] = useState<string[]>(['concept']);
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Story save/load state
  const [currentStoryId, setCurrentStoryId] = useState<string | null>(null);
  const [storyName, setStoryName] = useState('');
  const [savedStories, setSavedStories] = useState<any[]>([]);
  const [showStoriesModal, setShowStoriesModal] = useState(false);
  const [loadingStories, setLoadingStories] = useState(false);

  // Character management state
  const [projectElements, setProjectElements] = useState<ProjectElement[]>([]);
  const [selectedCharacters, setSelectedCharacters] = useState<StoryCharacter[]>([]);
  const [showCharacterPicker, setShowCharacterPicker] = useState(false);
  const [loadingElements, setLoadingElements] = useState(false);

  // Thumbnail generator state
  const [showThumbnailGenerator, setShowThumbnailGenerator] = useState(false);

  // Script Lab: Auto-breakdown state
  const [isBreakingDown, setIsBreakingDown] = useState(false);
  const [breakdownResult, setBreakdownResult] = useState<{
    assetsCreated: number;
    breakdown: { characters: number; locations: number; props: number };
  } | null>(null);

  // Progress tracking for long-running stages
  const [progressInfo, setProgressInfo] = useState<{
    stage: 'breakdown' | 'prompts' | null;
    current: number;
    total: number;
    sceneName?: string;
  } | null>(null);

  // Session recovery
  const [hasMounted, setHasMounted] = useState(false);
  const [showRecoveryToast, setShowRecoveryToast] = useState(false);
  const [recoverableSession, setRecoverableSession] = useState<StoryEditorSession | null>(null);
  const {
    saveSession,
    getSession,
    clearSession,
    dismissRecovery,
    isRecoveryDismissed,
  } = usePageAutoSave<StoryEditorSession>('story-editor');

  // Load project elements on mount
  useEffect(() => {
    const loadElements = async () => {
      if (!projectId) {
        console.log('[StoryEditor] No projectId, skipping element load');
        return;
      }
      console.log('[StoryEditor] Loading elements for project:', projectId);
      setLoadingElements(true);
      try {
        const elements = await fetchAPI(`/projects/${projectId}/elements`);
        console.log('[StoryEditor] Raw elements response:', elements?.length, 'elements');
        // Filter to only character-type elements or those with triggerWord
        const characterElements = (elements || []).filter(
          (e: ProjectElement) =>
            e.type === 'character' || e.type === 'image' || e.metadata?.triggerWord
        );
        console.log('[StoryEditor] Filtered character elements:', characterElements.length);
        setProjectElements(characterElements);
      } catch (error) {
        console.error('[StoryEditor] Failed to load project elements:', error);
      } finally {
        setLoadingElements(false);
      }
    };
    loadElements();
  }, [projectId]);

  // Mount detection for hydration
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Global store for persistent generation across navigation
  const globalStore = useStoryGenerationStore();

  // Sync with global store when component mounts (to resume ongoing generation)
  useEffect(() => {
    if (!projectId || !hasMounted) return;

    // Check if there's an active generation for this project
    if (globalStore.activeProjectId === projectId && globalStore.isRunning) {
      // Resume display of ongoing generation
      console.log('[StoryEditor] Resuming ongoing generation from global store');
      setIsRunning(true);
      setCurrentStage(globalStore.currentStage);
      setStages(globalStore.stages as Record<LocalPipelineStage, LocalStageStatus>);
      if (globalStore.outline) setOutline(globalStore.outline);
      if (globalStore.script) setScript(globalStore.script as string);
      if (globalStore.scenes.length > 0) setScenes(globalStore.scenes);
      if (globalStore.prompts.length > 0) setPrompts(globalStore.prompts);
      if (globalStore.progressInfo) setProgressInfo(globalStore.progressInfo as typeof progressInfo);
    } else if (globalStore.activeProjectId === projectId && !globalStore.isRunning) {
      // Generation completed while navigated away - sync final results
      console.log('[StoryEditor] Syncing completed generation from global store');
      setCurrentStage(globalStore.currentStage);
      setStages(globalStore.stages as Record<LocalPipelineStage, LocalStageStatus>);
      if (globalStore.outline) setOutline(globalStore.outline);
      if (globalStore.script) setScript(globalStore.script as string);
      if (globalStore.scenes.length > 0) setScenes(globalStore.scenes);
      if (globalStore.prompts.length > 0) setPrompts(globalStore.prompts);
    }
  }, [projectId, hasMounted, globalStore.activeProjectId]);

  // Subscribe to global store updates while generation is running
  useEffect(() => {
    if (!projectId || globalStore.activeProjectId !== projectId) return;

    // Create a subscription to the store
    const unsubscribe = useStoryGenerationStore.subscribe((state) => {
      if (state.activeProjectId !== projectId) return;

      // Update local state from global store
      setIsRunning(state.isRunning);
      setCurrentStage(state.currentStage);
      setStages(state.stages as Record<LocalPipelineStage, LocalStageStatus>);
      if (state.outline) setOutline(state.outline);
      if (state.script) setScript(state.script as string);
      if (state.scenes.length > 0) setScenes(state.scenes);
      if (state.prompts.length > 0) setPrompts(state.prompts);
      setProgressInfo(state.progressInfo as typeof progressInfo);
    });

    return () => unsubscribe();
  }, [projectId, globalStore.activeProjectId]);

  // Warn user before leaving page during active generation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isRunning) {
        e.preventDefault();
        e.returnValue = 'Story generation is in progress. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isRunning]);

  // Check for recoverable session on mount
  useEffect(() => {
    if (!hasMounted || !projectId) return;

    const session = getSession(projectId);
    if (session && hasRecoverableContent(session) && !isRecoveryDismissed(projectId)) {
      setRecoverableSession(session);
      setShowRecoveryToast(true);
    }
  }, [hasMounted, projectId, getSession, isRecoveryDismissed]);

  // Auto-save session every 500ms
  useEffect(() => {
    if (!projectId || !hasMounted) return;

    const saveInterval = setInterval(() => {
      // Only save if there's meaningful content
      const hasContent = concept.trim().length > 0 || script.trim().length > 0 || storyName.trim().length > 0;
      if (!hasContent) return;

      saveSession({
        projectId,
        title: storyName,
        logline: concept,
        scriptContent: script,
        genre: selectedGenre || '',
        directorStyle: style,
        selectedCharacterIds: selectedCharacters.map(c => c.elementId || '').filter(Boolean),
        currentSceneIndex: 0,
        isDirty: true,
      });
    }, 500);

    return () => clearInterval(saveInterval);
  }, [
    projectId,
    hasMounted,
    storyName,
    concept,
    script,
    selectedGenre,
    style,
    selectedCharacters,
    saveSession,
  ]);

  // Handle session restore
  const handleRestoreSession = () => {
    if (!recoverableSession) return;

    setStoryName(recoverableSession.title || '');
    setConcept(recoverableSession.logline || '');
    setScript(recoverableSession.scriptContent || '');
    if (recoverableSession.genre) {
      setSelectedGenre(recoverableSession.genre as Genre);
    }
    setStyle(recoverableSession.directorStyle || '');

    setShowRecoveryToast(false);
    setRecoverableSession(null);
  };

  // Handle dismiss recovery
  const handleDismissRecovery = () => {
    if (projectId) {
      dismissRecovery(projectId);
      clearSession(projectId);
    }
    setShowRecoveryToast(false);
    setRecoverableSession(null);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    );
  };

  const updateStageStatus = (stage: PipelineStage, update: Partial<StageStatus>) => {
    setStages(prev => ({
      ...prev,
      [stage]: { ...prev[stage], ...update },
    }));
  };

  // Character management functions
  const addCharacterFromElement = (element: ProjectElement) => {
    // Check if already added
    if (selectedCharacters.find(c => c.elementId === element.id)) return;

    const newCharacter: StoryCharacter = {
      name: element.name,
      elementId: element.id,
      loraId: element.metadata?.loraId,
      triggerWord: element.metadata?.triggerWord,
      visualDescription: element.metadata?.visualDescription || `${element.name} character`,
      referenceImageUrl: element.url || element.fileUrl || element.thumbnail,
      role: 'supporting',
    };

    setSelectedCharacters(prev => [...prev, newCharacter]);
  };

  const removeCharacter = (elementId: string) => {
    setSelectedCharacters(prev => prev.filter(c => c.elementId !== elementId));
  };

  const updateCharacter = (elementId: string, updates: Partial<StoryCharacter>) => {
    setSelectedCharacters(prev =>
      prev.map(c => (c.elementId === elementId ? { ...c, ...updates } : c))
    );
  };

  // Story save/load functions
  const loadSavedStories = async () => {
    if (!projectId) return;
    setLoadingStories(true);
    try {
      const stories = await fetchAPI(`/projects/${projectId}/stories`);
      setSavedStories(stories || []);
    } catch (error) {
      console.error('Failed to load stories:', error);
    } finally {
      setLoadingStories(false);
    }
  };

  const saveStory = async () => {
    if (!projectId || !concept || !selectedGenre) {
      alert('Please enter a concept and select a genre before saving');
      return;
    }

    setIsSaving(true);
    try {
      const storyData = {
        name: storyName || `${selectedGenre} story - ${new Date().toLocaleString()}`,
        genre: selectedGenre,
        concept,
        outline,
        script,
        scenes,
        prompts,
        allowNSFW,
        targetDuration: targetDurationSeconds,
        status:
          prompts.length > 0
            ? 'complete'
            : scenes.length > 0
              ? 'breakdown'
              : script
                ? 'script'
                : outline
                  ? 'outline'
                  : 'draft',
      };

      let savedStory;
      if (currentStoryId) {
        // Update existing story
        savedStory = await fetchAPI(`/projects/${projectId}/stories/${currentStoryId}`, {
          method: 'PATCH',
          body: JSON.stringify(storyData),
        });
      } else {
        // Create new story
        savedStory = await fetchAPI(`/projects/${projectId}/stories`, {
          method: 'POST',
          body: JSON.stringify(storyData),
        });
        setCurrentStoryId(savedStory.id);
      }

      setStoryName(savedStory.name);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save story:', error);
      alert('Failed to save story: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  const loadStory = async (storyId: string) => {
    if (!projectId) return;

    try {
      const story = await fetchAPI(`/projects/${projectId}/stories/${storyId}`);

      // Restore all state
      setCurrentStoryId(story.id);
      setStoryName(story.name);
      setConcept(story.concept);
      setSelectedGenre(story.genre as Genre);
      setAllowNSFW(story.allowNSFW || false);
      if (story.targetDuration) {
        setTargetDurationSeconds(story.targetDuration);
        setTargetDuration(`${Math.floor(story.targetDuration / 60)}m`);
      }
      if (story.outline) setOutline(story.outline);
      if (story.script) setScript(story.script);
      if (story.scenes) setScenes(story.scenes);
      if (story.prompts) setPrompts(story.prompts);

      // Update stage based on what's loaded
      if (story.prompts?.length > 0) {
        setCurrentStage('complete');
        updateStageStatus('outline', { status: 'complete' });
        updateStageStatus('script', { status: 'complete' });
        updateStageStatus('breakdown', { status: 'complete' });
        updateStageStatus('prompts', { status: 'complete' });
      } else if (story.scenes?.length > 0) {
        setCurrentStage('prompts');
        updateStageStatus('outline', { status: 'complete' });
        updateStageStatus('script', { status: 'complete' });
        updateStageStatus('breakdown', { status: 'complete' });
      } else if (story.script) {
        setCurrentStage('breakdown');
        updateStageStatus('outline', { status: 'complete' });
        updateStageStatus('script', { status: 'complete' });
      } else if (story.outline) {
        setCurrentStage('script');
        updateStageStatus('outline', { status: 'complete' });
      }

      setShowStoriesModal(false);
    } catch (error) {
      console.error('Failed to load story:', error);
      alert('Failed to load story: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const deleteStory = async (storyId: string) => {
    if (!projectId) return;
    if (!confirm('Are you sure you want to delete this story?')) return;

    try {
      await fetchAPI(`/projects/${projectId}/stories/${storyId}`, {
        method: 'DELETE',
      });

      // Refresh list
      await loadSavedStories();

      // If we deleted the current story, reset
      if (currentStoryId === storyId) {
        setCurrentStoryId(null);
        setStoryName('');
      }
    } catch (error) {
      console.error('Failed to delete story:', error);
      alert(
        'Failed to delete story: ' + (error instanceof Error ? error.message : 'Unknown error')
      );
    }
  };

  const newStory = () => {
    setCurrentStoryId(null);
    setStoryName('');
    setConcept('');
    setSelectedGenre(null);
    setOutline(null);
    setScript('');
    setScenes([]);
    setPrompts([]);
    setCurrentStage('concept');
    setStages({
      concept: { status: 'pending' },
      outline: { status: 'pending' },
      script: { status: 'pending' },
      breakdown: { status: 'pending' },
      prompts: { status: 'pending' },
      complete: { status: 'pending' },
    });
  };

  // Parse duration string to seconds (e.g., "5s", "2m", "90min", "1h30m", "1:30")
  const parseDuration = (input: string): number | null => {
    if (!input.trim()) return null;

    const normalized = input.toLowerCase().trim();

    // Handle time format like "1:30" (minutes:seconds) or "1:30:00" (hours:minutes:seconds)
    if (normalized.includes(':')) {
      const parts = normalized.split(':').map(p => parseInt(p, 10));
      if (parts.some(isNaN)) return null;

      if (parts.length === 2) {
        // MM:SS
        return parts[0] * 60 + parts[1];
      } else if (parts.length === 3) {
        // HH:MM:SS
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
      }
      return null;
    }

    // Handle descriptive formats like "5s", "2m", "90min", "1h", "1h30m"
    let totalSeconds = 0;

    // Extract hours
    const hoursMatch = normalized.match(/(\d+(?:\.\d+)?)\s*h(?:ours?)?/);
    if (hoursMatch) {
      totalSeconds += parseFloat(hoursMatch[1]) * 3600;
    }

    // Extract minutes
    const minsMatch = normalized.match(/(\d+(?:\.\d+)?)\s*m(?:in(?:utes?)?)?(?![s])/);
    if (minsMatch) {
      totalSeconds += parseFloat(minsMatch[1]) * 60;
    }

    // Extract seconds
    const secsMatch = normalized.match(/(\d+(?:\.\d+)?)\s*s(?:ec(?:onds?)?)?/);
    if (secsMatch) {
      totalSeconds += parseFloat(secsMatch[1]);
    }

    // If just a number, assume minutes for values >= 1, seconds for values < 1
    if (totalSeconds === 0) {
      const justNumber = parseFloat(normalized);
      if (!isNaN(justNumber)) {
        // If it's a small number like 5, assume it's minutes for convenience
        // If it's like 0.5, assume it's minutes (30 seconds)
        totalSeconds = justNumber * 60;
      }
    }

    return totalSeconds > 0 ? Math.round(totalSeconds) : null;
  };

  // Handle duration input change
  const handleDurationChange = (value: string) => {
    setTargetDuration(value);
    setTargetDurationSeconds(parseDuration(value));
  };

  // Format seconds to readable duration
  const formatTargetDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    }
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Generate a working title from the concept
  const generateWorkingTitle = (conceptText: string, genre: string): string => {
    // Clean up the concept text
    const cleaned = conceptText.trim();
    if (!cleaned) return `Untitled ${genre} Story`;

    // Try to extract a meaningful title from the first sentence or phrase
    // Look for natural break points: period, comma, dash, "about", "where", "when"
    const breakPatterns = [
      /^(.{10,50}?)[.!?]/,           // First sentence up to 50 chars
      /^(.{10,40}?),\s/,             // First clause up to 40 chars
      /^(.{10,35}?)\s[-–—]\s/,       // Before a dash
      /^(.{10,30}?)\s(?:about|where|when|who)\s/i, // Before common conjunctions
    ];

    for (const pattern of breakPatterns) {
      const match = cleaned.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    // If no natural break, truncate intelligently at word boundary
    if (cleaned.length <= 40) return cleaned;

    const truncated = cleaned.slice(0, 40);
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > 20) {
      return truncated.slice(0, lastSpace) + '...';
    }

    return truncated + '...';
  };

  // Auto-save story config before generation
  const autoSaveStoryConfig = async (): Promise<string | null> => {
    // Generate a working title if we don't have one
    const workingTitle = storyName.trim() || generateWorkingTitle(concept, selectedGenre || 'Draft');

    const storyData = {
      name: workingTitle,
      genre: selectedGenre,
      concept,
      outline: null,
      script: '',
      scenes: [],
      prompts: [],
      allowNSFW,
      targetDuration: targetDurationSeconds,
      shotDuration,
      style: style || `cinematic ${selectedGenre}`,
      pace,
      characters: selectedCharacters.map(c => ({
        name: c.name,
        elementId: c.elementId,
        loraId: c.loraId,
        triggerWord: c.triggerWord,
        visualDescription: c.visualDescription,
        referenceImageUrl: c.referenceImageUrl,
        role: c.role,
      })),
      status: 'generating',
    };

    try {
      let savedStory;
      if (currentStoryId) {
        // Update existing story
        savedStory = await fetchAPI(`/projects/${projectId}/stories/${currentStoryId}`, {
          method: 'PATCH',
          body: JSON.stringify(storyData),
        });
      } else {
        // Create new story
        savedStory = await fetchAPI(`/projects/${projectId}/stories`, {
          method: 'POST',
          body: JSON.stringify(storyData),
        });
        setCurrentStoryId(savedStory.id);
      }

      // Update the displayed story name
      setStoryName(savedStory.name);
      console.log('[StoryEditor] Auto-saved story config:', savedStory.name);
      return savedStory.id;
    } catch (error) {
      console.error('[StoryEditor] Failed to auto-save story config:', error);
      // Don't block generation on save failure
      return null;
    }
  };

  // Run the full pipeline using global store (persists across navigation)
  const runPipeline = async () => {
    if (!concept || !selectedGenre) {
      alert('Please enter a concept and select a genre');
      return;
    }

    // Auto-save story config before starting generation
    // This creates a backup with the current settings and a working title
    // Returns the storyId so we can update it as each stage completes
    const savedStoryId = await autoSaveStoryConfig();

    // Convert local characters to global format
    const globalCharacters: GlobalStoryCharacter[] = selectedCharacters.map(c => ({
      name: c.name,
      elementId: c.elementId,
      loraId: c.loraId,
      triggerWord: c.triggerWord,
      visualDescription: c.visualDescription,
      referenceImageUrl: c.referenceImageUrl,
      role: c.role,
    }));

    // Start generation in the global store (continues even if we navigate away)
    // Pass storyId so generated content is auto-saved after each stage
    globalStore.startGeneration({
      projectId,
      storyId: savedStoryId || undefined,
      concept,
      genre: selectedGenre,
      style: style || `cinematic ${selectedGenre}`,
      pace,
      targetDurationSeconds,
      shotDuration,
      allowNSFW,
      characters: globalCharacters,
    });

    // Expand the first section while generating
    setExpandedSections(['outline']);
  };

  // Legacy local pipeline (keeping for reference, but now using global store above)
  const runPipelineLocal = async () => {
    if (!concept || !selectedGenre) {
      alert('Please enter a concept and select a genre');
      return;
    }

    setIsRunning(true);

    // Mark concept as in_progress while validating
    updateStageStatus('concept', { status: 'in_progress' });
    setCurrentStage('outline');

    try {
      // Brief delay to show concept in_progress, then mark complete
      await new Promise(resolve => setTimeout(resolve, 300));
      updateStageStatus('concept', { status: 'complete' });

      // Stage 1: Generate Outline
      updateStageStatus('outline', { status: 'in_progress' });
      setExpandedSections(['outline']);

      const outlineResponse = await fetchAPI('/story-editor/outline', {
        method: 'POST',
        body: JSON.stringify({
          concept,
          genre: selectedGenre,
          numberOfActs: 3,
          targetDuration: targetDurationSeconds, // Pass target duration in seconds
          allowNSFW, // Pass NSFW flag to skip content filtering
        }),
      });

      setOutline(outlineResponse);
      updateStageStatus('outline', { status: 'complete', data: outlineResponse });

      // Stage 2: Generate Script
      setCurrentStage('script');
      updateStageStatus('script', { status: 'in_progress' });
      setExpandedSections(['script']);

      const scriptResponse = await fetchAPI('/story-editor/script', {
        method: 'POST',
        body: JSON.stringify({
          outline: outlineResponse,
          genre: selectedGenre,
          style: style || `cinematic ${selectedGenre}`,
          allowNSFW,
        }),
      });

      setScript(scriptResponse.script);
      updateStageStatus('script', { status: 'complete', data: scriptResponse });

      // Stage 3: Parse & Breakdown
      setCurrentStage('breakdown');
      updateStageStatus('breakdown', { status: 'in_progress' });
      setExpandedSections(['breakdown']);

      const parseResponse = await fetchAPI('/story-editor/parse', {
        method: 'POST',
        body: JSON.stringify({
          scriptText: scriptResponse.script,
        }),
      });

      // Break down each scene
      const breakdowns = [];
      const totalScenes = parseResponse.scenes.length;
      console.log(`Breaking down ${totalScenes} scenes...`);

      for (let i = 0; i < totalScenes; i++) {
        // Update progress for UI feedback
        const sceneHeading = parseResponse.scenes[i];
        const sceneName =
          typeof sceneHeading === 'object'
            ? sceneHeading?.location || `Scene ${i + 1}`
            : sceneHeading || `Scene ${i + 1}`;
        setProgressInfo({
          stage: 'breakdown',
          current: i + 1,
          total: totalScenes,
          sceneName: String(sceneName).slice(0, 40),
        });

        console.log(`Breaking down scene ${i + 1}:`, parseResponse.scenes[i]);

        const breakdownResponse = await fetchAPI('/story-editor/breakdown', {
          method: 'POST',
          body: JSON.stringify({
            sceneNumber: i + 1,
            heading: parseResponse.scenes[i],
            sceneText: parseResponse.sceneTexts[i] || '',
            genre: selectedGenre,
            config: { pace, style, targetDuration: targetDurationSeconds, totalScenes, allowNSFW },
          }),
        });

        console.log(
          `Scene ${i + 1} breakdown result - suggestedShots:`,
          breakdownResponse.suggestedShots?.length || 0
        );
        breakdowns.push(breakdownResponse);
      }

      // Clear breakdown progress
      setProgressInfo(null);

      console.log(
        `Total breakdowns: ${breakdowns.length}, Total shots: ${breakdowns.reduce((sum: number, b: any) => sum + (b.suggestedShots?.length || 0), 0)}`
      );
      setScenes(breakdowns);
      updateStageStatus('breakdown', { status: 'complete', data: breakdowns });

      // Stage 4: Generate Prompts
      setCurrentStage('prompts');
      updateStageStatus('prompts', { status: 'in_progress' });

      const allPrompts: any[] = [];
      const totalBreakdowns = breakdowns.length;
      console.log(`Starting prompt generation for ${totalBreakdowns} scene breakdowns`);

      for (let i = 0; i < totalBreakdowns; i++) {
        const breakdown = breakdowns[i];

        // Update progress for UI feedback
        const sceneHeading = breakdown.heading || parseResponse.scenes[i];
        const sceneName =
          typeof sceneHeading === 'object'
            ? sceneHeading?.location || `Scene ${i + 1}`
            : sceneHeading || `Scene ${i + 1}`;
        setProgressInfo({
          stage: 'prompts',
          current: i + 1,
          total: totalBreakdowns,
          sceneName: String(sceneName).slice(0, 40),
        });

        console.log(`Scene ${i + 1} breakdown:`, JSON.stringify(breakdown, null, 2).slice(0, 500));

        const heading = breakdown.heading || parseResponse.scenes[i];

        // Get shots from various possible keys
        let shotsToUse =
          breakdown.suggestedShots ||
          breakdown.shots ||
          breakdown.shot_list ||
          breakdown.shotList ||
          [];
        console.log(`Scene ${i + 1}: ${shotsToUse.length} shots found, heading:`, heading);

        if (shotsToUse.length === 0) {
          console.warn(`Scene ${i + 1} has no shots under any known key, skipping`);
          console.log(`Available keys in breakdown:`, Object.keys(breakdown));
          continue;
        }

        console.log(`Generating prompts for scene ${i + 1} with ${shotsToUse.length} shots`);

        try {
          const promptsResponse = await fetchAPI('/story-editor/prompts', {
            method: 'POST',
            body: JSON.stringify({
              shots: shotsToUse,
              sceneHeading: heading,
              genre: selectedGenre,
              style,
              allowNSFW,
              shotDuration, // Pass the configured shot duration
              // Include selected characters for prompt injection
              characters: selectedCharacters.length > 0 ? selectedCharacters : undefined,
            }),
          });

          console.log(
            `Scene ${i + 1} prompts response:`,
            Array.isArray(promptsResponse)
              ? `array of ${promptsResponse.length}`
              : typeof promptsResponse
          );

          // Handle both array and object responses and apply shotDuration to each prompt
          if (Array.isArray(promptsResponse)) {
            // Apply shotDuration to each prompt
            const promptsWithDuration = promptsResponse.map((p: any) => ({
              ...p,
              duration: shotDuration, // Override with configured duration
            }));
            allPrompts.push(...promptsWithDuration);
          } else if (promptsResponse && typeof promptsResponse === 'object') {
            // Check if it's wrapped in a property
            if (promptsResponse.prompts && Array.isArray(promptsResponse.prompts)) {
              // Apply shotDuration to each prompt
              const promptsWithDuration = promptsResponse.prompts.map((p: any) => ({
                ...p,
                duration: shotDuration, // Override with configured duration
              }));
              allPrompts.push(...promptsWithDuration);
            } else {
              console.warn('Unexpected prompts response format:', promptsResponse);
            }
          }
        } catch (promptError) {
          console.error(`Failed to generate prompts for scene ${i + 1}:`, promptError);
        }
      }

      // Clear prompts progress
      setProgressInfo(null);

      console.log(`Generated ${allPrompts.length} total prompts`);

      if (allPrompts.length === 0) {
        console.error('No prompts were generated - check console for scene breakdown details');
      }

      setPrompts(allPrompts);
      updateStageStatus('prompts', { status: 'complete', data: allPrompts });

      // Complete!
      setCurrentStage('complete');
      updateStageStatus('complete', { status: 'complete' });
    } catch (error) {
      console.error('Pipeline error:', error);
      setProgressInfo(null); // Clear progress on error
      updateStageStatus(currentStage, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsRunning(false);
      setProgressInfo(null); // Ensure progress is cleared
    }
  };

  // Run pipeline from an uploaded/pasted screenplay using global store (persists across navigation)
  const runFromScript = async () => {
    if (!uploadedScript || !selectedGenre) {
      alert('Please paste a screenplay and select a genre');
      return;
    }

    // Convert local characters to global format
    const globalCharacters: GlobalStoryCharacter[] = selectedCharacters.map(c => ({
      name: c.name,
      elementId: c.elementId,
      loraId: c.loraId,
      triggerWord: c.triggerWord,
      visualDescription: c.visualDescription,
      referenceImageUrl: c.referenceImageUrl,
      role: c.role,
    }));

    // Start generation from script in the global store (continues even if we navigate away)
    globalStore.startFromScript({
      projectId,
      concept: concept || 'Uploaded screenplay',
      uploadedScript,
      genre: selectedGenre,
      style: style || `cinematic ${selectedGenre}`,
      pace,
      targetDurationSeconds,
      shotDuration,
      allowNSFW,
      characters: globalCharacters,
    });

    // Expand the breakdown section while generating
    setExpandedSections(['breakdown']);
  };

  // Continue generation from where it left off (for loaded stories with partial data)
  const continueGeneration = async () => {
    if (!selectedGenre) {
      alert('Please select a genre before continuing');
      return;
    }

    // Convert local characters to global format
    const globalCharacters: GlobalStoryCharacter[] = selectedCharacters.map(c => ({
      name: c.name,
      elementId: c.elementId,
      loraId: c.loraId,
      triggerWord: c.triggerWord,
      visualDescription: c.visualDescription,
      referenceImageUrl: c.referenceImageUrl,
      role: c.role,
    }));

    // Gather existing data
    const fromData: ContinueFromData = {
      outline: outline || undefined,
      script: script || undefined,
      scenes: scenes.length > 0 ? scenes : undefined,
      prompts: prompts.length > 0 ? prompts : undefined,
    };

    // Continue generation from the global store
    globalStore.continueGeneration(
      {
        projectId,
        concept: concept || 'Loaded story',
        genre: selectedGenre,
        style: style || `cinematic ${selectedGenre}`,
        pace,
        targetDurationSeconds,
        shotDuration,
        allowNSFW,
        characters: globalCharacters,
      },
      fromData
    );

    // Expand the appropriate section
    if (scenes.length > 0 && prompts.length === 0) {
      setExpandedSections(['prompts']);
    } else if (script && scenes.length === 0) {
      setExpandedSections(['breakdown']);
    } else if (outline && !script) {
      setExpandedSections(['script']);
    }
  };

  // Check if we can continue generation (has partial data)
  const canContinueGeneration = (): { canContinue: boolean; nextStage: string } => {
    if (isRunning) return { canContinue: false, nextStage: '' };
    if (prompts.length > 0) return { canContinue: false, nextStage: '' }; // Already complete

    if (scenes.length > 0) return { canContinue: true, nextStage: 'Shot Prompts' };
    if (script) return { canContinue: true, nextStage: 'Scene Breakdown' };
    if (outline) return { canContinue: true, nextStage: 'Script' };

    return { canContinue: false, nextStage: '' };
  };

  const { canContinue, nextStage } = canContinueGeneration();

  // Legacy local runFromScript (keeping for reference, but now using global store above)
  const runFromScriptLocal = async () => {
    if (!uploadedScript || !selectedGenre) {
      alert('Please paste a screenplay and select a genre');
      return;
    }

    setIsRunning(true);
    // Mark concept as in_progress briefly, then complete along with outline/script
    updateStageStatus('concept', { status: 'in_progress' });
    setCurrentStage('breakdown');

    try {
      // Brief delay to show concept in_progress, then mark complete
      await new Promise(resolve => setTimeout(resolve, 300));
      updateStageStatus('concept', { status: 'complete' });
      updateStageStatus('outline', { status: 'complete', data: { skipped: true } });
      updateStageStatus('script', { status: 'complete', data: { script: uploadedScript } });
      setScript(uploadedScript);

      // Stage 1: Parse the uploaded script
      updateStageStatus('breakdown', { status: 'in_progress' });
      setExpandedSections(['breakdown']);

      const parseResponse = await fetchAPI('/story-editor/parse', {
        method: 'POST',
        body: JSON.stringify({
          scriptText: uploadedScript,
        }),
      });

      console.log(`Parsed ${parseResponse.scenes?.length || 0} scenes from uploaded script`);

      if (!parseResponse.scenes || parseResponse.scenes.length === 0) {
        throw new Error(
          'No scenes found in the uploaded screenplay. Make sure it uses standard format (INT./EXT. LOCATION - TIME)'
        );
      }

      // Break down each scene
      const breakdowns = [];
      const totalScenes = parseResponse.scenes.length;
      console.log(`Breaking down ${totalScenes} scenes...`);

      for (let i = 0; i < totalScenes; i++) {
        // Update progress for UI feedback
        const sceneHeading = parseResponse.scenes[i];
        const sceneName =
          typeof sceneHeading === 'object'
            ? sceneHeading?.location || `Scene ${i + 1}`
            : sceneHeading || `Scene ${i + 1}`;
        setProgressInfo({
          stage: 'breakdown',
          current: i + 1,
          total: totalScenes,
          sceneName: String(sceneName).slice(0, 40),
        });

        console.log(`Breaking down scene ${i + 1}:`, parseResponse.scenes[i]);

        const breakdownResponse = await fetchAPI('/story-editor/breakdown', {
          method: 'POST',
          body: JSON.stringify({
            sceneNumber: i + 1,
            heading: parseResponse.scenes[i],
            sceneText: parseResponse.sceneTexts[i] || '',
            genre: selectedGenre,
            config: { pace, style, targetDuration: targetDurationSeconds, totalScenes, allowNSFW },
          }),
        });

        console.log(
          `Scene ${i + 1} breakdown result - suggestedShots:`,
          breakdownResponse.suggestedShots?.length || 0
        );
        breakdowns.push(breakdownResponse);
      }

      // Clear breakdown progress
      setProgressInfo(null);

      console.log(
        `Total breakdowns: ${breakdowns.length}, Total shots: ${breakdowns.reduce((sum: number, b: any) => sum + (b.suggestedShots?.length || 0), 0)}`
      );
      setScenes(breakdowns);
      updateStageStatus('breakdown', { status: 'complete', data: breakdowns });

      // Stage 2: Generate Prompts
      setCurrentStage('prompts');
      updateStageStatus('prompts', { status: 'in_progress' });

      const allPrompts: any[] = [];
      const totalBreakdowns = breakdowns.length;
      console.log(`Starting prompt generation for ${totalBreakdowns} scene breakdowns`);

      for (let i = 0; i < totalBreakdowns; i++) {
        const breakdown = breakdowns[i];

        // Update progress for UI feedback
        const heading = breakdown.heading || parseResponse.scenes[i];
        const sceneName =
          typeof heading === 'object'
            ? heading?.location || `Scene ${i + 1}`
            : heading || `Scene ${i + 1}`;
        setProgressInfo({
          stage: 'prompts',
          current: i + 1,
          total: totalBreakdowns,
          sceneName: String(sceneName).slice(0, 40),
        });

        // Get shots from various possible keys
        let shotsToUse =
          breakdown.suggestedShots ||
          breakdown.shots ||
          breakdown.shot_list ||
          breakdown.shotList ||
          [];
        console.log(`Scene ${i + 1}: ${shotsToUse.length} shots found`);

        if (shotsToUse.length === 0) {
          console.warn(`Scene ${i + 1} has no shots under any known key, skipping`);
          console.log(`Available keys in breakdown:`, Object.keys(breakdown));
          continue;
        }

        console.log(`Generating prompts for scene ${i + 1} with ${shotsToUse.length} shots`);

        try {
          const promptsResponse = await fetchAPI('/story-editor/prompts', {
            method: 'POST',
            body: JSON.stringify({
              shots: shotsToUse,
              sceneHeading: heading,
              genre: selectedGenre,
              style,
              allowNSFW,
              shotDuration, // Pass the configured shot duration
              // Include selected characters for prompt injection
              characters: selectedCharacters.length > 0 ? selectedCharacters : undefined,
            }),
          });

          // Apply shotDuration to each prompt
          if (Array.isArray(promptsResponse)) {
            const promptsWithDuration = promptsResponse.map((p: any) => ({
              ...p,
              duration: shotDuration,
            }));
            allPrompts.push(...promptsWithDuration);
          } else if (promptsResponse?.prompts && Array.isArray(promptsResponse.prompts)) {
            const promptsWithDuration = promptsResponse.prompts.map((p: any) => ({
              ...p,
              duration: shotDuration,
            }));
            allPrompts.push(...promptsWithDuration);
          }
        } catch (promptError) {
          console.error(`Failed to generate prompts for scene ${i + 1}:`, promptError);
        }
      }

      // Clear prompts progress
      setProgressInfo(null);

      console.log(`Generated ${allPrompts.length} total prompts`);
      setPrompts(allPrompts);
      updateStageStatus('prompts', { status: 'complete', data: allPrompts });

      // Complete!
      setCurrentStage('complete');
      updateStageStatus('complete', { status: 'complete' });
    } catch (error) {
      console.error('Pipeline error:', error);
      setProgressInfo(null); // Clear progress on error
      updateStageStatus(currentStage, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsRunning(false);
      setProgressInfo(null); // Ensure progress is cleared
    }
  };

  // Generate a single stage
  const generateOutline = async () => {
    if (!concept || !selectedGenre) return;

    // Mark concept as in_progress while validating
    updateStageStatus('concept', { status: 'in_progress' });

    try {
      // Brief delay to show concept in_progress, then mark complete
      await new Promise(resolve => setTimeout(resolve, 300));
      updateStageStatus('concept', { status: 'complete' });
      updateStageStatus('outline', { status: 'in_progress' });
      const response = await fetchAPI('/story-editor/outline', {
        method: 'POST',
        body: JSON.stringify({
          concept,
          genre: selectedGenre,
          numberOfActs: 3,
        }),
      });
      setOutline(response);
      updateStageStatus('outline', { status: 'complete', data: response });
      setExpandedSections(prev => [...prev, 'outline']);
    } catch (error) {
      updateStageStatus('outline', {
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to generate outline',
      });
    }
  };

  const genreTemplate = selectedGenre ? getGenreTemplate(selectedGenre) : null;

  // Calculate running length from scenes and shots
  const calculateRunningLength = () => {
    let totalSeconds = 0;

    // From outline beats
    if (outline?.acts) {
      outline.acts.forEach((act: any) => {
        act.beats?.forEach((beat: any) => {
          totalSeconds += beat.estimatedDuration || 0;
        });
      });
    }

    // From scene breakdowns (more accurate)
    if (scenes.length > 0) {
      totalSeconds = 0; // Reset if we have detailed breakdown
      scenes.forEach((scene: any) => {
        scene.suggestedShots?.forEach((shot: any) => {
          totalSeconds += shot.duration || shotDuration; // Use configured shot duration
        });
      });
    }

    return totalSeconds;
  };

  const runningLengthSeconds = calculateRunningLength();
  const runningLengthMinutes = Math.floor(runningLengthSeconds / 60);
  const runningLengthRemainder = runningLengthSeconds % 60;

  const formatRunningLength = () => {
    if (runningLengthSeconds === 0) return '0:00';
    if (runningLengthMinutes >= 60) {
      const hours = Math.floor(runningLengthMinutes / 60);
      const mins = runningLengthMinutes % 60;
      return `${hours}h ${mins}m ${runningLengthRemainder}s`;
    }
    return `${runningLengthMinutes}:${runningLengthRemainder.toString().padStart(2, '0')}`;
  };

  // Count total shots
  const totalShots = scenes.reduce(
    (acc: number, scene: any) => acc + (scene.suggestedShots?.length || 0),
    0
  );

  // Script Lab: Auto-breakdown assets from script
  const handleAutoBreakdown = async () => {
    if (!script && !outline) {
      alert('Please generate a script or outline first');
      return;
    }

    setIsBreakingDown(true);
    setBreakdownResult(null);

    try {
      const response = await fetchAPI('/story-editor/auto-breakdown', {
        method: 'POST',
        body: JSON.stringify({
          projectId,
          script: script || undefined,
          outline: outline || undefined,
        }),
      });

      if (response.success) {
        setBreakdownResult({
          assetsCreated: response.assetsCreated,
          breakdown: response.breakdown,
        });
        // Refresh project elements to show new assets
        const elements = await fetchAPI(`/projects/${projectId}/elements`);
        const characterElements = (elements || []).filter(
          (e: ProjectElement) =>
            e.type === 'character' || e.type === 'image' || e.metadata?.triggerWord
        );
        setProjectElements(characterElements);
      } else {
        alert('Auto-breakdown failed: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('[Script Lab] Auto-breakdown error:', error);
      alert('Auto-breakdown failed. Check console for details.');
    } finally {
      setIsBreakingDown(false);
    }
  };

  // Save story to project and export to storyboard
  const saveAndExportToStoryboard = async () => {
    if (prompts.length === 0 || scenes.length === 0) {
      alert('Please generate a complete storyboard first');
      return;
    }

    if (!selectedGenre) {
      alert('Please select a genre before exporting');
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      // FIRST: Auto-save the story so it persists
      const storyData = {
        name: storyName || `${selectedGenre} story - ${new Date().toLocaleString()}`,
        genre: selectedGenre,
        concept,
        outline,
        script,
        scenes,
        prompts,
        allowNSFW,
        targetDuration: targetDurationSeconds,
        status: 'exported',
      };

      let savedStoryId = currentStoryId;
      if (currentStoryId) {
        // Update existing story
        await fetchAPI(`/projects/${projectId}/stories/${currentStoryId}`, {
          method: 'PATCH',
          body: JSON.stringify({ ...storyData, exportedAt: new Date().toISOString() }),
        });
      } else {
        // Create new story
        const savedStory = await fetchAPI(`/projects/${projectId}/stories`, {
          method: 'POST',
          body: JSON.stringify(storyData),
        });
        savedStoryId = savedStory.id;
        setCurrentStoryId(savedStory.id);
        setStoryName(savedStory.name);
      }

      console.log('Story auto-saved before export:', savedStoryId);

      // THEN: Create scene chains and segments for the storyboard
      // Create one scene chain per scene (or one for the whole story)
      for (let i = 0; i < scenes.length; i++) {
        const sceneBreakdown = scenes[i];
        const sceneName = sceneBreakdown.heading
          ? `${sceneBreakdown.heading.intExt}. ${sceneBreakdown.heading.location} - ${sceneBreakdown.heading.timeOfDay}`
          : `Scene ${i + 1}`;

        // Calculate target duration for this scene based on shots
        const sceneDuration = (sceneBreakdown.suggestedShots?.length || 0) * 5; // 5 seconds per shot

        // Create a scene chain for this scene
        const sceneChain = await fetchAPI(`/projects/${projectId}/scene-chains`, {
          method: 'POST',
          body: JSON.stringify({
            name: sceneName,
            description: sceneBreakdown.description || sceneBreakdown.action || '',
            targetDuration: sceneDuration,
            aspectRatio: '16:9',
            status: 'draft',
          }),
        });

        console.log(`Created scene chain: ${sceneName}`, sceneChain.id);

        // Get the prompts for this scene's shots
        const scenePrompts = prompts.filter((p: any) => {
          // Match prompts by shot number range for this scene
          const startShot =
            scenes
              .slice(0, i)
              .reduce((acc: number, s: any) => acc + (s.suggestedShots?.length || 0), 0) + 1;
          const endShot = startShot + (sceneBreakdown.suggestedShots?.length || 0) - 1;
          return p.shotNumber >= startShot && p.shotNumber <= endShot;
        });

        // Create segments for each shot in this scene chain
        for (let j = 0; j < (sceneBreakdown.suggestedShots?.length || 0); j++) {
          const shot = sceneBreakdown.suggestedShots[j];
          const promptData = scenePrompts[j] || prompts[j];

          if (promptData) {
            // Create a segment for this shot
            await fetchAPI(`/projects/${projectId}/scene-chains/${sceneChain.id}/segments`, {
              method: 'POST',
              body: JSON.stringify({
                prompt: promptData.prompt,
                firstFramePrompt: promptData.firstFramePrompt || promptData.prompt,
                lastFramePrompt: promptData.lastFramePrompt || null,
                duration: shot.duration || shotDuration,
                orderIndex: j,
                transitionType: 'smooth',
                // Store additional metadata in the segment
                sourceType: 'story-editor',
                sourceId: savedStoryId,
              }),
            });

            console.log(`Created segment ${j + 1} for scene ${i + 1}`);
          }
        }
      }

      setSaveSuccess(true);

      // Auto-navigate to storyboard after successful export
      setTimeout(() => {
        window.location.href = `/projects/${projectId}/storyboard`;
      }, 1000); // Brief delay to show success state
    } catch (error) {
      console.error('Failed to save storyboard:', error);
      alert(
        'Failed to save storyboard: ' + (error instanceof Error ? error.message : 'Unknown error')
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Navigate to storyboard page
  const goToStoryboard = () => {
    window.location.href = `/projects/${projectId}/storyboard`;
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-8 text-white">
      {/* Session Recovery Toast */}
      <RecoveryToast
        isVisible={showRecoveryToast}
        savedAt={recoverableSession?.savedAt || 0}
        pageType="story-editor"
        onRestore={handleRestoreSession}
        onDismiss={handleDismissRecovery}
      />

      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="mb-2 flex items-center gap-3 text-3xl font-bold">
            <FileText className="h-8 w-8 text-blue-400" />
            Story Editor
            {currentStoryId && storyName && (
              <span className="text-lg font-normal text-gray-400">— {storyName}</span>
            )}
          </h1>
          <p className="text-gray-400">
            Transform concepts into complete storyboards with AI-powered screenplay generation
          </p>
        </div>

        {/* Save/Load Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={newStory}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-300 hover:bg-white/10"
          >
            <Plus className="h-4 w-4" />
            New
          </button>
          <button
            onClick={() => {
              loadSavedStories();
              setShowStoriesModal(true);
            }}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-300 hover:bg-white/10"
          >
            <FolderOpen className="h-4 w-4" />
            Open
          </button>
          <button
            onClick={saveStory}
            disabled={isSaving || !concept || !selectedGenre}
            className={clsx(
              'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              saveSuccess
                ? 'bg-green-600 text-white'
                : 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-600 disabled:text-gray-400'
            )}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saveSuccess ? (
              <Check className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saveSuccess ? 'Saved!' : currentStoryId ? 'Save' : 'Save As'}
          </button>
        </div>
      </div>

      {/* Stories Modal */}
      <AnimatePresence>
        {showStoriesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1a]"
            >
              <div className="flex items-center justify-between border-b border-white/10 p-6">
                <h2 className="flex items-center gap-2 text-xl font-bold">
                  <FolderOpen className="h-5 w-5 text-blue-400" />
                  Saved Stories
                </h2>
                <button
                  onClick={() => setShowStoriesModal(false)}
                  className="rounded-lg p-2 hover:bg-white/10"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto p-6">
                {loadingStories ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
                  </div>
                ) : savedStories.length === 0 ? (
                  <div className="py-12 text-center text-gray-500">
                    <FileText className="mx-auto mb-4 h-12 w-12 opacity-50" />
                    <p>No saved stories yet</p>
                    <p className="mt-2 text-sm">Create a story and click Save to see it here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {savedStories.map(story => (
                      <div
                        key={story.id}
                        className={clsx(
                          'flex items-start justify-between gap-4 rounded-lg border p-4 transition-colors hover:bg-white/5',
                          currentStoryId === story.id
                            ? 'border-blue-500/50 bg-blue-500/10'
                            : 'border-white/10'
                        )}
                      >
                        <div className="flex-1 cursor-pointer" onClick={() => loadStory(story.id)}>
                          <h3 className="flex items-center gap-2 font-medium">
                            {story.name}
                            <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-gray-400">
                              {story.genre}
                            </span>
                            {story.allowNSFW && (
                              <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-400">
                                NSFW
                              </span>
                            )}
                          </h3>
                          <p className="mt-1 line-clamp-2 text-sm text-gray-400">{story.concept}</p>
                          <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                            <span>Status: {story.status}</span>
                            <span>Updated: {new Date(story.updatedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            deleteStory(story.id);
                          }}
                          className="rounded-lg p-2 text-gray-500 hover:bg-red-500/10 hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column - Input */}
        <div className="space-y-6 lg:col-span-1">
          {/* Input Mode Toggle + Input */}
          <div className="rounded-xl border border-white/10 bg-[#1a1a1a] p-6">
            {/* Mode Toggle */}
            <div className="mb-4 flex gap-2">
              <button
                onClick={() => setInputMode('concept')}
                className={clsx(
                  'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                  inputMode === 'concept'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                )}
              >
                <Lightbulb className="h-4 w-4" />
                From Concept
              </button>
              <button
                onClick={() => setInputMode('script')}
                className={clsx(
                  'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                  inputMode === 'script'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                )}
              >
                <Upload className="h-4 w-4" />
                Upload Script
              </button>
            </div>

            {/* Concept Mode */}
            {inputMode === 'concept' && (
              <>
                <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
                  <Lightbulb className="h-5 w-5 text-yellow-400" />
                  Story Concept
                </h2>

                <textarea
                  value={concept}
                  onChange={e => setConcept(e.target.value)}
                  placeholder="Describe your story concept...

Example: A noir detective in 1940s LA investigates the disappearance of a jazz singer, only to discover she faked her own death to escape a dangerous criminal syndicate."
                  className="h-40 w-full resize-none rounded-lg border border-white/10 bg-black/50 p-4 text-sm text-white placeholder-gray-600 focus:border-blue-500/50 focus:outline-none"
                />
              </>
            )}

            {/* Script Upload Mode */}
            {inputMode === 'script' && (
              <>
                <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
                  <PenTool className="h-5 w-5 text-purple-400" />
                  Upload Screenplay
                </h2>

                <textarea
                  value={uploadedScript}
                  onChange={e => setUploadedScript(e.target.value)}
                  placeholder="Paste your screenplay here...

Use standard screenplay format with scene headings like:
INT. COFFEE SHOP - DAY
EXT. CITY STREET - NIGHT

The parser will automatically detect scenes and break them down into shots."
                  className="h-64 w-full resize-none rounded-lg border border-white/10 bg-black/50 p-4 font-mono text-sm text-white placeholder-gray-600 focus:border-purple-500/50 focus:outline-none"
                />

                <p className="mt-2 text-xs text-gray-500">
                  {uploadedScript.length > 0 && (
                    <span className="text-purple-400">
                      {uploadedScript.length.toLocaleString()} characters
                    </span>
                  )}
                  {uploadedScript.length === 0 && 'Paste or type your screenplay above'}
                </p>
              </>
            )}

            <div className="mt-4">
              <label className="mb-2 block text-xs font-bold tracking-wider text-gray-400 uppercase">
                Genre
              </label>
              <GenreSelector
                selectedGenre={selectedGenre}
                onSelect={setSelectedGenre}
                showStylePreview={false}
                includeMature={allowNSFW}
              />
            </div>

            {genreTemplate && (
              <div className="mt-4 rounded-lg border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-purple-500/10 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-xl">{genreTemplate.icon}</span>
                  <span className="text-sm font-bold">{genreTemplate.name}</span>
                </div>
                <p className="mb-2 text-xs text-gray-400">{genreTemplate.description}</p>
                <p className="text-xs text-blue-300 italic">"{genreTemplate.defaultStyle}"</p>
              </div>
            )}

            {/* Advanced Options */}
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-2 block text-xs font-bold tracking-wider text-gray-400 uppercase">
                  Visual Style (Optional)
                </label>
                <input
                  type="text"
                  value={style}
                  onChange={e => setStyle(e.target.value)}
                  placeholder="e.g., Blade Runner aesthetic, Wes Anderson colors..."
                  className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-blue-500/50 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold tracking-wider text-gray-400 uppercase">
                  Target Duration (Optional)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={targetDuration}
                    onChange={e => handleDurationChange(e.target.value)}
                    placeholder="e.g., 5s, 2m, 90min, 1h30m, 1:30"
                    className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-blue-500/50 focus:outline-none"
                  />
                  {targetDurationSeconds !== null && (
                    <div className="absolute top-1/2 right-3 -translate-y-1/2 text-xs text-green-400">
                      = {formatTargetDuration(targetDurationSeconds)}
                    </div>
                  )}
                </div>
                <p className="mt-1 text-[10px] text-gray-600">
                  Leave empty for auto-calculated duration based on content
                </p>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold tracking-wider text-gray-400 uppercase">
                  Video Shot Duration
                </label>
                <select
                  value={shotDuration}
                  onChange={e => setShotDuration(Number(e.target.value))}
                  className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white focus:border-blue-500/50 focus:outline-none"
                >
                  <option value={3}>3 seconds</option>
                  <option value={4}>4 seconds</option>
                  <option value={5}>5 seconds</option>
                  <option value={6}>6 seconds</option>
                  <option value={7}>7 seconds</option>
                  <option value={8}>8 seconds (VEO 3.1)</option>
                  <option value={10}>10 seconds</option>
                </select>
                <p className="mt-1 text-[10px] text-gray-600">
                  Default duration for each video shot (most models max 10s, VEO 3.1 up to 8s)
                </p>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold tracking-wider text-gray-400 uppercase">
                  Pacing
                </label>
                <div className="flex gap-2">
                  {(['slow', 'medium', 'fast'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setPace(p)}
                      className={clsx(
                        'flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors',
                        pace === p
                          ? 'bg-blue-500 text-white'
                          : 'bg-white/5 text-gray-400 hover:bg-white/10'
                      )}
                    >
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Character Selector */}
              <div>
                <label className="mb-2 block text-xs font-bold tracking-wider text-gray-400 uppercase">
                  Characters (Optional)
                </label>

                {/* Selected Characters */}
                {selectedCharacters.length > 0 && (
                  <div className="mb-3 space-y-2">
                    {selectedCharacters.map(char => (
                      <div
                        key={char.elementId}
                        className="flex items-center gap-3 rounded-lg border border-blue-500/30 bg-blue-500/10 p-2"
                      >
                        {/* Thumbnail */}
                        {char.referenceImageUrl && (
                          <img
                            src={char.referenceImageUrl}
                            alt={char.name}
                            className="h-10 w-10 rounded object-cover"
                          />
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium text-white">
                              {char.name}
                            </span>
                            {char.triggerWord && (
                              <span className="rounded bg-amber-500/20 px-1.5 py-0.5 font-mono text-[10px] text-amber-300">
                                {char.triggerWord}
                              </span>
                            )}
                          </div>

                          {/* Role selector */}
                          <select
                            value={char.role || 'supporting'}
                            onChange={e =>
                              updateCharacter(char.elementId!, {
                                role: e.target.value as StoryCharacter['role'],
                              })
                            }
                            className="mt-1 w-full rounded border border-white/10 bg-black/50 px-2 py-1 text-[10px] text-gray-300"
                          >
                            <option value="protagonist">Protagonist</option>
                            <option value="antagonist">Antagonist</option>
                            <option value="supporting">Supporting</option>
                            <option value="minor">Minor</option>
                          </select>
                        </div>

                        <button
                          onClick={() => removeCharacter(char.elementId!)}
                          className="rounded p-1 text-gray-400 transition-colors hover:bg-red-500/20 hover:text-red-400"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Character Button */}
                <button
                  onClick={() => setShowCharacterPicker(!showCharacterPicker)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                >
                  {showCharacterPicker ? (
                    <>
                      <X className="h-4 w-4" />
                      Close Picker
                    </>
                  ) : (
                    <>
                      <Users className="h-4 w-4" />
                      Add Characters from Library
                    </>
                  )}
                </button>

                {/* Character Picker Panel */}
                {showCharacterPicker && (
                  <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-white/10 bg-black/50 p-3">
                    {loadingElements ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                      </div>
                    ) : projectElements.length === 0 ? (
                      <div className="py-4 text-center">
                        <p className="text-xs text-gray-500">
                          No character/image elements in this project yet.
                        </p>
                        <p className="mt-1 text-[10px] text-gray-600">
                          Add images to your library on the Generate page first.
                        </p>
                        <p className="mt-2 font-mono text-[10px] text-gray-700">
                          Project: {projectId?.slice(0, 8)}...
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {projectElements
                          .filter(e => !selectedCharacters.find(c => c.elementId === e.id))
                          .map(element => (
                            <button
                              key={element.id}
                              onClick={() => addCharacterFromElement(element)}
                              className="flex w-full items-center gap-3 rounded-lg p-2 transition-colors hover:bg-white/10"
                            >
                              {(element.url || element.fileUrl || element.thumbnail) && (
                                <img
                                  src={element.url || element.fileUrl || element.thumbnail}
                                  alt={element.name}
                                  className="h-8 w-8 rounded object-cover"
                                />
                              )}
                              <div className="flex-1 text-left">
                                <span className="text-sm text-white">{element.name}</span>
                                {element.metadata?.triggerWord && (
                                  <span className="ml-2 font-mono text-[10px] text-amber-400">
                                    {element.metadata.triggerWord}
                                  </span>
                                )}
                              </div>
                              <Plus className="h-4 w-4 text-gray-500" />
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                )}

                <p className="mt-1 text-[10px] text-gray-600">
                  Link story characters to Elements for consistent prompt injection
                </p>
              </div>

              {/* NSFW Toggle */}
              <div className="border-t border-white/5 pt-2">
                <label className="group flex cursor-pointer items-center gap-3">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={allowNSFW}
                      onChange={e => setAllowNSFW(e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="peer h-5 w-9 rounded-full bg-white/10 peer-checked:bg-red-500/50 peer-focus:outline-none after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:bg-gray-400 after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white peer-checked:after:bg-red-400"></div>
                  </div>
                  <div>
                    <span className="text-xs font-bold tracking-wider text-gray-400 uppercase group-hover:text-gray-300">
                      Mature Content
                    </span>
                    <p className="text-[10px] text-gray-600">
                      Allow unfiltered prompts without content moderation
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 space-y-2">
              {inputMode === 'concept' ? (
                <>
                  {/* Continue Generation button - shown when story has partial data */}
                  {canContinue && (
                    <button
                      onClick={continueGeneration}
                      disabled={!selectedGenre || isRunning}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-3 font-bold text-white transition-colors hover:from-green-500 hover:to-emerald-500 disabled:from-gray-700 disabled:to-gray-700"
                    >
                      {isRunning ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Continuing...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-5 w-5" />
                          Continue: Generate {nextStage}
                        </>
                      )}
                    </button>
                  )}

                  <button
                    onClick={runPipeline}
                    disabled={!concept || !selectedGenre || isRunning}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-3 font-bold text-white transition-colors hover:from-blue-500 hover:to-purple-500 disabled:from-gray-700 disabled:to-gray-700"
                  >
                    {isRunning ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-5 w-5" />
                        {canContinue ? 'Regenerate from Scratch' : 'Generate Full Storyboard'}
                      </>
                    )}
                  </button>

                  <button
                    onClick={generateOutline}
                    disabled={!concept || !selectedGenre || isRunning}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-white/5 px-4 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
                  >
                    <Sparkles className="h-4 w-4" />
                    Generate Outline Only
                  </button>
                </>
              ) : (
                <button
                  onClick={runFromScript}
                  disabled={!uploadedScript || !selectedGenre || isRunning}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-3 font-bold text-white transition-colors hover:from-purple-500 hover:to-pink-500 disabled:from-gray-700 disabled:to-gray-700"
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Processing Script...
                    </>
                  ) : (
                    <>
                      <Film className="h-5 w-5" />
                      Generate Shots & Prompts
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Pipeline Status */}
          <div className="rounded-xl border border-white/10 bg-[#1a1a1a] p-6">
            <h2 className="mb-4 text-lg font-bold">Pipeline Status</h2>

            <div className="space-y-3">
              {[
                { key: 'concept', label: 'Concept', icon: Lightbulb },
                { key: 'outline', label: 'Outline', icon: BookOpen },
                { key: 'script', label: 'Script', icon: FileText },
                { key: 'breakdown', label: 'Scene Breakdown', icon: Film },
                { key: 'prompts', label: 'Shot Prompts', icon: Camera },
                { key: 'complete', label: 'Complete', icon: Check },
              ].map(({ key, label, icon: Icon }) => {
                const stage = stages[key as PipelineStage];
                return (
                  <div
                    key={key}
                    className={clsx(
                      'flex items-center gap-3 rounded-lg p-3 transition-colors',
                      stage.status === 'in_progress' && 'border border-blue-500/30 bg-blue-500/10',
                      stage.status === 'complete' && 'border border-green-500/30 bg-green-500/10',
                      stage.status === 'error' && 'border border-red-500/30 bg-red-500/10',
                      stage.status === 'pending' && 'bg-white/5'
                    )}
                  >
                    <div
                      className={clsx(
                        'flex h-8 w-8 items-center justify-center rounded-full',
                        stage.status === 'in_progress' && 'bg-blue-500/20 text-blue-400',
                        stage.status === 'complete' && 'bg-green-500/20 text-green-400',
                        stage.status === 'error' && 'bg-red-500/20 text-red-400',
                        stage.status === 'pending' && 'bg-white/10 text-gray-500'
                      )}
                    >
                      {stage.status === 'in_progress' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : stage.status === 'complete' ? (
                        <Check className="h-4 w-4" />
                      ) : stage.status === 'error' ? (
                        <AlertCircle className="h-4 w-4" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span
                        className={clsx(
                          'text-sm font-medium',
                          stage.status === 'complete' && 'text-green-400',
                          stage.status === 'error' && 'text-red-400',
                          stage.status === 'in_progress' && 'text-blue-400',
                          stage.status === 'pending' && 'text-gray-500'
                        )}
                      >
                        {label}
                      </span>
                      {/* Show per-scene progress for breakdown and prompts stages */}
                      {stage.status === 'in_progress' &&
                        progressInfo &&
                        progressInfo.stage === key && (
                          <div className="mt-1.5">
                            <div className="mb-1 flex items-center justify-between text-[10px] text-gray-400">
                              <span className="max-w-[100px] truncate">
                                {progressInfo.sceneName}
                              </span>
                              <span className="font-mono">
                                {progressInfo.current}/{progressInfo.total}
                              </span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                              <div
                                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300 ease-out"
                                style={{
                                  width: `${(progressInfo.current / progressInfo.total) * 100}%`,
                                }}
                              />
                            </div>
                          </div>
                        )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Running Length Stats */}
            {(outline || scenes.length > 0) && (
              <div className="mt-4 border-t border-white/10 pt-4">
                <div className="mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-purple-400" />
                  <span className="text-xs font-bold tracking-wider text-gray-400 uppercase">
                    Running Length
                  </span>
                </div>

                <div className="rounded-lg border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-blue-500/10 p-4 text-center">
                  <div className="mb-1 text-3xl font-bold text-white">{formatRunningLength()}</div>
                  <div className="text-xs text-gray-400">
                    {scenes.length > 0 ? (
                      <>
                        {scenes.length} scene{scenes.length !== 1 ? 's' : ''} &bull; {totalShots}{' '}
                        shot{totalShots !== 1 ? 's' : ''}
                      </>
                    ) : outline?.acts ? (
                      <>
                        {outline.acts.reduce(
                          (acc: number, act: any) => acc + (act.beats?.length || 0),
                          0
                        )}{' '}
                        beats
                      </>
                    ) : null}
                  </div>
                </div>

                {/* Per-scene breakdown */}
                {scenes.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {scenes.map((scene: any, i: number) => {
                      const sceneDuration =
                        scene.suggestedShots?.reduce(
                          (acc: number, shot: any) => acc + (shot.duration || shotDuration),
                          0
                        ) || 0;
                      const sceneMins = Math.floor(sceneDuration / 60);
                      const sceneSecs = sceneDuration % 60;
                      return (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="max-w-[140px] truncate text-gray-500">
                            Scene {scene.sceneNumber}
                          </span>
                          <span className="font-mono text-gray-400">
                            {sceneMins}:{sceneSecs.toString().padStart(2, '0')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Results */}
        <div className="space-y-4 lg:col-span-2">
          {/* Outline Section */}
          {outline && (
            <CollapsibleSection
              title="Story Outline"
              icon={BookOpen}
              isExpanded={expandedSections.includes('outline')}
              onToggle={() => toggleSection('outline')}
              status={stages.outline.status}
            >
              <div className="space-y-4">
                {/* Characters */}
                {outline.characters?.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-xs font-bold tracking-wider text-gray-400 uppercase">
                      Characters
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {outline.characters.map((char: any, i: number) => (
                        <span
                          key={i}
                          className={clsx(
                            'rounded-full px-3 py-1 text-xs font-medium',
                            char.role === 'protagonist' && 'bg-blue-500/20 text-blue-300',
                            char.role === 'antagonist' && 'bg-red-500/20 text-red-300',
                            char.role === 'supporting' && 'bg-purple-500/20 text-purple-300',
                            char.role === 'minor' && 'bg-gray-500/20 text-gray-300'
                          )}
                        >
                          {char.name} ({char.role})
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Acts */}
                {outline.acts?.map((act: any, i: number) => (
                  <div key={i} className="rounded-lg bg-black/30 p-4">
                    <h4 className="mb-2 font-bold text-white">
                      Act {act.number}: {act.name}
                    </h4>
                    <p className="mb-3 text-sm text-gray-400">{act.description}</p>

                    <div className="space-y-2">
                      {act.beats?.map((beat: any, j: number) => (
                        <div key={j} className="flex items-start gap-2 text-xs">
                          <span
                            className={clsx(
                              'rounded px-2 py-0.5 text-[10px] font-bold uppercase',
                              beat.emotionalTone === 'tension' && 'bg-red-500/20 text-red-300',
                              beat.emotionalTone === 'release' && 'bg-green-500/20 text-green-300',
                              beat.emotionalTone === 'joy' && 'bg-yellow-500/20 text-yellow-300',
                              beat.emotionalTone === 'sadness' && 'bg-blue-500/20 text-blue-300',
                              !beat.emotionalTone && 'bg-gray-500/20 text-gray-300'
                            )}
                          >
                            {beat.type.replace(/_/g, ' ')}
                          </span>
                          <span className="flex-1 text-gray-300">{beat.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Themes */}
                {outline.themes?.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-xs font-bold tracking-wider text-gray-400 uppercase">
                      Themes
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {outline.themes.map((theme: string, i: number) => (
                        <span
                          key={i}
                          className="rounded bg-white/5 px-2 py-1 text-xs text-gray-300"
                        >
                          {theme}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleSection>
          )}

          {/* Script Section */}
          {script && (
            <CollapsibleSection
              title="Screenplay"
              icon={FileText}
              isExpanded={expandedSections.includes('script')}
              onToggle={() => toggleSection('script')}
              status={stages.script.status}
            >
              <pre className="max-h-96 overflow-y-auto rounded-lg bg-black/30 p-4 font-mono text-xs whitespace-pre-wrap text-gray-300">
                {script}
              </pre>
              {/* Script Lab: Quick Auto-Breakdown */}
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={handleAutoBreakdown}
                  disabled={isBreakingDown}
                  className={clsx(
                    'flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all',
                    breakdownResult
                      ? 'border-green-500/30 bg-green-500/20 text-green-300'
                      : 'border-amber-500/30 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30',
                    isBreakingDown && 'opacity-70'
                  )}
                >
                  {isBreakingDown ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Extracting...
                    </>
                  ) : breakdownResult ? (
                    <>
                      <Check className="h-3 w-3" />
                      {breakdownResult.breakdown.characters}C / {breakdownResult.breakdown.locations}L / {breakdownResult.breakdown.props}P
                    </>
                  ) : (
                    <>
                      <Package className="h-3 w-3" />
                      Extract Assets
                    </>
                  )}
                </button>
                {breakdownResult && (
                  <span className="text-xs text-gray-500">
                    → Check Asset Bin for {breakdownResult.assetsCreated} new placeholders
                  </span>
                )}
              </div>
            </CollapsibleSection>
          )}

          {/* Scene Breakdown Section - Each scene gets its own collapsible */}
          {scenes.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-2 py-1">
                <Film className="h-4 w-4 text-blue-400" />
                <span className="text-xs font-bold tracking-wider text-gray-400 uppercase">
                  Scene Breakdown ({scenes.length} scenes)
                </span>
              </div>
              {scenes.map((scene, i) => (
                <CollapsibleSection
                  key={i}
                  title={`Scene ${scene.sceneNumber}: ${scene.heading?.intExt || 'INT'}. ${scene.heading?.location || 'LOCATION'}`}
                  icon={Film}
                  isExpanded={expandedSections.includes(`scene-${i}`)}
                  onToggle={() => toggleSection(`scene-${i}`)}
                  status={stages.breakdown.status}
                >
                  <div className="space-y-3">
                    {/* Scene metadata */}
                    <div className="flex items-center justify-between">
                      <span
                        className={clsx(
                          'rounded px-2 py-0.5 text-[10px] font-bold uppercase',
                          scene.emotionalBeat === 'tension' && 'bg-red-500/20 text-red-300',
                          scene.emotionalBeat === 'release' && 'bg-green-500/20 text-green-300',
                          'bg-gray-500/20 text-gray-300'
                        )}
                      >
                        {scene.emotionalBeat || 'neutral'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {scene.suggestedShots?.length || 0} shots
                      </span>
                    </div>

                    <p className="text-sm text-gray-400">{scene.description}</p>

                    {scene.characters?.length > 0 && (
                      <div>
                        <span className="text-[10px] text-gray-500">Characters: </span>
                        <span className="text-xs text-gray-300">{scene.characters.join(', ')}</span>
                      </div>
                    )}

                    {/* Shots list */}
                    <div className="space-y-2 border-t border-white/10 pt-2">
                      <span className="text-[10px] font-bold text-gray-500 uppercase">Shots</span>
                      {scene.suggestedShots?.map((shot: any, j: number) => (
                        <div
                          key={j}
                          className="flex items-start gap-2 rounded bg-white/5 p-2 text-xs"
                        >
                          <span className="font-bold text-blue-400">{shot.shotNumber}.</span>
                          <div className="flex-1">
                            <p className="text-gray-300">{shot.description}</p>
                            <div className="mt-1 flex items-center gap-2">
                              <span className="rounded bg-green-500/20 px-1.5 py-0.5 text-[10px] text-green-300">
                                {shot.cameraPresetId?.replace(/_/g, ' ')}
                              </span>
                              <span className="text-gray-500">{shot.lighting}</span>
                              <span className="text-gray-500">{shot.duration}s</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CollapsibleSection>
              ))}
            </div>
          )}

          {/* Prompts Section - Each shot prompt gets its own collapsible */}
          {prompts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-2 py-1">
                <Camera className="h-4 w-4 text-purple-400" />
                <span className="text-xs font-bold tracking-wider text-gray-400 uppercase">
                  Shot Prompts ({prompts.length} shots)
                </span>
              </div>
              {prompts.map((prompt, i) => (
                <CollapsibleSection
                  key={i}
                  title={`SHOT ${prompt.shotNumber || i + 1}: ${prompt.shotTitle || prompt.cameraMove || 'UNTITLED'}`}
                  icon={Camera}
                  isExpanded={expandedSections.includes(`prompt-${i}`)}
                  onToggle={() => toggleSection(`prompt-${i}`)}
                  status={stages.prompts.status}
                >
                  <div className="space-y-4">
                    {/* Shot Header with metadata */}
                    <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                      {/* Duration badge - uses prompt.duration or falls back to configured shotDuration */}
                      <span className="rounded bg-cyan-500/20 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
                        {prompt.duration || shotDuration}s
                      </span>
                      {prompt.cameraDescription && (
                        <span className="rounded bg-purple-500/20 px-2 py-0.5 text-[10px] text-purple-300">
                          {prompt.cameraDescription}
                        </span>
                      )}
                      {prompt.style && (
                        <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-300">
                          {prompt.style}
                        </span>
                      )}
                    </div>

                    {/* FIRST FRAME - IMAGE PROMPT */}
                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-emerald-400"></div>
                        <span className="text-xs font-bold tracking-wider text-emerald-400 uppercase">
                          First Frame - Image Prompt
                        </span>
                      </div>
                      <p className="font-mono text-sm leading-relaxed whitespace-pre-wrap text-emerald-200/90">
                        {prompt.firstFramePrompt ||
                          prompt.prompt ||
                          'No first frame prompt generated'}
                      </p>
                    </div>

                    {/* LAST FRAME - IMAGE PROMPT */}
                    <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-violet-400"></div>
                        <span className="text-xs font-bold tracking-wider text-violet-400 uppercase">
                          Last Frame - Image Prompt
                        </span>
                      </div>
                      <p className="font-mono text-sm leading-relaxed whitespace-pre-wrap text-violet-200/90">
                        {prompt.lastFramePrompt || 'No last frame prompt generated'}
                      </p>
                    </div>

                    {/* VIDEO PROMPT (First Frame → Last Frame) */}
                    <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <div className="h-2 w-2 animate-pulse rounded-full bg-cyan-400"></div>
                        <span className="text-xs font-bold tracking-wider text-cyan-400 uppercase">
                          Video Prompt (First Frame → Last Frame)
                        </span>
                      </div>
                      <p className="font-mono text-sm leading-relaxed whitespace-pre-wrap text-cyan-200/90">
                        {prompt.videoPrompt || 'No video prompt generated'}
                      </p>
                    </div>

                    {/* Negative Prompt (collapsed) */}
                    {prompt.negativePrompt && (
                      <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                        <span className="mb-1 block text-[10px] font-bold text-red-400 uppercase">
                          Negative Prompt
                        </span>
                        <p className="font-mono text-xs text-red-300/70">{prompt.negativePrompt}</p>
                      </div>
                    )}

                    {/* Camera Move */}
                    {prompt.cameraMove && (
                      <div className="border-t border-white/5 pt-2 text-xs text-gray-500">
                        <span className="font-bold">Camera:</span> {prompt.cameraMove}
                      </div>
                    )}
                  </div>
                </CollapsibleSection>
              ))}

              {/* Export to Storyboard */}
              <div className="mt-4 rounded-lg border border-blue-500/20 bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-4">
                <p className="mb-3 text-sm text-gray-300">
                  Ready to generate images and videos from these prompts?
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={saveAndExportToStoryboard}
                    disabled={isSaving}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:bg-blue-800"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : saveSuccess ? (
                      <>
                        <Check className="h-4 w-4" />
                        Saved!
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" />
                        Save & Export to Storyboard
                      </>
                    )}
                  </button>
                  {saveSuccess && (
                    <button
                      onClick={goToStoryboard}
                      className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500"
                    >
                      <ChevronRight className="h-4 w-4" />
                      Go to Storyboard
                    </button>
                  )}
                  {/* Script Lab: Auto-Breakdown Button */}
                  {(script || outline) && (
                    <Tooltip content="Extract Characters, Locations & Props from script and create placeholder assets">
                      <button
                        onClick={handleAutoBreakdown}
                        disabled={isBreakingDown}
                        className={clsx(
                          'flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all',
                          breakdownResult
                            ? 'border-green-500/30 bg-green-500/20 text-green-300'
                            : 'border-amber-500/30 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30',
                          isBreakingDown && 'opacity-70'
                        )}
                      >
                        {isBreakingDown ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Extracting Assets...
                          </>
                        ) : breakdownResult ? (
                          <>
                            <Check className="h-4 w-4" />
                            {breakdownResult.assetsCreated} Assets Created
                          </>
                        ) : (
                          <>
                            <Package className="h-4 w-4" />
                            Auto-Breakdown Assets
                          </>
                        )}
                      </button>
                    </Tooltip>
                  )}
                  {/* Thumbnail Generator Button */}
                  {selectedGenre && (selectedGenre === 'youtuber' || selectedGenre === 'onlyfans') && (
                    <Tooltip content="Generate YouTube-optimized thumbnail">
                      <button
                        onClick={() => setShowThumbnailGenerator(true)}
                        className="flex items-center gap-2 rounded-lg border border-purple-500/30 bg-purple-500/20 px-4 py-2 text-sm font-medium text-purple-300 hover:bg-purple-500/30"
                      >
                        <Image className="h-4 w-4" />
                        Generate Thumbnail
                      </button>
                    </Tooltip>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!outline && !script && scenes.length === 0 && (
            <div className="rounded-xl border border-white/10 bg-[#1a1a1a] p-12 text-center">
              <FileText className="mx-auto mb-4 h-16 w-16 text-gray-600" />
              <h3 className="mb-2 text-xl font-bold text-gray-400">No Story Yet</h3>
              <p className="mb-6 text-gray-600">
                Enter a concept and select a genre to begin generating your screenplay and
                storyboard.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <GenrePills
                  selectedGenre={selectedGenre}
                  onSelect={setSelectedGenre}
                  maxVisible={6}
                  includeMature={allowNSFW}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Thumbnail Generator Panel */}
      {selectedGenre && (selectedGenre === 'youtuber' || selectedGenre === 'onlyfans') && (
        <ThumbnailGeneratorPanel
          projectId={projectId}
          videoTitle={storyName || concept.slice(0, 50)}
          videoDescription={concept}
          archetype="vlogger"
          genre={selectedGenre === 'onlyfans' ? 'onlyfans' : 'youtuber'}
          isOpen={showThumbnailGenerator}
          onClose={() => setShowThumbnailGenerator(false)}
          onThumbnailGenerated={(result) => {
            console.log('Thumbnail generated:', result);
            // Could save to project elements here
          }}
        />
      )}
    </div>
  );
}

// Collapsible section component
interface CollapsibleSectionProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  isExpanded: boolean;
  onToggle: () => void;
  status: StageStatus['status'];
  children: React.ReactNode;
}

function CollapsibleSection({
  title,
  icon: Icon,
  isExpanded,
  onToggle,
  status,
  children,
}: CollapsibleSectionProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1a]">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-6 py-4 transition-colors hover:bg-white/5"
      >
        <div className="flex items-center gap-3">
          <Icon
            className={clsx(
              'h-5 w-5',
              status === 'complete' && 'text-green-400',
              status === 'in_progress' && 'text-blue-400',
              status === 'error' && 'text-red-400',
              status === 'pending' && 'text-gray-400'
            )}
          />
          <span className="font-bold text-white">{title}</span>
          {status === 'in_progress' && <Loader2 className="h-4 w-4 animate-spin text-blue-400" />}
          {status === 'complete' && <Check className="h-4 w-4 text-green-400" />}
        </div>
        {isExpanded ? (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronRight className="h-5 w-5 text-gray-400" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/10"
          >
            <div className="p-6">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
