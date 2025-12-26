import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PromptVariable {
  id: string;
  name: string; // e.g., "MainLook", "CharacterBase", "StylePrefix"
  value: string; // The actual prompt snippet
  description?: string;
  category?: 'character' | 'style' | 'lighting' | 'camera' | 'custom';
  createdAt: string;
  updatedAt: string;
}

interface PromptVariablesState {
  variables: PromptVariable[];

  // CRUD operations
  addVariable: (variable: Omit<PromptVariable, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateVariable: (id: string, updates: Partial<Omit<PromptVariable, 'id' | 'createdAt'>>) => void;
  deleteVariable: (id: string) => void;

  // Expansion
  expandPrompt: (prompt: string) => string;

  // Get by name
  getByName: (name: string) => PromptVariable | undefined;
}

export const usePromptVariablesStore = create<PromptVariablesState>()(
  persist(
    (set, get) => ({
      variables: [
        // Default starter variables
        {
          id: 'default-quality',
          name: 'Quality',
          value: 'highly detailed, sharp focus, 8k uhd, professional photography',
          description: 'Standard quality suffix',
          category: 'style',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'default-negative',
          name: 'BadArtifacts',
          value: 'blurry, low quality, distorted, ugly, deformed, watermark, text',
          description: 'Common negative prompt elements',
          category: 'style',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],

      addVariable: variable => {
        const now = new Date().toISOString();
        set(state => ({
          variables: [
            ...state.variables,
            {
              ...variable,
              id: `var-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              createdAt: now,
              updatedAt: now,
            },
          ],
        }));
      },

      updateVariable: (id, updates) => {
        set(state => ({
          variables: state.variables.map(v =>
            v.id === id ? { ...v, ...updates, updatedAt: new Date().toISOString() } : v
          ),
        }));
      },

      deleteVariable: id => {
        set(state => ({
          variables: state.variables.filter(v => v.id !== id),
        }));
      },

      expandPrompt: (prompt: string) => {
        const { variables } = get();
        let expanded = prompt;

        // Replace all $VariableName patterns with their values
        // Case-insensitive matching
        for (const variable of variables) {
          // Match $VariableName or ${VariableName}
          const patterns = [
            new RegExp(`\\$\\{${variable.name}\\}`, 'gi'),
            new RegExp(`\\$${variable.name}(?![a-zA-Z0-9_])`, 'gi'),
          ];

          for (const pattern of patterns) {
            expanded = expanded.replace(pattern, variable.value);
          }
        }

        return expanded;
      },

      getByName: (name: string) => {
        const { variables } = get();
        return variables.find(v => v.name.toLowerCase() === name.toLowerCase());
      },
    }),
    {
      name: 'vibeboard-prompt-variables',
    }
  )
);

// Helper to detect unexpanded variables in a prompt
export function detectUnexpandedVariables(prompt: string): string[] {
  const matches = prompt.match(/\$\{?([a-zA-Z_][a-zA-Z0-9_]*)\}?/g);
  if (!matches) return [];

  // Extract variable names (remove $ and optional braces)
  return [...new Set(matches.map(m => m.replace(/[\$\{\}]/g, '')))];
}

// Helper to highlight variables in a prompt for display
export function highlightVariables(prompt: string): string {
  // Replace $VariableName with <mark>$VariableName</mark> for highlighting
  return prompt.replace(
    /(\$\{?[a-zA-Z_][a-zA-Z0-9_]*\}?)/g,
    '<span class="text-purple-400 font-medium">$1</span>'
  );
}
