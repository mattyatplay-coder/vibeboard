const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

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
        throw new Error(error.error || 'API request failed');
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

export async function updateElement(endpoint: string, data: any) {
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
