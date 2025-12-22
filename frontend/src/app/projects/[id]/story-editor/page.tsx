/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import { fetchAPI } from '@/lib/api';
import { GenreSelector, GenrePills } from '@/components/storyboard/GenreSelector';
import { Genre, GENRE_TEMPLATES, getGenreTemplate } from '@/data/GenreTemplates';

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
  const [concept, setConcept] = useState('');
  const [uploadedScript, setUploadedScript] = useState(''); // For uploaded/pasted screenplay
  const [selectedGenre, setSelectedGenre] = useState<Genre | null>(null);
  const [style, setStyle] = useState('');
  const [pace, setPace] = useState<'slow' | 'medium' | 'fast'>('medium');
  const [targetDuration, setTargetDuration] = useState<string>(''); // User input (e.g., "5s", "2m", "90min")
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
      alert('Please enter a concept and select a genre');
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
      console.log(`Breaking down ${parseResponse.scenes.length} scenes...`);

      for (let i = 0; i < parseResponse.scenes.length; i++) {
        console.log(`Breaking down scene ${i + 1}:`, parseResponse.scenes[i]);

        const breakdownResponse = await fetchAPI('/story-editor/breakdown', {
          method: 'POST',
          body: JSON.stringify({
            sceneNumber: i + 1,
            heading: parseResponse.scenes[i],
            sceneText: parseResponse.sceneTexts[i] || '',
            genre: selectedGenre,
            config: {
              pace,
              style,
              targetDuration: targetDurationSeconds,
              totalScenes: parseResponse.scenes.length,
              allowNSFW,
            },
          }),
        });

        console.log(
          `Scene ${i + 1} breakdown result - suggestedShots:`,
          breakdownResponse.suggestedShots?.length || 0
        );
        breakdowns.push(breakdownResponse);
      }

      console.log(
        `Total breakdowns: ${breakdowns.length}, Total shots: ${breakdowns.reduce((sum: number, b: any) => sum + (b.suggestedShots?.length || 0), 0)}`
      );
      setScenes(breakdowns);
      updateStageStatus('breakdown', { status: 'complete', data: breakdowns });

      // Stage 4: Generate Prompts
      setCurrentStage('prompts');
      updateStageStatus('prompts', { status: 'in_progress' });
      setExpandedSections(['prompts']);

      const allPrompts: any[] = [];
      console.log(`Starting prompt generation for ${breakdowns.length} scene breakdowns`);

      for (let i = 0; i < breakdowns.length; i++) {
        const breakdown = breakdowns[i];
        console.log(`Scene ${i + 1} breakdown:`, JSON.stringify(breakdown, null, 2).slice(0, 500));

        const shots = breakdown.suggestedShots || [];
        const heading = breakdown.heading || parseResponse.scenes[i];

        console.log(`Scene ${i + 1}: ${shots.length} shots, heading:`, heading);

        if (shots.length === 0) {
          console.warn(
            `Scene ${i + 1} has no suggestedShots array, checking for alternate keys...`
          );
          // Check for alternate shot array keys the LLM might use
          const altShots = breakdown.shots || breakdown.shot_list || breakdown.shotList || [];
          if (altShots.length > 0) {
            console.log(`Found ${altShots.length} shots under alternate key`);
            breakdown.suggestedShots = altShots;
          } else {
            console.warn(`Scene ${i + 1} truly has no shots, skipping`);
            continue;
          }
        }

        const shotsToUse = breakdown.suggestedShots || [];
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
            }),
          });

          console.log(
            `Scene ${i + 1} prompts response:`,
            Array.isArray(promptsResponse)
              ? `array of ${promptsResponse.length}`
              : typeof promptsResponse
          );

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

      console.log(`Generated ${allPrompts.length} total prompts`);

      if (allPrompts.length === 0) {
        console.error('No prompts were generated - check console for scene breakdown details');
      }

      setPrompts(allPrompts);
      updateStageStatus('prompts', { status: 'complete', data: allPrompts });

      // Complete!
      setCurrentStage('complete');
      updateStageStatus('complete', { status: 'complete' });
      setExpandedSections(['prompts', 'complete']);
    } catch (error) {
      console.error('Pipeline error:', error);
      updateStageStatus(currentStage, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsRunning(false);
    }
  };

  // Run pipeline from an uploaded/pasted screenplay (skips outline and script generation)
  const runFromScript = async () => {
    if (!uploadedScript || !selectedGenre) {
      alert('Please paste a screenplay and select a genre');
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
      console.log(`Breaking down ${parseResponse.scenes.length} scenes...`);

      for (let i = 0; i < parseResponse.scenes.length; i++) {
        console.log(`Breaking down scene ${i + 1}:`, parseResponse.scenes[i]);

        const breakdownResponse = await fetchAPI('/story-editor/breakdown', {
          method: 'POST',
          body: JSON.stringify({
            sceneNumber: i + 1,
            heading: parseResponse.scenes[i],
            sceneText: parseResponse.sceneTexts[i] || '',
            genre: selectedGenre,
            config: {
              pace,
              style,
              targetDuration: targetDurationSeconds,
              totalScenes: parseResponse.scenes.length,
              allowNSFW,
            },
          }),
        });

        console.log(
          `Scene ${i + 1} breakdown result - suggestedShots:`,
          breakdownResponse.suggestedShots?.length || 0
        );
        breakdowns.push(breakdownResponse);
      }

      console.log(
        `Total breakdowns: ${breakdowns.length}, Total shots: ${breakdowns.reduce((sum: number, b: any) => sum + (b.suggestedShots?.length || 0), 0)}`
      );
      setScenes(breakdowns);
      updateStageStatus('breakdown', { status: 'complete', data: breakdowns });

      // Stage 2: Generate Prompts
      setCurrentStage('prompts');
      updateStageStatus('prompts', { status: 'in_progress' });
      setExpandedSections(['prompts']);

      const allPrompts: any[] = [];
      console.log(`Starting prompt generation for ${breakdowns.length} scene breakdowns`);

      for (let i = 0; i < breakdowns.length; i++) {
        const breakdown = breakdowns[i];
        const shots = breakdown.suggestedShots || [];
        const heading = breakdown.heading || parseResponse.scenes[i];

        if (shots.length === 0) {
          const altShots = breakdown.shots || breakdown.shot_list || breakdown.shotList || [];
          if (altShots.length > 0) {
            breakdown.suggestedShots = altShots;
          } else {
            console.warn(`Scene ${i + 1} has no shots, skipping`);
            continue;
          }
        }

        const shotsToUse = breakdown.suggestedShots || [];
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
            }),
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

      console.log(`Generated ${allPrompts.length} total prompts`);
      setPrompts(allPrompts);
      updateStageStatus('prompts', { status: 'complete', data: allPrompts });

      // Complete!
      setCurrentStage('complete');
      updateStageStatus('complete', { status: 'complete' });
      setExpandedSections(['prompts', 'complete']);
    } catch (error) {
      console.error('Pipeline error:', error);
      updateStageStatus(currentStage, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsRunning(false);
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

  // Save story to project and export to storyboard
  const saveAndExportToStoryboard = async () => {
    if (prompts.length === 0 || scenes.length === 0) {
      alert('Please generate a complete storyboard first');
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      // Create a scene for each scene breakdown
      for (let i = 0; i < scenes.length; i++) {
        const sceneBreakdown = scenes[i];
        const sceneName = sceneBreakdown.heading
          ? `${sceneBreakdown.heading.intExt}. ${sceneBreakdown.heading.location} - ${sceneBreakdown.heading.timeOfDay}`
          : `Scene ${i + 1}`;

        // Create the scene
        const newScene = await fetchAPI(`/projects/${projectId}/scenes`, {
          method: 'POST',
          body: JSON.stringify({
            name: sceneName,
            description: sceneBreakdown.description || '',
          }),
        });

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

        // Create generations for each shot in this scene
        for (let j = 0; j < (sceneBreakdown.suggestedShots?.length || 0); j++) {
          const shot = sceneBreakdown.suggestedShots[j];
          const promptData = scenePrompts[j] || prompts[j];

          if (promptData) {
            // Create a generation record for this shot
            const generation = await fetchAPI(`/projects/${projectId}/generations`, {
              method: 'POST',
              body: JSON.stringify({
                mode: 'text_to_image',
                inputPrompt: promptData.prompt,
                negativePrompt: promptData.negativePrompt,
                shotType: shot.cameraPresetId,
                cameraAngle: shot.cameraDescription,
                lighting: shot.lighting,
                status: 'draft', // Not generated yet, just saved
                name: `Shot ${shot.shotNumber}: ${shot.description?.slice(0, 50) || 'Untitled'}`,
                tags: [selectedGenre || '', promptData.cameraMove].filter(Boolean),
              }),
            });

            // Add shot to scene
            await fetchAPI(`/projects/${projectId}/scenes/${newScene.id}/shots`, {
              method: 'POST',
              body: JSON.stringify({
                generationId: generation.id,
                index: j + 1,
                notes: shot.description,
              }),
            });
          }
        }
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
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
    <div className="min-h-screen bg-black p-8 text-white">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-2 flex items-center gap-3 text-3xl font-bold">
          <FileText className="h-8 w-8 text-blue-400" />
          Story Editor
        </h1>
        <p className="text-gray-400">
          Transform concepts into complete storyboards with AI-powered screenplay generation
        </p>
      </div>

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
                        Generate Full Storyboard
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
                          (acc: number, shot: any) => acc + (shot.duration || 5),
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
            </CollapsibleSection>
          )}

          {/* Scene Breakdown Section */}
          {scenes.length > 0 && (
            <CollapsibleSection
              title={`Scene Breakdown (${scenes.length} scenes)`}
              icon={Film}
              isExpanded={expandedSections.includes('breakdown')}
              onToggle={() => toggleSection('breakdown')}
              status={stages.breakdown.status}
            >
              <div className="space-y-4">
                {scenes.map((scene, i) => (
                  <div key={i} className="rounded-lg bg-black/30 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className="font-bold text-white">
                        Scene {scene.sceneNumber}: {scene.heading?.intExt}.{' '}
                        {scene.heading?.location}
                      </h4>
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
                    </div>

                    <p className="mb-3 text-sm text-gray-400">{scene.description}</p>

                    {scene.characters?.length > 0 && (
                      <div className="mb-3">
                        <span className="text-[10px] text-gray-500">Characters: </span>
                        <span className="text-xs text-gray-300">{scene.characters.join(', ')}</span>
                      </div>
                    )}

                    {/* Shots */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-gray-500 uppercase">
                        Shots ({scene.suggestedShots?.length || 0})
                      </span>
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
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Prompts Section */}
          {prompts.length > 0 && (
            <CollapsibleSection
              title={`Generation Prompts (${prompts.length} shots)`}
              icon={Camera}
              isExpanded={expandedSections.includes('prompts')}
              onToggle={() => toggleSection('prompts')}
              status={stages.prompts.status}
            >
              <div className="space-y-3">
                {prompts.map((prompt, i) => (
                  <div key={i} className="rounded-lg bg-black/30 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-bold text-white">Shot {prompt.shotNumber}</span>
                      <span className="rounded bg-purple-500/20 px-2 py-0.5 text-[10px] text-purple-300">
                        {prompt.cameraMove}
                      </span>
                    </div>
                    <p className="mb-2 rounded bg-green-500/10 p-2 text-xs text-green-300">
                      {prompt.prompt}
                    </p>
                    <p className="text-[10px] text-red-300/60">Negative: {prompt.negativePrompt}</p>
                  </div>
                ))}
              </div>

              {/* Export to Storyboard */}
              <div className="mt-4 rounded-lg border border-blue-500/20 bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-4">
                <p className="mb-3 text-sm text-gray-300">
                  Ready to generate images and videos from these prompts?
                </p>
                <div className="flex gap-2">
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
                </div>
              </div>
            </CollapsibleSection>
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
