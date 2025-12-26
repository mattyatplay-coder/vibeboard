import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PromptNode {
    id: string;
    prompt: string;
    negativePrompt?: string;
    parentId: string | null; // null = root node
    timestamp: string;
    label?: string; // Optional user label (e.g., "Best so far", "Experiment A")
    generationIds: string[]; // IDs of generations created from this prompt
    metadata?: {
        model?: string;
        aspectRatio?: string;
        lensPreset?: string;
        selectedElements?: string[];
    };
}

interface PromptTreeState {
    // Map of projectId -> array of prompt nodes
    trees: Record<string, PromptNode[]>;

    // Current active node per project
    activeNodeId: Record<string, string | null>;

    // Add a new prompt node (automatically sets parent to current active)
    addNode: (projectId: string, prompt: string, options?: {
        negativePrompt?: string;
        label?: string;
        parentId?: string; // Override parent (for forking from specific node)
        generationId?: string;
        metadata?: PromptNode['metadata'];
    }) => string; // Returns new node ID

    // Update a node (e.g., add generation ID)
    updateNode: (projectId: string, nodeId: string, updates: Partial<PromptNode>) => void;

    // Set active node (for viewing/forking from a specific point)
    setActiveNode: (projectId: string, nodeId: string | null) => void;

    // Get tree for a project
    getTree: (projectId: string) => PromptNode[];

    // Get node by ID
    getNode: (projectId: string, nodeId: string) => PromptNode | undefined;

    // Get parent chain (lineage from root to node)
    getLineage: (projectId: string, nodeId: string) => PromptNode[];

    // Get children of a node
    getChildren: (projectId: string, nodeId: string) => PromptNode[];

    // Get root nodes
    getRoots: (projectId: string) => PromptNode[];

    // Delete a node (and all descendants)
    deleteNode: (projectId: string, nodeId: string) => void;

    // Clear entire tree for a project
    clearTree: (projectId: string) => void;
}

export const usePromptTreeStore = create<PromptTreeState>()(
    persist(
        (set, get) => ({
            trees: {},
            activeNodeId: {},

            addNode: (projectId, prompt, options = {}) => {
                const nodeId = `pn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                const { trees, activeNodeId } = get();
                const projectTree = trees[projectId] || [];
                const parentId = options.parentId ?? activeNodeId[projectId] ?? null;

                const newNode: PromptNode = {
                    id: nodeId,
                    prompt,
                    negativePrompt: options.negativePrompt,
                    parentId,
                    timestamp: new Date().toISOString(),
                    label: options.label,
                    generationIds: options.generationId ? [options.generationId] : [],
                    metadata: options.metadata,
                };

                set((state) => ({
                    trees: {
                        ...state.trees,
                        [projectId]: [...(state.trees[projectId] || []), newNode],
                    },
                    activeNodeId: {
                        ...state.activeNodeId,
                        [projectId]: nodeId,
                    },
                }));

                return nodeId;
            },

            updateNode: (projectId, nodeId, updates) => {
                set((state) => ({
                    trees: {
                        ...state.trees,
                        [projectId]: (state.trees[projectId] || []).map((node) =>
                            node.id === nodeId
                                ? { ...node, ...updates }
                                : node
                        ),
                    },
                }));
            },

            setActiveNode: (projectId, nodeId) => {
                set((state) => ({
                    activeNodeId: {
                        ...state.activeNodeId,
                        [projectId]: nodeId,
                    },
                }));
            },

            getTree: (projectId) => {
                const { trees } = get();
                return trees[projectId] || [];
            },

            getNode: (projectId, nodeId) => {
                const { trees } = get();
                return (trees[projectId] || []).find((n) => n.id === nodeId);
            },

            getLineage: (projectId, nodeId) => {
                const { trees } = get();
                const projectTree = trees[projectId] || [];
                const lineage: PromptNode[] = [];

                let current = projectTree.find((n) => n.id === nodeId);
                while (current) {
                    lineage.unshift(current);
                    current = current.parentId
                        ? projectTree.find((n) => n.id === current!.parentId)
                        : undefined;
                }

                return lineage;
            },

            getChildren: (projectId, nodeId) => {
                const { trees } = get();
                return (trees[projectId] || []).filter((n) => n.parentId === nodeId);
            },

            getRoots: (projectId) => {
                const { trees } = get();
                return (trees[projectId] || []).filter((n) => n.parentId === null);
            },

            deleteNode: (projectId, nodeId) => {
                const { trees, activeNodeId, getChildren } = get();
                const projectTree = trees[projectId] || [];

                // Recursively get all descendant IDs
                const getDescendantIds = (id: string): string[] => {
                    const children = projectTree.filter((n) => n.parentId === id);
                    return children.flatMap((child) => [child.id, ...getDescendantIds(child.id)]);
                };

                const toDelete = new Set([nodeId, ...getDescendantIds(nodeId)]);

                // If active node is being deleted, move to parent
                const nodeToDelete = projectTree.find((n) => n.id === nodeId);
                const newActiveId = toDelete.has(activeNodeId[projectId] || '')
                    ? nodeToDelete?.parentId || null
                    : activeNodeId[projectId];

                set((state) => ({
                    trees: {
                        ...state.trees,
                        [projectId]: projectTree.filter((n) => !toDelete.has(n.id)),
                    },
                    activeNodeId: {
                        ...state.activeNodeId,
                        [projectId]: newActiveId,
                    },
                }));
            },

            clearTree: (projectId) => {
                set((state) => ({
                    trees: {
                        ...state.trees,
                        [projectId]: [],
                    },
                    activeNodeId: {
                        ...state.activeNodeId,
                        [projectId]: null,
                    },
                }));
            },
        }),
        {
            name: 'vibeboard-prompt-tree',
        }
    )
);

// Helper to format time difference
export function formatTimeAgo(timestamp: string): string {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
}

// Helper to truncate prompt for display
export function truncatePrompt(prompt: string, maxLength: number = 50): string {
    if (prompt.length <= maxLength) return prompt;
    return prompt.slice(0, maxLength - 3) + '...';
}
