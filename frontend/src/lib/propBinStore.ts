import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Prop {
  id: string;
  name: string; // e.g., "RedSportscar", "GoldenAmulet", "WornLeatherJacket"
  description: string; // Detailed prompt description of the prop
  referenceImageUrl?: string; // Optional reference image for visual consistency
  category?:
    | 'vehicle'
    | 'weapon'
    | 'clothing'
    | 'accessory'
    | 'furniture'
    | 'food'
    | 'tech'
    | 'nature'
    | 'custom';
  tags?: string[]; // e.g., ["hero prop", "recurring", "key item"]
  createdAt: string;
  updatedAt: string;
}

interface PropBinState {
  props: Prop[];

  // CRUD operations
  addProp: (prop: Omit<Prop, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateProp: (id: string, updates: Partial<Omit<Prop, 'id' | 'createdAt'>>) => void;
  deleteProp: (id: string) => void;

  // Expansion - replace #PropName with the prop's description
  expandPropReferences: (prompt: string) => string;

  // Get by name
  getByName: (name: string) => Prop | undefined;

  // Get all names for autocomplete
  getAllPropNames: () => string[];
}

export const usePropBinStore = create<PropBinState>()(
  persist(
    (set, get) => ({
      props: [
        // Default starter props for demonstration
        {
          id: 'default-retro-phone',
          name: 'RetroPhone',
          description:
            'vintage rotary telephone, cherry red bakelite, brass dial, curly cord, glossy finish',
          category: 'tech',
          tags: ['prop', 'vintage'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'default-leather-bag',
          name: 'LeatherBag',
          description:
            'worn brown leather messenger bag, brass buckles, patina, handcrafted, vintage travel bag',
          category: 'accessory',
          tags: ['character prop', 'recurring'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'default-john-wick-car',
          name: 'JohnWickCar',
          description:
            'Photorealistic 1969 Ford Mustang Boss 429 homologation model, presented as a utilitarian factory-production vehicle rather than a showpiece, historically accurate and minimally adorned; front fascia is blunt and functional with a wide, flat rectangular grille opening, simple dark grille surface with understated horizontal structure, visually plain and unembellished, no decorative framing or emphasis; quad round headlights evenly spaced and mounted plainly within the front end, utilitarian placement with no stylized housings; front bumper is thick, straight, and heavy, running horizontally beneath the grille with minimal curvature, reinforcing mass over elegance; hood is long, broad, and flat with low-profile Boss 429 hood scoop, integrated and functional, subdued in height and shape, reading as an engineering necessity rather than a performance statement; overall proportions emphasize width, weight, and simplicity, deliberately unsporty and restrained, clearly Ford-built and purpose-driven rather than refined or aggressive; deep black paint with restrained gloss, realistic clear-coat behavior and minor surface imperfections, completely unadorned—no stripes, no graphics, no personalization, only muted factory trim; dark steel period-correct wheels, thick practical performance tires, light grime limited to lower body and wheel arches; interior barely visible through glass, black leather, basic utilitarian layout, no modern features, subtle wear consistent with long-term ownership; vehicle stationary in a quiet urban industrial setting at night, concrete walls and neutral surroundings, wet asphalt producing soft, controlled reflections under sodium-vapor streetlights; camera positioned low and slightly off-center at a front three-quarter angle just below headlight height, 35mm lens, natural perspective, shallow depth of field with focus priority on the front fascia geometry; lighting is restrained and directional with a single dominant key light, hard-edged shadows, realistic global illumination, physically based materials, accurate real-world scale and proportions, documentary-level realism, intentionally understated, stoic, controlled, and unsensational',
          category: 'vehicle',
          tags: ['hero prop', 'john wick', 'iconic', '1969 mustang'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],

      addProp: prop => {
        const now = new Date().toISOString();
        set(state => ({
          props: [
            ...state.props,
            {
              ...prop,
              id: `prop-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              createdAt: now,
              updatedAt: now,
            },
          ],
        }));
      },

      updateProp: (id, updates) => {
        set(state => ({
          props: state.props.map(p =>
            p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
          ),
        }));
      },

      deleteProp: id => {
        set(state => ({
          props: state.props.filter(p => p.id !== id),
        }));
      },

      expandPropReferences: (prompt: string) => {
        const { props } = get();
        let expanded = prompt;

        // Replace all #PropName patterns with their descriptions
        // Case-insensitive matching
        for (const prop of props) {
          // Match #PropName or #{PropName}
          const patterns = [
            new RegExp(`#\\{${prop.name}\\}`, 'gi'),
            new RegExp(`#${prop.name}(?![a-zA-Z0-9_])`, 'gi'),
          ];

          for (const pattern of patterns) {
            expanded = expanded.replace(pattern, prop.description);
          }
        }

        return expanded;
      },

      getByName: (name: string) => {
        const { props } = get();
        return props.find(p => p.name.toLowerCase() === name.toLowerCase());
      },

      getAllPropNames: () => {
        const { props } = get();
        return props.map(p => p.name);
      },
    }),
    {
      name: 'vibeboard-prop-bin',
    }
  )
);

// Helper to detect unexpanded prop references in a prompt
export function detectUnexpandedProps(prompt: string): string[] {
  const matches = prompt.match(/#\{?([a-zA-Z_][a-zA-Z0-9_]*)\}?/g);
  if (!matches) return [];

  // Extract prop names (remove # and optional braces)
  return [...new Set(matches.map(m => m.replace(/[#\{\}]/g, '')))];
}

// Helper to highlight props in a prompt for display
export function highlightProps(prompt: string): string {
  // Replace #PropName with <mark>#PropName</mark> for highlighting
  return prompt.replace(
    /(#\{?[a-zA-Z_][a-zA-Z0-9_]*\}?)/g,
    '<span class="text-amber-400 font-medium">$1</span>'
  );
}

// Category display info
export const PROP_CATEGORIES = {
  vehicle: { label: 'Vehicle', icon: '🚗', color: 'text-blue-400' },
  weapon: { label: 'Weapon', icon: '⚔️', color: 'text-red-400' },
  clothing: { label: 'Clothing', icon: '👕', color: 'text-purple-400' },
  accessory: { label: 'Accessory', icon: '💍', color: 'text-yellow-400' },
  furniture: { label: 'Furniture', icon: '🪑', color: 'text-amber-400' },
  food: { label: 'Food', icon: '🍎', color: 'text-green-400' },
  tech: { label: 'Tech', icon: '📱', color: 'text-cyan-400' },
  nature: { label: 'Nature', icon: '🌿', color: 'text-emerald-400' },
  custom: { label: 'Custom', icon: '✨', color: 'text-gray-400' },
} as const;
