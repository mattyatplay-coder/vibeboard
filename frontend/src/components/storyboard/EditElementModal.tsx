import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';

interface EditElementModalProps {
    isOpen: boolean;
    onClose: () => void;
    element: any;
    onSave: (id: string, updates: any) => Promise<void>;
    sessions?: any[];
}

export function EditElementModal({ isOpen, onClose, element, onSave, sessions = [] }: EditElementModalProps) {
    const [name, setName] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [sessionId, setSessionId] = useState<string>('');
    const [newTag, setNewTag] = useState('');

    useEffect(() => {
        if (element) {
            setName(element.name || '');
            setTags(element.tags || []);
            setSessionId(element.session?.id || '');
        }
    }, [element]);

    if (!isOpen || !element) return null;

    const handleSave = async () => {
        await onSave(element.id, {
            name,
            tags,
            sessionId: sessionId || null
        });
        onClose();
    };

    const addTag = () => {
        if (newTag && !tags.includes(newTag)) {
            setTags([...tags, newTag]);
            setNewTag('');
        }
    };

    const removeTag = (tagToRemove: string) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-[#1a1a1a] border border-white/10 rounded-xl w-full max-w-lg overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <h2 className="text-lg font-semibold text-white">Edit Element</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Preview */}
                    <div className="aspect-video bg-black/50 rounded-lg overflow-hidden border border-white/5 flex items-center justify-center">
                        {element.type === 'video' ? (
                            <video src={element.url} controls className="max-h-full max-w-full" />
                        ) : (
                            <img src={element.url} alt={element.name} className="max-h-full max-w-full object-contain" />
                        )}
                    </div>

                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="Element name..."
                        />
                    </div>

                    {/* Session */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Session</label>
                        <select
                            value={sessionId}
                            onChange={(e) => setSessionId(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                            <option value="">No Session</option>
                            {sessions.map((s: any) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Tags */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Tags</label>
                        <div className="flex gap-2 mb-2">
                            <input
                                type="text"
                                value={newTag}
                                onChange={(e) => setNewTag(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addTag()}
                                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                placeholder="Add a tag..."
                            />
                            <button
                                onClick={addTag}
                                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                            >
                                Add
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {tags.map(tag => (
                                <span key={tag} className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-sm flex items-center gap-1">
                                    {tag}
                                    <button onClick={() => removeTag(tag)} className="hover:text-white">
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-white/10 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                    >
                        <Save className="w-4 h-4" />
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}
