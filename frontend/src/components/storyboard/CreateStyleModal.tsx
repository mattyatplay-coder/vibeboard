"use client";

import { useState, useEffect } from "react";
import { X, Upload, Plus, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDropzone } from "react-dropzone";
import { clsx } from "clsx";

interface CreateStyleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (style: CustomStyle) => void;
}

export interface CustomStyle {
    id: string;
    name: string;
    image: string; // URL or base64
    tags: string[];
}

const STYLE_TAGS = {
    Lighting: ["Cinematic", "Natural", "Studio", "Neon", "Golden Hour", "Dark", "Volumetric"],
    Camera: ["Wide Angle", "Close Up", "Drone", "Handheld", "Macro", "Telephoto", "Fisheye"],
    "Art Style": ["Realistic", "3D Render", "Anime", "Oil Painting", "Sketch", "Watercolor", "Pixel Art"],
    Mood: ["Happy", "Sad", "Tense", "Peaceful", "Energetic", "Mysterious", "Romantic"]
};

export const ADVANCED_OPTIONS = {
    cameras: ["Arri Alexa 65", "RED Monstro 8K", "Sony Venice 2", "IMAX 70mm", "Panavision Millennium DXL2", "16mm Film Camera", "Super 8 Camera"],
    lenses: ["Anamorphic Prime", "Vintage Cooke Speed Panchro", "Zeiss Master Prime", "Canon K35", "Petzval Art Lens", "Macro 100mm", "Tilt-Shift"],
    films: ["Kodak Vision3 500T", "Kodak Portra 400", "Fujifilm Eterna 500T", "Ilford HP5 Plus (B&W)", "Kodachrome 64 (Emulation)", "LomoChrome Purple"],
    colors: ["Teal & Orange", "Bleach Bypass", "Technicolor 2-Strip", "Cross Processed", "Faded Vintage", "High Contrast B&W", "Cyberpunk Neon"],
    lighting: ["Cinematic", "Natural", "Studio", "Neon", "Golden Hour", "Dark", "Volumetric", "Rembrandt", "Split Lighting", "Butterfly Lighting"],
    cameraMotions: [
        // Basic movements
        "Static", "Handheld", "Steadicam", "Gimbal",
        // Zoom family
        "Zoom In", "Zoom Out", "Crash Zoom", "Dolly Zoom (Vertigo)",
        // Dolly family
        "Dolly In", "Dolly Out", "Dolly Left", "Dolly Right", "Super Dolly",
        // Crane family
        "Crane Up", "Crane Down", "Crane Over", "Jib Up", "Jib Down",
        // Pan & Tilt
        "Pan Left", "Pan Right", "Tilt Up", "Tilt Down", "Whip Pan",
        // Orbital
        "360 Orbit", "Arc Left", "Arc Right", "Lazy Susan", "3D Rotation",
        // Specialty
        "Bullet Time", "Snorricam", "Dutch Angle", "Fisheye", "FPV Drone", "Through Object", "Rack Focus",
        // Character
        "Eyes In", "Hero Shot", "Over Shoulder", "Glam Shot",
        // Timelapse
        "Hyperlapse", "Timelapse"
    ],
    moods: ["Happy", "Sad", "Tense", "Peaceful", "Energetic", "Mysterious", "Romantic", "Melancholic", "Euphoric", "Ominous"]
};

export function CreateStyleModal({ isOpen, onClose, onSave }: CreateStyleModalProps) {
    const [activeTab, setActiveTab] = useState<'basic' | 'advanced'>('basic');
    const [name, setName] = useState("");
    const [referenceImage, setReferenceImage] = useState<File | null>(null);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);

    // Advanced State
    const [camera, setCamera] = useState("");
    const [lens, setLens] = useState("");
    const [film, setFilm] = useState("");
    const [color, setColor] = useState("");
    const [lighting, setLighting] = useState("");
    const [cameraMotion, setCameraMotion] = useState("");
    const [mood, setMood] = useState("");

    const onDrop = (acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            setReferenceImage(acceptedFiles[0]);
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': [] },
        maxFiles: 1
    });

    const toggleTag = (tag: string) => {
        setSelectedTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

    const handleSave = () => {
        if (!name || !referenceImage) return;

        // Create a fake URL for the image for now (in real app, upload to server)
        const imageUrl = URL.createObjectURL(referenceImage);

        // Format advanced settings into descriptive tags
        const advancedTags = [];
        if (camera) advancedTags.push(`shot on ${camera}`);
        if (lens) advancedTags.push(`${lens} lens`);
        if (film) advancedTags.push(`${film} film stock`);
        if (color) advancedTags.push(`${color} color grading`);
        if (lighting) advancedTags.push(`${lighting} lighting`);
        if (cameraMotion) advancedTags.push(`${cameraMotion} camera movement`);
        if (mood) advancedTags.push(`${mood} mood`);

        const allTags = [...selectedTags, ...advancedTags];

        onSave({
            id: `custom_${Date.now()}`,
            name,
            image: imageUrl,
            tags: allTags
        });
        onClose();
        resetForm();
    };

    const resetForm = () => {
        setName("");
        setReferenceImage(null);
        setSelectedTags([]);
        setCamera("");
        setLens("");
        setFilm("");
        setColor("");
        setLighting("");
        setCameraMotion("");
        setMood("");
        setActiveTab('basic');
    };

    // Preview URL
    const previewUrl = referenceImage ? URL.createObjectURL(referenceImage) : null;
    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [referenceImage]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={onClose}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-2xl bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5">
                            <div>
                                <h2 className="text-xl font-bold text-white">Create Custom Style</h2>
                                <p className="text-sm text-gray-400 mt-1">Define your unique visual style.</p>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-white/10">
                            <button
                                onClick={() => setActiveTab('basic')}
                                className={clsx(
                                    "flex-1 py-3 text-sm font-medium transition-colors relative",
                                    activeTab === 'basic' ? "text-white" : "text-gray-400 hover:text-white"
                                )}
                            >
                                Basic
                                {activeTab === 'basic' && (
                                    <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
                                )}
                            </button>
                            <button
                                onClick={() => setActiveTab('advanced')}
                                className={clsx(
                                    "flex-1 py-3 text-sm font-medium transition-colors relative",
                                    activeTab === 'advanced' ? "text-white" : "text-gray-400 hover:text-white"
                                )}
                            >
                                Advanced (Pro)
                                {activeTab === 'advanced' && (
                                    <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
                                )}
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Left Column: Inputs (Always visible) */}
                                <div className="space-y-6">
                                    {/* Name Input */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">Style Name</label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="e.g., Cyberpunk Noir"
                                            className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-600"
                                        />
                                    </div>

                                    {/* Image Upload */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">Reference Image</label>
                                        <div
                                            {...getRootProps()}
                                            className={clsx(
                                                "aspect-video border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer relative overflow-hidden group",
                                                isDragActive ? "border-blue-500 bg-blue-500/10" : "border-white/10 bg-black/30 hover:border-white/30 hover:bg-white/5"
                                            )}
                                        >
                                            <input {...getInputProps()} />
                                            {previewUrl ? (
                                                <>
                                                    <img src={previewUrl} className="absolute inset-0 w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <p className="text-sm text-white font-medium flex items-center gap-2">
                                                            <Upload className="w-4 h-4" /> Replace Image
                                                        </p>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="text-center p-4">
                                                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                                                        <Upload className="w-6 h-6 text-gray-400 group-hover:text-white" />
                                                    </div>
                                                    <p className="text-sm text-gray-300 font-medium">Click or drag image</p>
                                                    <p className="text-xs text-gray-500 mt-1">Supports JPG, PNG</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: Tabs Content */}
                                <div>
                                    {activeTab === 'basic' ? (
                                        <motion.div
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                        >
                                            <label className="block text-sm font-medium text-gray-400 mb-4">Style Tags</label>
                                            <div className="space-y-6">
                                                {Object.entries(STYLE_TAGS).map(([category, tags]) => (
                                                    <div key={category}>
                                                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">{category}</h4>
                                                        <div className="flex flex-wrap gap-2">
                                                            {tags.map(tag => {
                                                                const isSelected = selectedTags.includes(tag);
                                                                return (
                                                                    <button
                                                                        key={tag}
                                                                        onClick={() => toggleTag(tag)}
                                                                        className={clsx(
                                                                            "px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5",
                                                                            isSelected
                                                                                ? "bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-500/25"
                                                                                : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:border-white/20 hover:text-white"
                                                                        )}
                                                                    >
                                                                        {isSelected && <Check className="w-3 h-3" />}
                                                                        {tag}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            className="space-y-6"
                                        >
                                            <div>
                                                <label className="block text-sm font-medium text-gray-400 mb-2">Camera Model</label>
                                                <select
                                                    value={camera}
                                                    onChange={(e) => setCamera(e.target.value)}
                                                    className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                                                >
                                                    <option value="">Select Camera...</option>
                                                    {ADVANCED_OPTIONS.cameras.map(opt => (
                                                        <option key={opt} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-400 mb-2">Lens Type</label>
                                                <select
                                                    value={lens}
                                                    onChange={(e) => setLens(e.target.value)}
                                                    className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                                                >
                                                    <option value="">Select Lens...</option>
                                                    {ADVANCED_OPTIONS.lenses.map(opt => (
                                                        <option key={opt} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-400 mb-2">Film Stock</label>
                                                <select
                                                    value={film}
                                                    onChange={(e) => setFilm(e.target.value)}
                                                    className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                                                >
                                                    <option value="">Select Film Stock...</option>
                                                    {ADVANCED_OPTIONS.films.map(opt => (
                                                        <option key={opt} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-400 mb-2">Color Grade</label>
                                                <select
                                                    value={color}
                                                    onChange={(e) => setColor(e.target.value)}
                                                    className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                                                >
                                                    <option value="">Select Color Grade...</option>
                                                    {ADVANCED_OPTIONS.colors.map(opt => (
                                                        <option key={opt} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-400 mb-2">Lighting</label>
                                                <select
                                                    value={lighting}
                                                    onChange={(e) => setLighting(e.target.value)}
                                                    className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                                                >
                                                    <option value="">Select Lighting...</option>
                                                    {ADVANCED_OPTIONS.lighting.map(opt => (
                                                        <option key={opt} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-400 mb-2">Camera Motion</label>
                                                <select
                                                    value={cameraMotion}
                                                    onChange={(e) => setCameraMotion(e.target.value)}
                                                    className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                                                >
                                                    <option value="">Select Camera Motion...</option>
                                                    {ADVANCED_OPTIONS.cameraMotions.map(opt => (
                                                        <option key={opt} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-400 mb-2">Mood</label>
                                                <select
                                                    value={mood}
                                                    onChange={(e) => setMood(e.target.value)}
                                                    className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                                                >
                                                    <option value="">Select Mood...</option>
                                                    {ADVANCED_OPTIONS.moods.map(opt => (
                                                        <option key={opt} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </motion.div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-white/10 bg-[#1a1a1a] flex justify-end gap-3">
                            <button
                                onClick={onClose}
                                className="px-5 py-2.5 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!name || !referenceImage}
                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Create Style
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
