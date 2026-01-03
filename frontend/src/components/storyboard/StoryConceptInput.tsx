'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Film, Sparkles, ChevronDown, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

import { Genre } from '@/data/CameraPresets';
import {
  GENRE_TEMPLATES,
  getGroupedGenreOptions,
  isContentGenre,
  isRestrictedGenre,
} from '@/data/GenreTemplates';
import {
  YOUTUBE_ARCHETYPES,
  ADULT_ARCHETYPES,
  getArchetypesForGenre,
  getDefaultArchetype,
} from '@/data/CreatorArchetypes';
import { CreatorControls } from './modules/CreatorControls';

interface StoryConceptInputProps {
  onSubmit?: (data: StoryConceptData) => void;
  isLoading?: boolean;
  initialGenre?: Genre;
  initialConcept?: string;
}

export interface StoryConceptData {
  genre: Genre;
  genreType: 'narrative' | 'content';
  concept: string;
  // Narrative-specific
  visualStyle?: string;
  // Content-specific
  archetype?: string;
  hook?: string;
  styleHint?: string;
}

export const StoryConceptInput = ({
  onSubmit,
  isLoading = false,
  initialGenre,
  initialConcept = '',
}: StoryConceptInputProps) => {
  // State
  const [isMature, setIsMature] = useState(false);
  const [selectedGenreId, setSelectedGenreId] = useState<Genre | ''>(initialGenre || '');
  const [concept, setConcept] = useState(initialConcept);

  // Content creator state
  const [archetype, setArchetype] = useState<string>('');
  const [hook, setHook] = useState('');

  // Narrative state (placeholder for cinema controls)
  const [visualStyle, setVisualStyle] = useState('');

  // Derived state
  const selectedGenre = selectedGenreId ? GENRE_TEMPLATES[selectedGenreId] : null;
  const isContent = selectedGenreId ? isContentGenre(selectedGenreId) : false;
  const isAdult = selectedGenreId === 'onlyfans';

  // Get grouped options for dropdown
  const genreGroups = useMemo(() => getGroupedGenreOptions(isMature), [isMature]);

  // Get archetypes for selected genre
  const currentArchetypes = useMemo(() => {
    if (!selectedGenreId || !isContent) return {};
    return getArchetypesForGenre(selectedGenreId);
  }, [selectedGenreId, isContent]);

  // Handle genre change
  const handleGenreChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newGenre = e.target.value as Genre;
    setSelectedGenreId(newGenre);

    // Reset content-specific state when switching to content genre
    if (isContentGenre(newGenre)) {
      setArchetype(getDefaultArchetype(newGenre));
      setHook('');
    }
  }, []);

  // Handle mature toggle
  const handleMatureToggle = useCallback(() => {
    const newState = !isMature;
    setIsMature(newState);

    // Safety: If turning OFF and currently on a restricted genre, reset selection
    if (!newState && selectedGenreId && isRestrictedGenre(selectedGenreId)) {
      setSelectedGenreId('');
      setArchetype('');
      setHook('');
    }
  }, [isMature, selectedGenreId]);

  // Handle submit
  const handleSubmit = useCallback(() => {
    if (!selectedGenreId || !concept.trim()) return;

    const data: StoryConceptData = {
      genre: selectedGenreId,
      genreType: isContent ? 'content' : 'narrative',
      concept: concept.trim(),
    };

    if (isContent) {
      data.archetype = archetype;
      data.hook = hook;
      data.styleHint = currentArchetypes[archetype]?.styleHint;
    } else {
      data.visualStyle = visualStyle;
    }

    onSubmit?.(data);
  }, [
    selectedGenreId,
    concept,
    isContent,
    archetype,
    hook,
    currentArchetypes,
    visualStyle,
    onSubmit,
  ]);

  const canSubmit = selectedGenreId && concept.trim().length > 0 && !isLoading;

  return (
    <div className="space-y-6 rounded-xl border border-zinc-800 bg-zinc-950 p-6">
      {/* Genre Selector */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-xs font-bold tracking-wider text-zinc-500 uppercase">
          <Film className="h-3 w-3" />
          Content Format
        </label>
        <div className="relative">
          <select
            value={selectedGenreId}
            onChange={handleGenreChange}
            className="w-full appearance-none rounded-lg border border-zinc-700 bg-zinc-900 p-3 pr-10 text-white transition-colors outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
          >
            <option value="" disabled>
              Select a genre...
            </option>

            <optgroup label="Narrative / Film">
              {genreGroups.narrative.map(g => (
                <option key={g.value} value={g.value}>
                  {g.icon} {g.label}
                </option>
              ))}
            </optgroup>

            <optgroup label="Social / Content">
              {genreGroups.content.map(g => (
                <option key={g.value} value={g.value}>
                  {g.icon} {g.label}
                </option>
              ))}
            </optgroup>
          </select>
          <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        </div>

        {/* Genre description */}
        {selectedGenre && <p className="text-xs text-zinc-500">{selectedGenre.description}</p>}
      </div>

      {/* Dynamic Module Injection */}
      {isContent ? (
        <CreatorControls
          archetypes={currentArchetypes}
          selectedArchetype={archetype}
          onArchetypeChange={setArchetype}
          hook={hook}
          onHookChange={setHook}
          isAdult={isAdult}
        />
      ) : selectedGenreId ? (
        // Placeholder for Cinema Controls (Visual Style, Pacing, etc.)
        <div className="space-y-4 rounded-lg border border-dashed border-zinc-700 p-4">
          <div className="text-center text-sm text-zinc-500">
            <Film className="mx-auto mb-2 h-6 w-6 text-zinc-600" />
            Visual Style & Pacing Controls
            <span className="mt-1 block text-[10px] text-zinc-600">
              (Narrative Mode - use existing style selectors)
            </span>
          </div>
          {/* You can integrate your existing CinemaControls here */}
          <div className="space-y-2">
            <label className="text-xs font-bold tracking-wider text-zinc-500 uppercase">
              Visual Style Notes
            </label>
            <input
              type="text"
              value={visualStyle}
              onChange={e => setVisualStyle(e.target.value)}
              placeholder="e.g., Wes Anderson symmetry, neon noir lighting..."
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-white outline-none focus:border-purple-500"
            />
          </div>
        </div>
      ) : null}

      {/* Concept Input */}
      <div className="space-y-2">
        <label className="text-xs font-bold tracking-wider text-zinc-500 uppercase">
          {isContent ? 'Video Topic / Body' : 'Story Concept'}
        </label>
        <textarea
          value={concept}
          onChange={e => setConcept(e.target.value)}
          placeholder={
            isContent
              ? "What is the video about? (e.g., 'I built a secret room in my house to hide from my family...')"
              : "Describe your story concept... (e.g., 'A noir detective in 1940s LA investigates a disappearance...')"
          }
          className="h-32 w-full resize-none rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-white transition-colors outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
        />
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className={clsx(
          'w-full rounded-lg py-4 font-bold text-white shadow-lg transition-all',
          canSubmit
            ? isAdult
              ? 'bg-gradient-to-r from-red-600 to-pink-600 shadow-red-900/20 hover:from-red-500 hover:to-pink-500'
              : 'bg-gradient-to-r from-purple-600 to-blue-600 shadow-purple-900/20 hover:from-purple-500 hover:to-blue-500'
            : 'cursor-not-allowed bg-zinc-800 text-zinc-500'
        )}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <Sparkles className="h-4 w-4 animate-spin" />
            Generating...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <Sparkles className="h-4 w-4" />
            {isContent ? 'Generate Viral Script' : 'Generate Screenplay'}
          </span>
        )}
      </button>

      {/* Mature Toggle Footer */}
      <div className="flex items-center gap-3 border-t border-zinc-800 pt-4">
        <button
          onClick={handleMatureToggle}
          className={clsx(
            'relative h-6 w-10 rounded-full transition-colors',
            isMature ? 'bg-red-600' : 'bg-zinc-700'
          )}
        >
          <div
            className={clsx(
              'absolute top-1 h-4 w-4 rounded-full bg-white transition-all',
              isMature ? 'left-5' : 'left-1'
            )}
          />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-300">
            MATURE CONTENT
            {isMature && <AlertTriangle className="h-3 w-3 text-red-400" />}
          </div>
          <div className="text-[10px] text-zinc-500">
            {isMature ? 'Unrestricted genres unlocked (18+).' : 'Standard safety filters active.'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoryConceptInput;
