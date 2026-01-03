'use client';

import { useState, useCallback, useMemo } from 'react';
import { usePromptVariablesStore } from '@/lib/promptVariablesStore';
import { usePropBinStore } from '@/lib/propBinStore';

export type TriggerType = '@' | '#' | '$';

export interface AutocompleteItem {
  id: string;
  name: string;
  type: 'element' | 'prop' | 'variable';
  description?: string;
  imageUrl?: string;
  category?: string;
}

export interface AutocompleteState {
  isOpen: boolean;
  query: string;
  triggerType: TriggerType | null;
  triggerPosition: number;
  cursorPosition: number;
}

interface Element {
  id: string;
  name: string;
  type?: string;
  url?: string;
  fileUrl?: string;
  thumbnail?: string;
  projectId?: string;
}

interface UsePromptAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  elements?: Element[];
  projectId?: string;
}

interface UsePromptAutocompleteReturn {
  handleChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  selectItem: (item: AutocompleteItem) => void;
  autocomplete: AutocompleteState;
  filteredItems: AutocompleteItem[];
  close: () => void;
}

export function usePromptAutocomplete({
  value,
  onChange,
  elements = [],
  projectId,
}: UsePromptAutocompleteProps): UsePromptAutocompleteReturn {
  const [autocomplete, setAutocomplete] = useState<AutocompleteState>({
    isOpen: false,
    query: '',
    triggerType: null,
    triggerPosition: -1,
    cursorPosition: 0,
  });

  // Get props and variables from stores
  const { props } = usePropBinStore();
  const { variables } = usePromptVariablesStore();

  // Filter items based on trigger type and query
  const filteredItems = useMemo((): AutocompleteItem[] => {
    if (!autocomplete.isOpen || !autocomplete.triggerType) return [];

    const query = autocomplete.query.toLowerCase();

    if (autocomplete.triggerType === '@') {
      // Filter elements
      const filtered = elements
        .filter(el => {
          // Filter by project if provided
          if (projectId && el.projectId && el.projectId !== projectId) return false;
          return el.name.toLowerCase().includes(query);
        })
        .slice(0, 20); // Limit results

      return filtered.map(el => ({
        id: el.id,
        name: el.name,
        type: 'element' as const,
        imageUrl: el.url || el.fileUrl || el.thumbnail,
        category: el.type,
      }));
    }

    if (autocomplete.triggerType === '#') {
      // Filter props
      const filtered = props.filter(p => p.name.toLowerCase().includes(query)).slice(0, 20);

      return filtered.map(p => ({
        id: p.id,
        name: p.name,
        type: 'prop' as const,
        description: p.description,
        imageUrl: p.referenceImageUrl,
        category: p.category,
      }));
    }

    if (autocomplete.triggerType === '$') {
      // Filter variables
      const filtered = variables.filter(v => v.name.toLowerCase().includes(query)).slice(0, 20);

      return filtered.map(v => ({
        id: v.id,
        name: v.name,
        type: 'variable' as const,
        description: v.value,
        category: v.category,
      }));
    }

    return [];
  }, [
    autocomplete.isOpen,
    autocomplete.triggerType,
    autocomplete.query,
    elements,
    props,
    variables,
    projectId,
  ]);

  // Detect triggers in text
  const detectTrigger = useCallback((text: string, cursorPos: number) => {
    const textBeforeCursor = text.slice(0, cursorPos);

    // Find the most recent trigger character
    const lastAt = textBeforeCursor.lastIndexOf('@');
    const lastHash = textBeforeCursor.lastIndexOf('#');
    const lastDollar = textBeforeCursor.lastIndexOf('$');

    const triggers: Array<{ char: TriggerType; pos: number }> = [];
    if (lastAt !== -1) triggers.push({ char: '@', pos: lastAt });
    if (lastHash !== -1) triggers.push({ char: '#', pos: lastHash });
    if (lastDollar !== -1) triggers.push({ char: '$', pos: lastDollar });

    if (triggers.length === 0) return null;

    // Get the most recent trigger
    const mostRecent = triggers.sort((a, b) => b.pos - a.pos)[0];
    const query = textBeforeCursor.slice(mostRecent.pos + 1);

    // Only show if no space in query (user is still typing the reference)
    if (query.includes(' ') || query.includes('\n')) return null;

    return {
      triggerType: mostRecent.char,
      triggerPosition: mostRecent.pos,
      query,
    };
  }, []);

  // Handle textarea change
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      const cursorPos = e.target.selectionStart;

      // Update the value first
      onChange(newValue);

      // Detect trigger
      const trigger = detectTrigger(newValue, cursorPos);

      if (trigger) {
        setAutocomplete({
          isOpen: true,
          query: trigger.query,
          triggerType: trigger.triggerType,
          triggerPosition: trigger.triggerPosition,
          cursorPosition: cursorPos,
        });
      } else {
        setAutocomplete(prev => ({ ...prev, isOpen: false, triggerType: null }));
      }
    },
    [onChange, detectTrigger]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!autocomplete.isOpen) return;

      // Escape closes the popup
      if (e.key === 'Escape') {
        e.preventDefault();
        setAutocomplete(prev => ({ ...prev, isOpen: false }));
        return;
      }

      // Tab or Enter selects first item if available
      if ((e.key === 'Tab' || e.key === 'Enter') && filteredItems.length > 0) {
        e.preventDefault();
        selectItem(filteredItems[0]);
        return;
      }
    },
    [autocomplete.isOpen, filteredItems]
  );

  // Select an item and insert it
  const selectItem = useCallback(
    (item: AutocompleteItem) => {
      const prefix = autocomplete.triggerType || '@';
      const before = value.slice(0, autocomplete.triggerPosition);
      const after = value.slice(autocomplete.cursorPosition);

      // Insert the reference with a trailing space
      const newValue = `${before}${prefix}${item.name} ${after}`;
      onChange(newValue);

      // Close the popup
      setAutocomplete({
        isOpen: false,
        query: '',
        triggerType: null,
        triggerPosition: -1,
        cursorPosition: 0,
      });
    },
    [
      value,
      onChange,
      autocomplete.triggerType,
      autocomplete.triggerPosition,
      autocomplete.cursorPosition,
    ]
  );

  // Close the popup
  const close = useCallback(() => {
    setAutocomplete(prev => ({ ...prev, isOpen: false }));
  }, []);

  return {
    handleChange,
    handleKeyDown,
    selectItem,
    autocomplete,
    filteredItems,
    close,
  };
}
