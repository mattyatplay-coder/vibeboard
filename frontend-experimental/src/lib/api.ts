export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
const API_URL = process.env.NEXT_PUBLIC_API_URL || `${BACKEND_URL}/api`;

export interface Project {
    id: string;
    name: string;
    description: string;
    updatedAt: string;
    createdAt: string;
    generations?: { outputs: string }[];
}

export function resolveFileUrl(path: string | undefined | null): string {
    if (!path) return '';
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    return `${BACKEND_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

export async function fetchAPI(endpoint: string, options: RequestInit = {}) {
    const res = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error ? `${error.error}: ${error.message || ''}` : 'API request failed');
    }

    const text = await res.text();
    return text ? JSON.parse(text) : {};
}

export async function uploadFile(endpoint: string, file: File, metadata: Record<string, string | undefined>) {
    const formData = new FormData();
    formData.append('file', file);
    Object.entries(metadata).forEach(([key, value]) => {
        if (value !== undefined) {
            formData.append(key, value);
        }
    });

    const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        body: formData,
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || 'Upload failed');
    }

    return res.json();
}

export async function updateElement(endpoint: string, data: Record<string, unknown>) {
    const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || 'Update failed');
    }

    return res.json();
}

export async function analyzeGeneration(projectId: string, generationId: string, feedback?: string) {
    return fetchAPI(`/projects/${projectId}/generations/${generationId}/analyze`, {
        method: 'POST',
        body: JSON.stringify({ feedback })
    });
}

export async function refineGeneration(projectId: string, generationId: string, feedback: string) {
    return fetchAPI(`/projects/${projectId}/generations/${generationId}/refine`, {
        method: 'POST',
        body: JSON.stringify({ feedback })
    });
}

export async function enhanceVideo(projectId: string, generationId: string) {
    return fetchAPI(`/projects/${projectId}/generations/${generationId}/enhance`, {
        method: 'POST'
    });
}
