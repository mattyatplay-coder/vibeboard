'use client';

import { useState, useEffect } from 'react';
import { X, Upload, Plus, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { clsx } from 'clsx';

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
  Lighting: ['Cinematic', 'Natural', 'Studio', 'Neon', 'Golden Hour', 'Dark', 'Volumetric'],
  Camera: ['Wide Angle', 'Close Up', 'Drone', 'Handheld', 'Macro', 'Telephoto', 'Fisheye'],
  'Art Style': [
    'Realistic',
    '3D Render',
    'Anime',
    'Oil Painting',
    'Sketch',
    'Watercolor',
    'Pixel Art',
  ],
  Mood: ['Happy', 'Sad', 'Tense', 'Peaceful', 'Energetic', 'Mysterious', 'Romantic'],
};

export const ADVANCED_OPTIONS = {
  cameras: [
    'Arri Alexa 65',
    'RED Monstro 8K',
    'Sony Venice 2',
    'IMAX 70mm',
    'Panavision Millennium DXL2',
    '16mm Film Camera',
    'Super 8 Camera',
  ],
  lenses: [
    'Anamorphic Prime',
    'Vintage Cooke Speed Panchro',
    'Zeiss Master Prime',
    'Canon K35',
    'Petzval Art Lens',
    'Macro 100mm',
    'Tilt-Shift',
  ],
  films: [
    'Kodak Vision3 500T',
    'Kodak Portra 400',
    'Fujifilm Eterna 500T',
    'Ilford HP5 Plus (B&W)',
    'Kodachrome 64 (Emulation)',
    'LomoChrome Purple',
  ],
  colors: [
    'Teal & Orange',
    'Bleach Bypass',
    'Technicolor 2-Strip',
    'Cross Processed',
    'Faded Vintage',
    'High Contrast B&W',
    'Cyberpunk Neon',
  ],
  lighting: [
    'Cinematic',
    'Natural',
    'Studio',
    'Neon',
    'Golden Hour',
    'Dark',
    'Volumetric',
    'Rembrandt',
    'Split Lighting',
    'Butterfly Lighting',
  ],
  cameraMotions: [
    // Basic movements
    'Static',
    'Handheld',
    'Steadicam',
    'Gimbal',
    // Zoom family
    'Zoom In',
    'Zoom Out',
    'Crash Zoom',
    'Dolly Zoom (Vertigo)',
    // Dolly family
    'Dolly In',
    'Dolly Out',
    'Dolly Left',
    'Dolly Right',
    'Super Dolly',
    // Crane family
    'Crane Up',
    'Crane Down',
    'Crane Over',
    'Jib Up',
    'Jib Down',
    // Pan & Tilt
    'Pan Left',
    'Pan Right',
    'Tilt Up',
    'Tilt Down',
    'Whip Pan',
    // Orbital
    '360 Orbit',
    'Arc Left',
    'Arc Right',
    'Lazy Susan',
    '3D Rotation',
    // Specialty
    'Bullet Time',
    'Snorricam',
    'Dutch Angle',
    'Fisheye',
    'FPV Drone',
    'Through Object',
    'Rack Focus',
    // Character
    'Eyes In',
    'Hero Shot',
    'Over Shoulder',
    'Glam Shot',
    // Timelapse
    'Hyperlapse',
    'Timelapse',
  ],
  moods: [
    'Happy',
    'Sad',
    'Tense',
    'Peaceful',
    'Energetic',
    'Mysterious',
    'Romantic',
    'Melancholic',
    'Euphoric',
    'Ominous',
  ],
};

export function CreateStyleModal({ isOpen, onClose, onSave }: CreateStyleModalProps) {
  const [activeTab, setActiveTab] = useState<'basic' | 'advanced'>('basic');
  const [name, setName] = useState('');
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Advanced State
  const [camera, setCamera] = useState('');
  const [lens, setLens] = useState('');
  const [film, setFilm] = useState('');
  const [color, setColor] = useState('');
  const [lighting, setLighting] = useState('');
  const [cameraMotion, setCameraMotion] = useState('');
  const [mood, setMood] = useState('');

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setReferenceImage(acceptedFiles[0]);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 1,
  });

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => (prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]));
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
      tags: allTags,
    });
    onClose();
    resetForm();
  };

  const resetForm = () => {
    setName('');
    setReferenceImage(null);
    setSelectedTags([]);
    setCamera('');
    setLens('');
    setFilm('');
    setColor('');
    setLighting('');
    setCameraMotion('');
    setMood('');
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
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#1a1a1a] shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 bg-white/5 p-6">
              <div>
                <h2 className="text-xl font-bold text-white">Create Custom Style</h2>
                <p className="mt-1 text-sm text-gray-400">Define your unique visual style.</p>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/10">
              <button
                onClick={() => setActiveTab('basic')}
                className={clsx(
                  'relative flex-1 py-3 text-sm font-medium transition-colors',
                  activeTab === 'basic' ? 'text-white' : 'text-gray-400 hover:text-white'
                )}
              >
                Basic
                {activeTab === 'basic' && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute right-0 bottom-0 left-0 h-0.5 bg-blue-500"
                  />
                )}
              </button>
              <button
                onClick={() => setActiveTab('advanced')}
                className={clsx(
                  'relative flex-1 py-3 text-sm font-medium transition-colors',
                  activeTab === 'advanced' ? 'text-white' : 'text-gray-400 hover:text-white'
                )}
              >
                Advanced (Pro)
                {activeTab === 'advanced' && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute right-0 bottom-0 left-0 h-0.5 bg-blue-500"
                  />
                )}
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 space-y-8 overflow-y-auto p-6">
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                {/* Left Column: Inputs (Always visible) */}
                <div className="space-y-6">
                  {/* Name Input */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-400">
                      Style Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="e.g., Cyberpunk Noir"
                      className="w-full rounded-lg border border-white/10 bg-black/50 p-3 text-white placeholder:text-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* Image Upload */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-400">
                      Reference Image
                    </label>
                    <div
                      {...getRootProps()}
                      className={clsx(
                        'group relative flex aspect-video cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-all',
                        isDragActive
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-white/10 bg-black/30 hover:border-white/30 hover:bg-white/5'
                      )}
                    >
                      <input {...getInputProps()} />
                      {previewUrl ? (
                        <>
                          <img
                            src={previewUrl}
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                            <p className="flex items-center gap-2 text-sm font-medium text-white">
                              <Upload className="h-4 w-4" /> Replace Image
                            </p>
                          </div>
                        </>
                      ) : (
                        <div className="p-4 text-center">
                          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/5 transition-transform group-hover:scale-110">
                            <Upload className="h-6 w-6 text-gray-400 group-hover:text-white" />
                          </div>
                          <p className="text-sm font-medium text-gray-300">Click or drag image</p>
                          <p className="mt-1 text-xs text-gray-500">Supports JPG, PNG</p>
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
                      <label className="mb-4 block text-sm font-medium text-gray-400">
                        Style Tags
                      </label>
                      <div className="space-y-6">
                        {Object.entries(STYLE_TAGS).map(([category, tags]) => (
                          <div key={category}>
                            <h4 className="mb-3 text-xs font-bold tracking-wider text-gray-500 uppercase">
                              {category}
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {tags.map(tag => {
                                const isSelected = selectedTags.includes(tag);
                                return (
                                  <button
                                    key={tag}
                                    onClick={() => toggleTag(tag)}
                                    className={clsx(
                                      'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                                      isSelected
                                        ? 'border-blue-500 bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                                        : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20 hover:bg-white/10 hover:text-white'
                                    )}
                                  >
                                    {isSelected && <Check className="h-3 w-3" />}
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
                        <label className="mb-2 block text-sm font-medium text-gray-400">
                          Camera Model
                        </label>
                        <select
                          value={camera}
                          onChange={e => setCamera(e.target.value)}
                          className="w-full appearance-none rounded-lg border border-white/10 bg-black/50 p-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        >
                          <option value="">Select Camera...</option>
                          {ADVANCED_OPTIONS.cameras.map(opt => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-400">
                          Lens Type
                        </label>
                        <select
                          value={lens}
                          onChange={e => setLens(e.target.value)}
                          className="w-full appearance-none rounded-lg border border-white/10 bg-black/50 p-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        >
                          <option value="">Select Lens...</option>
                          {ADVANCED_OPTIONS.lenses.map(opt => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-400">
                          Film Stock
                        </label>
                        <select
                          value={film}
                          onChange={e => setFilm(e.target.value)}
                          className="w-full appearance-none rounded-lg border border-white/10 bg-black/50 p-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        >
                          <option value="">Select Film Stock...</option>
                          {ADVANCED_OPTIONS.films.map(opt => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-400">
                          Color Grade
                        </label>
                        <select
                          value={color}
                          onChange={e => setColor(e.target.value)}
                          className="w-full appearance-none rounded-lg border border-white/10 bg-black/50 p-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        >
                          <option value="">Select Color Grade...</option>
                          {ADVANCED_OPTIONS.colors.map(opt => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-400">
                          Lighting
                        </label>
                        <select
                          value={lighting}
                          onChange={e => setLighting(e.target.value)}
                          className="w-full appearance-none rounded-lg border border-white/10 bg-black/50 p-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        >
                          <option value="">Select Lighting...</option>
                          {ADVANCED_OPTIONS.lighting.map(opt => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-400">
                          Camera Motion
                        </label>
                        <select
                          value={cameraMotion}
                          onChange={e => setCameraMotion(e.target.value)}
                          className="w-full appearance-none rounded-lg border border-white/10 bg-black/50 p-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        >
                          <option value="">Select Camera Motion...</option>
                          {ADVANCED_OPTIONS.cameraMotions.map(opt => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-400">Mood</label>
                        <select
                          value={mood}
                          onChange={e => setMood(e.target.value)}
                          className="w-full appearance-none rounded-lg border border-white/10 bg-black/50 p-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        >
                          <option value="">Select Mood...</option>
                          {ADVANCED_OPTIONS.moods.map(opt => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 border-t border-white/10 bg-[#1a1a1a] p-6">
              <button
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-medium text-gray-400 transition-colors hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!name || !referenceImage}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Create Style
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
