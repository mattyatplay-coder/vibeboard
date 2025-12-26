/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
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
    Trash2
} from "lucide-react";
import { fetchAPI, BACKEND_URL } from "@/lib/api";
import { GenreSelector, GenrePills } from "@/components/storyboard/GenreSelector";
import { Genre, GENRE_TEMPLATES, getGenreTemplate } from "@/data/GenreTemplates";

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

// Pipeline stages
type PipelineStage = 'concept' | 'outline' | 'script' | 'breakdown' | 'prompts' | 'complete';

interface StageStatus {
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
    const [concept, setConcept] = useState("");
    const [uploadedScript, setUploadedScript] = useState(""); // For uploaded/pasted screenplay
    const [selectedGenre, setSelectedGenre] = useState<Genre | null>(null);
    const [style, setStyle] = useState("");
    const [pace, setPace] = useState<'slow' | 'medium' | 'fast'>('medium');
    const [targetDuration, setTargetDuration] = useState<string>(""); // User input (e.g., "5s", "2m", "90min")
    const [targetDurationSeconds, setTargetDurationSeconds] = useState<number | null>(null); // Parsed value
    const [allowNSFW, setAllowNSFW] = useState(false); // Allow NSFW content in prompts

    // Pipeline state
    const [currentStage, setCurrentStage] = useState<PipelineStage>('concept');
    const [stages, setStages] = useState<Record<PipelineStage, StageStatus>>({
        concept: { status: 'pending' },
        outline: { status: 'pending' },
        script: { status: 'pending' },
        breakdown: { status: 'pending' },
        prompts: { status: 'pending' },
        complete: { status: 'pending' }
    });

    // Results
    const [outline, setOutline] = useState<any>(null);
    const [script, setScript] = useState<string>("");
    const [scenes, setScenes] = useState<any[]>([]);
    const [prompts, setPrompts] = useState<any[]>([]);

    // UI state
    const [expandedSections, setExpandedSections] = useState<string[]>(['concept']);
    const [isRunning, setIsRunning] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Story save/load state
    const [currentStoryId, setCurrentStoryId] = useState<string | null>(null);
    const [storyName, setStoryName] = useState("");
    const [savedStories, setSavedStories] = useState<any[]>([]);
    const [showStoriesModal, setShowStoriesModal] = useState(false);
    const [loadingStories, setLoadingStories] = useState(false);

    // Character management state
    const [projectElements, setProjectElements] = useState<ProjectElement[]>([]);
    const [selectedCharacters, setSelectedCharacters] = useState<StoryCharacter[]>([]);
    const [showCharacterPicker, setShowCharacterPicker] = useState(false);
    const [loadingElements, setLoadingElements] = useState(false);

    // Progress tracking for long-running stages
    const [progressInfo, setProgressInfo] = useState<{
        stage: 'breakdown' | 'prompts' | null;
        current: number;
        total: number;
        sceneName?: string;
    } | null>(null);

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
                const characterElements = (elements || []).filter((e: ProjectElement) =>
                    e.type === 'character' ||
                    e.type === 'image' ||
                    e.metadata?.triggerWord
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

    const toggleSection = (section: string) => {
        setExpandedSections(prev =>
            prev.includes(section)
                ? prev.filter(s => s !== section)
                : [...prev, section]
        );
    };

    const updateStageStatus = (stage: PipelineStage, update: Partial<StageStatus>) => {
        setStages(prev => ({
            ...prev,
            [stage]: { ...prev[stage], ...update }
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
            role: 'supporting'
        };

        setSelectedCharacters(prev => [...prev, newCharacter]);
    };

    const removeCharacter = (elementId: string) => {
        setSelectedCharacters(prev => prev.filter(c => c.elementId !== elementId));
    };

    const updateCharacter = (elementId: string, updates: Partial<StoryCharacter>) => {
        setSelectedCharacters(prev => prev.map(c =>
            c.elementId === elementId ? { ...c, ...updates } : c
        ));
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
                status: prompts.length > 0 ? 'complete' : scenes.length > 0 ? 'breakdown' : script ? 'script' : outline ? 'outline' : 'draft'
            };

            let savedStory;
            if (currentStoryId) {
                // Update existing story
                savedStory = await fetchAPI(`/projects/${projectId}/stories/${currentStoryId}`, {
                    method: 'PATCH',
                    body: JSON.stringify(storyData)
                });
            } else {
                // Create new story
                savedStory = await fetchAPI(`/projects/${projectId}/stories`, {
                    method: 'POST',
                    body: JSON.stringify(storyData)
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
                method: 'DELETE'
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
            alert('Failed to delete story: ' + (error instanceof Error ? error.message : 'Unknown error'));
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
            complete: { status: 'pending' }
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

    // Run the full pipeline
    const runPipeline = async () => {
        if (!concept || !selectedGenre) {
            alert("Please enter a concept and select a genre");
            return;
        }

        setIsRunning(true);
        setCurrentStage('outline');

        try {
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
                    allowNSFW // Pass NSFW flag to skip content filtering
                })
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
                    allowNSFW
                })
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
                    scriptText: scriptResponse.script
                })
            });

            // Break down each scene
            const breakdowns = [];
            const totalScenes = parseResponse.scenes.length;
            console.log(`Breaking down ${totalScenes} scenes...`);

            for (let i = 0; i < totalScenes; i++) {
                // Update progress for UI feedback
                const sceneHeading = parseResponse.scenes[i];
                const sceneName = typeof sceneHeading === 'object'
                    ? sceneHeading?.location || `Scene ${i + 1}`
                    : (sceneHeading || `Scene ${i + 1}`);
                setProgressInfo({
                    stage: 'breakdown',
                    current: i + 1,
                    total: totalScenes,
                    sceneName: String(sceneName).slice(0, 40)
                });

                console.log(`Breaking down scene ${i + 1}:`, parseResponse.scenes[i]);

                const breakdownResponse = await fetchAPI('/story-editor/breakdown', {
                    method: 'POST',
                    body: JSON.stringify({
                        sceneNumber: i + 1,
                        heading: parseResponse.scenes[i],
                        sceneText: parseResponse.sceneTexts[i] || '',
                        genre: selectedGenre,
                        config: { pace, style, targetDuration: targetDurationSeconds, totalScenes, allowNSFW }
                    })
                });

                console.log(`Scene ${i + 1} breakdown result - suggestedShots:`, breakdownResponse.suggestedShots?.length || 0);
                breakdowns.push(breakdownResponse);
            }

            // Clear breakdown progress
            setProgressInfo(null);

            console.log(`Total breakdowns: ${breakdowns.length}, Total shots: ${breakdowns.reduce((sum: number, b: any) => sum + (b.suggestedShots?.length || 0), 0)}`);
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
                const sceneName = typeof sceneHeading === 'object'
                    ? sceneHeading?.location || `Scene ${i + 1}`
                    : (sceneHeading || `Scene ${i + 1}`);
                setProgressInfo({
                    stage: 'prompts',
                    current: i + 1,
                    total: totalBreakdowns,
                    sceneName: String(sceneName).slice(0, 40)
                });

                console.log(`Scene ${i + 1} breakdown:`, JSON.stringify(breakdown, null, 2).slice(0, 500));

                const heading = breakdown.heading || parseResponse.scenes[i];

                // Get shots from various possible keys
                let shotsToUse = breakdown.suggestedShots || breakdown.shots || breakdown.shot_list || breakdown.shotList || [];
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
                            // Include selected characters for prompt injection
                            characters: selectedCharacters.length > 0 ? selectedCharacters : undefined
                        })
                    });

                    console.log(`Scene ${i + 1} prompts response:`, Array.isArray(promptsResponse) ? `array of ${promptsResponse.length}` : typeof promptsResponse);

                    // Handle both array and object responses
                    if (Array.isArray(promptsResponse)) {
                        allPrompts.push(...promptsResponse);
                    } else if (promptsResponse && typeof promptsResponse === 'object') {
                        // Check if it's wrapped in a property
                        if (promptsResponse.prompts && Array.isArray(promptsResponse.prompts)) {
                            allPrompts.push(...promptsResponse.prompts);
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
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        } finally {
            setIsRunning(false);
            setProgressInfo(null); // Ensure progress is cleared
        }
    };

    // Run pipeline from an uploaded/pasted screenplay (skips outline and script generation)
    const runFromScript = async () => {
        if (!uploadedScript || !selectedGenre) {
            alert("Please paste a screenplay and select a genre");
            return;
        }

        setIsRunning(true);
        // Mark outline and script as skipped/complete
        updateStageStatus('outline', { status: 'complete', data: { skipped: true } });
        updateStageStatus('script', { status: 'complete', data: { script: uploadedScript } });
        setScript(uploadedScript);
        setCurrentStage('breakdown');

        try {
            // Stage 1: Parse the uploaded script
            updateStageStatus('breakdown', { status: 'in_progress' });
            setExpandedSections(['breakdown']);

            const parseResponse = await fetchAPI('/story-editor/parse', {
                method: 'POST',
                body: JSON.stringify({
                    scriptText: uploadedScript
                })
            });

            console.log(`Parsed ${parseResponse.scenes?.length || 0} scenes from uploaded script`);

            if (!parseResponse.scenes || parseResponse.scenes.length === 0) {
                throw new Error('No scenes found in the uploaded screenplay. Make sure it uses standard format (INT./EXT. LOCATION - TIME)');
            }

            // Break down each scene
            const breakdowns = [];
            const totalScenes = parseResponse.scenes.length;
            console.log(`Breaking down ${totalScenes} scenes...`);

            for (let i = 0; i < totalScenes; i++) {
                // Update progress for UI feedback
                const sceneHeading = parseResponse.scenes[i];
                const sceneName = typeof sceneHeading === 'object'
                    ? sceneHeading?.location || `Scene ${i + 1}`
                    : (sceneHeading || `Scene ${i + 1}`);
                setProgressInfo({
                    stage: 'breakdown',
                    current: i + 1,
                    total: totalScenes,
                    sceneName: String(sceneName).slice(0, 40)
                });

                console.log(`Breaking down scene ${i + 1}:`, parseResponse.scenes[i]);

                const breakdownResponse = await fetchAPI('/story-editor/breakdown', {
                    method: 'POST',
                    body: JSON.stringify({
                        sceneNumber: i + 1,
                        heading: parseResponse.scenes[i],
                        sceneText: parseResponse.sceneTexts[i] || '',
                        genre: selectedGenre,
                        config: { pace, style, targetDuration: targetDurationSeconds, totalScenes, allowNSFW }
                    })
                });

                console.log(`Scene ${i + 1} breakdown result - suggestedShots:`, breakdownResponse.suggestedShots?.length || 0);
                breakdowns.push(breakdownResponse);
            }

            // Clear breakdown progress
            setProgressInfo(null);

            console.log(`Total breakdowns: ${breakdowns.length}, Total shots: ${breakdowns.reduce((sum: number, b: any) => sum + (b.suggestedShots?.length || 0), 0)}`);
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
                const sceneName = typeof heading === 'object'
                    ? heading?.location || `Scene ${i + 1}`
                    : (heading || `Scene ${i + 1}`);
                setProgressInfo({
                    stage: 'prompts',
                    current: i + 1,
                    total: totalBreakdowns,
                    sceneName: String(sceneName).slice(0, 40)
                });

                // Get shots from various possible keys
                let shotsToUse = breakdown.suggestedShots || breakdown.shots || breakdown.shot_list || breakdown.shotList || [];
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
                            // Include selected characters for prompt injection
                            characters: selectedCharacters.length > 0 ? selectedCharacters : undefined
                        })
                    });

                    if (Array.isArray(promptsResponse)) {
                        allPrompts.push(...promptsResponse);
                    } else if (promptsResponse?.prompts && Array.isArray(promptsResponse.prompts)) {
                        allPrompts.push(...promptsResponse.prompts);
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
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        } finally {
            setIsRunning(false);
            setProgressInfo(null); // Ensure progress is cleared
        }
    };

    // Generate a single stage
    const generateOutline = async () => {
        if (!concept || !selectedGenre) return;

        updateStageStatus('outline', { status: 'in_progress' });
        try {
            const response = await fetchAPI('/story-editor/outline', {
                method: 'POST',
                body: JSON.stringify({
                    concept,
                    genre: selectedGenre,
                    numberOfActs: 3
                })
            });
            setOutline(response);
            updateStageStatus('outline', { status: 'complete', data: response });
            setExpandedSections(prev => [...prev, 'outline']);
        } catch (error) {
            updateStageStatus('outline', {
                status: 'error',
                error: error instanceof Error ? error.message : 'Failed to generate outline'
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
                    totalSeconds += shot.duration || 5; // Default 5 seconds per shot
                });
            });
        }

        return totalSeconds;
    };

    const runningLengthSeconds = calculateRunningLength();
    const runningLengthMinutes = Math.floor(runningLengthSeconds / 60);
    const runningLengthRemainder = runningLengthSeconds % 60;

    const formatRunningLength = () => {
        if (runningLengthSeconds === 0) return "0:00";
        if (runningLengthMinutes >= 60) {
            const hours = Math.floor(runningLengthMinutes / 60);
            const mins = runningLengthMinutes % 60;
            return `${hours}h ${mins}m ${runningLengthRemainder}s`;
        }
        return `${runningLengthMinutes}:${runningLengthRemainder.toString().padStart(2, '0')}`;
    };

    // Count total shots
    const totalShots = scenes.reduce((acc: number, scene: any) =>
        acc + (scene.suggestedShots?.length || 0), 0
    );

    // Save story to project and export to storyboard
    const saveAndExportToStoryboard = async () => {
        if (prompts.length === 0 || scenes.length === 0) {
            alert("Please generate a complete storyboard first");
            return;
        }

        if (!selectedGenre) {
            alert("Please select a genre before exporting");
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
                status: 'exported'
            };

            let savedStoryId = currentStoryId;
            if (currentStoryId) {
                // Update existing story
                await fetchAPI(`/projects/${projectId}/stories/${currentStoryId}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ ...storyData, exportedAt: new Date().toISOString() })
                });
            } else {
                // Create new story
                const savedStory = await fetchAPI(`/projects/${projectId}/stories`, {
                    method: 'POST',
                    body: JSON.stringify(storyData)
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
                        status: 'draft'
                    })
                });

                console.log(`Created scene chain: ${sceneName}`, sceneChain.id);

                // Get the prompts for this scene's shots
                const scenePrompts = prompts.filter((p: any) => {
                    // Match prompts by shot number range for this scene
                    const startShot = scenes.slice(0, i).reduce((acc: number, s: any) =>
                        acc + (s.suggestedShots?.length || 0), 0) + 1;
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
                                duration: shot.duration || 5,
                                orderIndex: j,
                                transitionType: 'smooth',
                                // Store additional metadata in the segment
                                sourceType: 'story-editor',
                                sourceId: savedStoryId
                            })
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
            alert('Failed to save storyboard: ' + (error instanceof Error ? error.message : 'Unknown error'));
        } finally {
            setIsSaving(false);
        }
    };

    // Navigate to storyboard page
    const goToStoryboard = () => {
        window.location.href = `/projects/${projectId}/storyboard`;
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-white p-8">
            {/* Header */}
            <div className="mb-8 flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                        <FileText className="w-8 h-8 text-blue-400" />
                        Story Editor
                        {currentStoryId && storyName && (
                            <span className="text-lg font-normal text-gray-400">
                                — {storyName}
                            </span>
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
                        className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 hover:bg-white/10 flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        New
                    </button>
                    <button
                        onClick={() => {
                            loadSavedStories();
                            setShowStoriesModal(true);
                        }}
                        className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 hover:bg-white/10 flex items-center gap-2"
                    >
                        <FolderOpen className="w-4 h-4" />
                        Open
                    </button>
                    <button
                        onClick={saveStory}
                        disabled={isSaving || !concept || !selectedGenre}
                        className={clsx(
                            "px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors",
                            saveSuccess
                                ? "bg-green-600 text-white"
                                : "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-600 disabled:text-gray-400"
                        )}
                    >
                        {isSaving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : saveSuccess ? (
                            <Check className="w-4 h-4" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        {saveSuccess ? 'Saved!' : currentStoryId ? 'Save' : 'Save As'}
                    </button>
                </div>
            </div>

            {/* Stories Modal */}
            <AnimatePresence>
                {showStoriesModal && (
                    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-8">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-[#1a1a1a] border border-white/10 rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
                        >
                            <div className="p-6 border-b border-white/10 flex items-center justify-between">
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <FolderOpen className="w-5 h-5 text-blue-400" />
                                    Saved Stories
                                </h2>
                                <button
                                    onClick={() => setShowStoriesModal(false)}
                                    className="p-2 hover:bg-white/10 rounded-lg"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto max-h-[60vh]">
                                {loadingStories ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                                    </div>
                                ) : savedStories.length === 0 ? (
                                    <div className="text-center py-12 text-gray-500">
                                        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                        <p>No saved stories yet</p>
                                        <p className="text-sm mt-2">Create a story and click Save to see it here</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {savedStories.map((story) => (
                                            <div
                                                key={story.id}
                                                className={clsx(
                                                    "p-4 border rounded-lg flex items-start justify-between gap-4 hover:bg-white/5 transition-colors",
                                                    currentStoryId === story.id
                                                        ? "border-blue-500/50 bg-blue-500/10"
                                                        : "border-white/10"
                                                )}
                                            >
                                                <div
                                                    className="flex-1 cursor-pointer"
                                                    onClick={() => loadStory(story.id)}
                                                >
                                                    <h3 className="font-medium flex items-center gap-2">
                                                        {story.name}
                                                        <span className="text-xs px-2 py-0.5 bg-white/10 rounded-full text-gray-400">
                                                            {story.genre}
                                                        </span>
                                                        {story.allowNSFW && (
                                                            <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full">
                                                                NSFW
                                                            </span>
                                                        )}
                                                    </h3>
                                                    <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                                                        {story.concept}
                                                    </p>
                                                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                                        <span>Status: {story.status}</span>
                                                        <span>Updated: {new Date(story.updatedAt).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteStory(story.id);
                                                    }}
                                                    className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                                                >
                                                    <Trash2 className="w-4 h-4" />
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Input */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Input Mode Toggle + Input */}
                    <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6">
                        {/* Mode Toggle */}
                        <div className="flex gap-2 mb-4">
                            <button
                                onClick={() => setInputMode('concept')}
                                className={clsx(
                                    "flex-1 px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors",
                                    inputMode === 'concept'
                                        ? "bg-blue-600 text-white"
                                        : "bg-white/5 text-gray-400 hover:bg-white/10"
                                )}
                            >
                                <Lightbulb className="w-4 h-4" />
                                From Concept
                            </button>
                            <button
                                onClick={() => setInputMode('script')}
                                className={clsx(
                                    "flex-1 px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors",
                                    inputMode === 'script'
                                        ? "bg-purple-600 text-white"
                                        : "bg-white/5 text-gray-400 hover:bg-white/10"
                                )}
                            >
                                <Upload className="w-4 h-4" />
                                Upload Script
                            </button>
                        </div>

                        {/* Concept Mode */}
                        {inputMode === 'concept' && (
                            <>
                                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                    <Lightbulb className="w-5 h-5 text-yellow-400" />
                                    Story Concept
                                </h2>

                                <textarea
                                    value={concept}
                                    onChange={(e) => setConcept(e.target.value)}
                                    placeholder="Describe your story concept...

Example: A noir detective in 1940s LA investigates the disappearance of a jazz singer, only to discover she faked her own death to escape a dangerous criminal syndicate."
                                    className="w-full h-40 bg-black/50 border border-white/10 rounded-lg p-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 resize-none"
                                />
                            </>
                        )}

                        {/* Script Upload Mode */}
                        {inputMode === 'script' && (
                            <>
                                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                    <PenTool className="w-5 h-5 text-purple-400" />
                                    Upload Screenplay
                                </h2>

                                <textarea
                                    value={uploadedScript}
                                    onChange={(e) => setUploadedScript(e.target.value)}
                                    placeholder="Paste your screenplay here...

Use standard screenplay format with scene headings like:
INT. COFFEE SHOP - DAY
EXT. CITY STREET - NIGHT

The parser will automatically detect scenes and break them down into shots."
                                    className="w-full h-64 bg-black/50 border border-white/10 rounded-lg p-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 resize-none font-mono"
                                />

                                <p className="text-xs text-gray-500 mt-2">
                                    {uploadedScript.length > 0 && (
                                        <span className="text-purple-400">{uploadedScript.length.toLocaleString()} characters</span>
                                    )}
                                    {uploadedScript.length === 0 && "Paste or type your screenplay above"}
                                </p>
                            </>
                        )}

                        <div className="mt-4">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">
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
                            <div className="mt-4 p-4 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xl">{genreTemplate.icon}</span>
                                    <span className="font-bold text-sm">{genreTemplate.name}</span>
                                </div>
                                <p className="text-xs text-gray-400 mb-2">{genreTemplate.description}</p>
                                <p className="text-xs text-blue-300 italic">"{genreTemplate.defaultStyle}"</p>
                            </div>
                        )}

                        {/* Advanced Options */}
                        <div className="mt-4 space-y-3">
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">
                                    Visual Style (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={style}
                                    onChange={(e) => setStyle(e.target.value)}
                                    placeholder="e.g., Blade Runner aesthetic, Wes Anderson colors..."
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">
                                    Target Duration (Optional)
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={targetDuration}
                                        onChange={(e) => handleDurationChange(e.target.value)}
                                        placeholder="e.g., 5s, 2m, 90min, 1h30m, 1:30"
                                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50"
                                    />
                                    {targetDurationSeconds !== null && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-green-400">
                                            = {formatTargetDuration(targetDurationSeconds)}
                                        </div>
                                    )}
                                </div>
                                <p className="text-[10px] text-gray-600 mt-1">
                                    Leave empty for auto-calculated duration based on content
                                </p>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">
                                    Pacing
                                </label>
                                <div className="flex gap-2">
                                    {(['slow', 'medium', 'fast'] as const).map((p) => (
                                        <button
                                            key={p}
                                            onClick={() => setPace(p)}
                                            className={clsx(
                                                "flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                                                pace === p
                                                    ? "bg-blue-500 text-white"
                                                    : "bg-white/5 text-gray-400 hover:bg-white/10"
                                            )}
                                        >
                                            {p.charAt(0).toUpperCase() + p.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Character Selector */}
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">
                                    Characters (Optional)
                                </label>

                                {/* Selected Characters */}
                                {selectedCharacters.length > 0 && (
                                    <div className="space-y-2 mb-3">
                                        {selectedCharacters.map(char => (
                                            <div
                                                key={char.elementId}
                                                className="flex items-center gap-3 p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg"
                                            >
                                                {/* Thumbnail */}
                                                {char.referenceImageUrl && (
                                                    <img
                                                        src={char.referenceImageUrl}
                                                        alt={char.name}
                                                        className="w-10 h-10 rounded object-cover"
                                                    />
                                                )}

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-sm text-white truncate">
                                                            {char.name}
                                                        </span>
                                                        {char.triggerWord && (
                                                            <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded text-[10px] font-mono">
                                                                {char.triggerWord}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Role selector */}
                                                    <select
                                                        value={char.role || 'supporting'}
                                                        onChange={(e) => updateCharacter(char.elementId!, { role: e.target.value as StoryCharacter['role'] })}
                                                        className="mt-1 w-full bg-black/50 border border-white/10 rounded px-2 py-1 text-[10px] text-gray-300"
                                                    >
                                                        <option value="protagonist">Protagonist</option>
                                                        <option value="antagonist">Antagonist</option>
                                                        <option value="supporting">Supporting</option>
                                                        <option value="minor">Minor</option>
                                                    </select>
                                                </div>

                                                <button
                                                    onClick={() => removeCharacter(char.elementId!)}
                                                    className="p-1 hover:bg-red-500/20 rounded text-gray-400 hover:text-red-400 transition-colors"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Add Character Button */}
                                <button
                                    onClick={() => setShowCharacterPicker(!showCharacterPicker)}
                                    className="w-full px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-gray-400 hover:text-white flex items-center justify-center gap-2 transition-colors"
                                >
                                    {showCharacterPicker ? (
                                        <>
                                            <X className="w-4 h-4" />
                                            Close Picker
                                        </>
                                    ) : (
                                        <>
                                            <Users className="w-4 h-4" />
                                            Add Characters from Library
                                        </>
                                    )}
                                </button>

                                {/* Character Picker Panel */}
                                {showCharacterPicker && (
                                    <div className="mt-2 p-3 bg-black/50 border border-white/10 rounded-lg max-h-48 overflow-y-auto">
                                        {loadingElements ? (
                                            <div className="flex items-center justify-center py-4">
                                                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                                            </div>
                                        ) : projectElements.length === 0 ? (
                                            <div className="text-center py-4">
                                                <p className="text-xs text-gray-500">
                                                    No character/image elements in this project yet.
                                                </p>
                                                <p className="text-[10px] text-gray-600 mt-1">
                                                    Add images to your library on the Generate page first.
                                                </p>
                                                <p className="text-[10px] text-gray-700 mt-2 font-mono">
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
                                                            className="w-full flex items-center gap-3 p-2 hover:bg-white/10 rounded-lg transition-colors"
                                                        >
                                                            {(element.url || element.fileUrl || element.thumbnail) && (
                                                                <img
                                                                    src={element.url || element.fileUrl || element.thumbnail}
                                                                    alt={element.name}
                                                                    className="w-8 h-8 rounded object-cover"
                                                                />
                                                            )}
                                                            <div className="flex-1 text-left">
                                                                <span className="text-sm text-white">{element.name}</span>
                                                                {element.metadata?.triggerWord && (
                                                                    <span className="ml-2 text-[10px] text-amber-400 font-mono">
                                                                        {element.metadata.triggerWord}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <Plus className="w-4 h-4 text-gray-500" />
                                                        </button>
                                                    ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <p className="text-[10px] text-gray-600 mt-1">
                                    Link story characters to Elements for consistent prompt injection
                                </p>
                            </div>

                            {/* NSFW Toggle */}
                            <div className="pt-2 border-t border-white/5">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            checked={allowNSFW}
                                            onChange={(e) => setAllowNSFW(e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-500/50 peer-checked:after:bg-red-400"></div>
                                    </div>
                                    <div>
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider group-hover:text-gray-300">
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
                                    <button
                                        onClick={runPipeline}
                                        disabled={!concept || !selectedGenre || isRunning}
                                        className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-gray-700 disabled:to-gray-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
                                    >
                                        {isRunning ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Generating...
                                            </>
                                        ) : (
                                            <>
                                                <Wand2 className="w-5 h-5" />
                                                Generate Full Storyboard
                                            </>
                                        )}
                                    </button>

                                    <button
                                        onClick={generateOutline}
                                        disabled={!concept || !selectedGenre || isRunning}
                                        className="w-full px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                                    >
                                        <Sparkles className="w-4 h-4" />
                                        Generate Outline Only
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={runFromScript}
                                    disabled={!uploadedScript || !selectedGenre || isRunning}
                                    className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-gray-700 disabled:to-gray-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
                                >
                                    {isRunning ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Processing Script...
                                        </>
                                    ) : (
                                        <>
                                            <Film className="w-5 h-5" />
                                            Generate Shots & Prompts
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Pipeline Status */}
                    <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6">
                        <h2 className="text-lg font-bold mb-4">Pipeline Status</h2>

                        <div className="space-y-3">
                            {[
                                { key: 'concept', label: 'Concept', icon: Lightbulb },
                                { key: 'outline', label: 'Outline', icon: BookOpen },
                                { key: 'script', label: 'Script', icon: FileText },
                                { key: 'breakdown', label: 'Scene Breakdown', icon: Film },
                                { key: 'prompts', label: 'Shot Prompts', icon: Camera },
                                { key: 'complete', label: 'Complete', icon: Check }
                            ].map(({ key, label, icon: Icon }) => {
                                const stage = stages[key as PipelineStage];
                                return (
                                    <div
                                        key={key}
                                        className={clsx(
                                            "flex items-center gap-3 p-3 rounded-lg transition-colors",
                                            stage.status === 'in_progress' && "bg-blue-500/10 border border-blue-500/30",
                                            stage.status === 'complete' && "bg-green-500/10 border border-green-500/30",
                                            stage.status === 'error' && "bg-red-500/10 border border-red-500/30",
                                            stage.status === 'pending' && "bg-white/5"
                                        )}
                                    >
                                        <div className={clsx(
                                            "w-8 h-8 rounded-full flex items-center justify-center",
                                            stage.status === 'in_progress' && "bg-blue-500/20 text-blue-400",
                                            stage.status === 'complete' && "bg-green-500/20 text-green-400",
                                            stage.status === 'error' && "bg-red-500/20 text-red-400",
                                            stage.status === 'pending' && "bg-white/10 text-gray-500"
                                        )}>
                                            {stage.status === 'in_progress' ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : stage.status === 'complete' ? (
                                                <Check className="w-4 h-4" />
                                            ) : stage.status === 'error' ? (
                                                <AlertCircle className="w-4 h-4" />
                                            ) : (
                                                <Icon className="w-4 h-4" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <span className={clsx(
                                                "text-sm font-medium",
                                                stage.status === 'complete' && "text-green-400",
                                                stage.status === 'error' && "text-red-400",
                                                stage.status === 'in_progress' && "text-blue-400",
                                                stage.status === 'pending' && "text-gray-500"
                                            )}>
                                                {label}
                                            </span>
                                            {/* Show per-scene progress for breakdown and prompts stages */}
                                            {stage.status === 'in_progress' && progressInfo && progressInfo.stage === key && (
                                                <div className="mt-1.5">
                                                    <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                                                        <span className="truncate max-w-[100px]">{progressInfo.sceneName}</span>
                                                        <span className="font-mono">{progressInfo.current}/{progressInfo.total}</span>
                                                    </div>
                                                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300 ease-out"
                                                            style={{ width: `${(progressInfo.current / progressInfo.total) * 100}%` }}
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
                            <div className="mt-4 pt-4 border-t border-white/10">
                                <div className="flex items-center gap-2 mb-3">
                                    <Clock className="w-4 h-4 text-purple-400" />
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                        Running Length
                                    </span>
                                </div>

                                <div className="text-center p-4 bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg">
                                    <div className="text-3xl font-bold text-white mb-1">
                                        {formatRunningLength()}
                                    </div>
                                    <div className="text-xs text-gray-400">
                                        {scenes.length > 0 ? (
                                            <>
                                                {scenes.length} scene{scenes.length !== 1 ? 's' : ''} &bull; {totalShots} shot{totalShots !== 1 ? 's' : ''}
                                            </>
                                        ) : outline?.acts ? (
                                            <>
                                                {outline.acts.reduce((acc: number, act: any) => acc + (act.beats?.length || 0), 0)} beats
                                            </>
                                        ) : null}
                                    </div>
                                </div>

                                {/* Per-scene breakdown */}
                                {scenes.length > 0 && (
                                    <div className="mt-3 space-y-1">
                                        {scenes.map((scene: any, i: number) => {
                                            const sceneDuration = scene.suggestedShots?.reduce(
                                                (acc: number, shot: any) => acc + (shot.duration || 5), 0
                                            ) || 0;
                                            const sceneMins = Math.floor(sceneDuration / 60);
                                            const sceneSecs = sceneDuration % 60;
                                            return (
                                                <div key={i} className="flex items-center justify-between text-xs">
                                                    <span className="text-gray-500 truncate max-w-[140px]">
                                                        Scene {scene.sceneNumber}
                                                    </span>
                                                    <span className="text-gray-400 font-mono">
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
                <div className="lg:col-span-2 space-y-4">
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
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Characters</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {outline.characters.map((char: any, i: number) => (
                                                <span
                                                    key={i}
                                                    className={clsx(
                                                        "px-3 py-1 rounded-full text-xs font-medium",
                                                        char.role === 'protagonist' && "bg-blue-500/20 text-blue-300",
                                                        char.role === 'antagonist' && "bg-red-500/20 text-red-300",
                                                        char.role === 'supporting' && "bg-purple-500/20 text-purple-300",
                                                        char.role === 'minor' && "bg-gray-500/20 text-gray-300"
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
                                    <div key={i} className="bg-black/30 rounded-lg p-4">
                                        <h4 className="font-bold text-white mb-2">
                                            Act {act.number}: {act.name}
                                        </h4>
                                        <p className="text-sm text-gray-400 mb-3">{act.description}</p>

                                        <div className="space-y-2">
                                            {act.beats?.map((beat: any, j: number) => (
                                                <div key={j} className="flex items-start gap-2 text-xs">
                                                    <span className={clsx(
                                                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                                        beat.emotionalTone === 'tension' && "bg-red-500/20 text-red-300",
                                                        beat.emotionalTone === 'release' && "bg-green-500/20 text-green-300",
                                                        beat.emotionalTone === 'joy' && "bg-yellow-500/20 text-yellow-300",
                                                        beat.emotionalTone === 'sadness' && "bg-blue-500/20 text-blue-300",
                                                        !beat.emotionalTone && "bg-gray-500/20 text-gray-300"
                                                    )}>
                                                        {beat.type.replace(/_/g, ' ')}
                                                    </span>
                                                    <span className="text-gray-300 flex-1">{beat.description}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}

                                {/* Themes */}
                                {outline.themes?.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Themes</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {outline.themes.map((theme: string, i: number) => (
                                                <span key={i} className="px-2 py-1 bg-white/5 rounded text-xs text-gray-300">
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
                            <pre className="whitespace-pre-wrap text-xs text-gray-300 font-mono bg-black/30 rounded-lg p-4 max-h-96 overflow-y-auto">
                                {script}
                            </pre>
                        </CollapsibleSection>
                    )}

                    {/* Scene Breakdown Section - Each scene gets its own collapsible */}
                    {scenes.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 px-2 py-1">
                                <Film className="w-4 h-4 text-blue-400" />
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
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
                                            <span className={clsx(
                                                "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                                scene.emotionalBeat === 'tension' && "bg-red-500/20 text-red-300",
                                                scene.emotionalBeat === 'release' && "bg-green-500/20 text-green-300",
                                                "bg-gray-500/20 text-gray-300"
                                            )}>
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
                                        <div className="space-y-2 pt-2 border-t border-white/10">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase">
                                                Shots
                                            </span>
                                            {scene.suggestedShots?.map((shot: any, j: number) => (
                                                <div key={j} className="flex items-start gap-2 p-2 bg-white/5 rounded text-xs">
                                                    <span className="text-blue-400 font-bold">{shot.shotNumber}.</span>
                                                    <div className="flex-1">
                                                        <p className="text-gray-300">{shot.description}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="px-1.5 py-0.5 bg-green-500/20 text-green-300 rounded text-[10px]">
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
                                <Camera className="w-4 h-4 text-purple-400" />
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
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
                                        <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                                            {prompt.duration && (
                                                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded text-[10px] font-bold">
                                                    {prompt.duration}s
                                                </span>
                                            )}
                                            {prompt.cameraDescription && (
                                                <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded text-[10px]">
                                                    {prompt.cameraDescription}
                                                </span>
                                            )}
                                            {prompt.style && (
                                                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded text-[10px]">
                                                    {prompt.style}
                                                </span>
                                            )}
                                        </div>

                                        {/* FIRST FRAME - IMAGE PROMPT */}
                                        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                                                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                                                    First Frame - Image Prompt
                                                </span>
                                            </div>
                                            <p className="text-sm text-emerald-200/90 font-mono leading-relaxed whitespace-pre-wrap">
                                                {prompt.firstFramePrompt || prompt.prompt || 'No first frame prompt generated'}
                                            </p>
                                        </div>

                                        {/* LAST FRAME - IMAGE PROMPT */}
                                        <div className="bg-violet-500/5 border border-violet-500/20 rounded-lg p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-2 h-2 rounded-full bg-violet-400"></div>
                                                <span className="text-xs font-bold text-violet-400 uppercase tracking-wider">
                                                    Last Frame - Image Prompt
                                                </span>
                                            </div>
                                            <p className="text-sm text-violet-200/90 font-mono leading-relaxed whitespace-pre-wrap">
                                                {prompt.lastFramePrompt || 'No last frame prompt generated'}
                                            </p>
                                        </div>

                                        {/* VIDEO PROMPT (First Frame → Last Frame) */}
                                        <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
                                                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                                                    Video Prompt (First Frame → Last Frame)
                                                </span>
                                            </div>
                                            <p className="text-sm text-cyan-200/90 font-mono leading-relaxed whitespace-pre-wrap">
                                                {prompt.videoPrompt || 'No video prompt generated'}
                                            </p>
                                        </div>

                                        {/* Negative Prompt (collapsed) */}
                                        {prompt.negativePrompt && (
                                            <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                                                <span className="text-[10px] font-bold text-red-400 uppercase mb-1 block">
                                                    Negative Prompt
                                                </span>
                                                <p className="text-xs text-red-300/70 font-mono">
                                                    {prompt.negativePrompt}
                                                </p>
                                            </div>
                                        )}

                                        {/* Camera Move */}
                                        {prompt.cameraMove && (
                                            <div className="text-xs text-gray-500 pt-2 border-t border-white/5">
                                                <span className="font-bold">Camera:</span> {prompt.cameraMove}
                                            </div>
                                        )}
                                    </div>
                                </CollapsibleSection>
                            ))}

                            {/* Export to Storyboard */}
                            <div className="mt-4 p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg">
                                <p className="text-sm text-gray-300 mb-3">
                                    Ready to generate images and videos from these prompts?
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={saveAndExportToStoryboard}
                                        disabled={isSaving}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                                    >
                                        {isSaving ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Saving...
                                            </>
                                        ) : saveSuccess ? (
                                            <>
                                                <Check className="w-4 h-4" />
                                                Saved!
                                            </>
                                        ) : (
                                            <>
                                                <Play className="w-4 h-4" />
                                                Save & Export to Storyboard
                                            </>
                                        )}
                                    </button>
                                    {saveSuccess && (
                                        <button
                                            onClick={goToStoryboard}
                                            className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                            Go to Storyboard
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Empty State */}
                    {!outline && !script && scenes.length === 0 && (
                        <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-12 text-center">
                            <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-gray-400 mb-2">No Story Yet</h3>
                            <p className="text-gray-600 mb-6">
                                Enter a concept and select a genre to begin generating your screenplay and storyboard.
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
    children
}: CollapsibleSectionProps) {
    return (
        <div className="bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden">
            <button
                onClick={onToggle}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <Icon className={clsx(
                        "w-5 h-5",
                        status === 'complete' && "text-green-400",
                        status === 'in_progress' && "text-blue-400",
                        status === 'error' && "text-red-400",
                        status === 'pending' && "text-gray-400"
                    )} />
                    <span className="font-bold text-white">{title}</span>
                    {status === 'in_progress' && (
                        <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                    )}
                    {status === 'complete' && (
                        <Check className="w-4 h-4 text-green-400" />
                    )}
                </div>
                {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                )}
            </button>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-white/10"
                    >
                        <div className="p-6">
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
