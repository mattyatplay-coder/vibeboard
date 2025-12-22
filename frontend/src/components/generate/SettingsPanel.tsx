'use client';

import { useAppStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Monitor, Smartphone, Square } from 'lucide-react';
import { clsx } from 'clsx';
import { useState } from 'react';

const SHOT_TYPES = [
  { id: 'None', label: 'None', image: '/icons/none.png' }, // Placeholders
  { id: 'Extreme close up', label: 'Extreme close up', image: '/icons/ecu.png' },
  { id: 'Close up', label: 'Close up', image: '/icons/cu.png' },
  { id: 'Medium', label: 'Medium', image: '/icons/med.png' },
  { id: 'Wide', label: 'Wide', image: '/icons/wide.png' },
  { id: 'Extreme wide', label: 'Extreme wide', image: '/icons/ew.png' },
];

const CAMERA_ANGLES = [
  { id: 'None', label: 'None' },
  { id: 'Eye level', label: 'Eye level' },
  { id: 'Low angle', label: 'Low angle' },
  { id: 'Over the shoulder', label: 'Over the shoulder' },
  { id: 'Overhead', label: 'Overhead' },
  { id: "Bird's eye view", label: "Bird's eye view" },
];

const RESOLUTIONS = [
  { id: '1080p', label: '1080p' },
  { id: '1440p', label: '1440p' },
  { id: '2048p', label: '2048p' },
];

const RATIOS = [
  { id: '16:9', label: '16:9', icon: Monitor },
  { id: '1:1', label: '1:1', icon: Square },
  { id: '9:16', label: '9:16', icon: Smartphone },
];

export function SettingsPanel() {
  const { generationSettings, updateSettings } = useAppStore();
  const [openSection, setOpenSection] = useState<string | null>('shot_type');

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  return (
    <div className="space-y-4">
      {/* Shot Type */}
      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-lg">
        <button
          onClick={() => toggleSection('shot_type')}
          className="flex w-full items-center justify-between p-4 transition-colors hover:bg-white/5"
        >
          <span className="font-medium">Shot Type</span>
          <ChevronDown
            className={clsx(
              'h-5 w-5 transition-transform',
              openSection === 'shot_type' && 'rotate-180'
            )}
          />
        </button>
        <AnimatePresence>
          {openSection === 'shot_type' && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-3 gap-2 p-4">
                {SHOT_TYPES.map(type => (
                  <button
                    key={type.id}
                    onClick={() => updateSettings({ shotType: type.id })}
                    className={clsx(
                      'flex flex-col items-center gap-2 rounded-lg border p-2 transition-colors',
                      generationSettings.shotType === type.id
                        ? 'border-blue-500 bg-blue-500/20'
                        : 'border-transparent bg-black/20 hover:bg-white/5'
                    )}
                  >
                    <div className="aspect-square w-full rounded-md bg-white/10" />{' '}
                    {/* Placeholder for image */}
                    <span className="text-center text-xs">{type.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Camera Angle */}
      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-lg">
        <button
          onClick={() => toggleSection('camera_angle')}
          className="flex w-full items-center justify-between p-4 transition-colors hover:bg-white/5"
        >
          <span className="font-medium">Camera Angle</span>
          <ChevronDown
            className={clsx(
              'h-5 w-5 transition-transform',
              openSection === 'camera_angle' && 'rotate-180'
            )}
          />
        </button>
        <AnimatePresence>
          {openSection === 'camera_angle' && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-3 gap-2 p-4">
                {CAMERA_ANGLES.map(angle => (
                  <button
                    key={angle.id}
                    onClick={() => updateSettings({ cameraAngle: angle.id })}
                    className={clsx(
                      'flex flex-col items-center gap-2 rounded-lg border p-2 transition-colors',
                      generationSettings.cameraAngle === angle.id
                        ? 'border-blue-500 bg-blue-500/20'
                        : 'border-transparent bg-black/20 hover:bg-white/5'
                    )}
                  >
                    <div className="aspect-square w-full rounded-md bg-white/10" />
                    <span className="text-center text-xs">{angle.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Location & Lighting (Text Inputs) */}
      <div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-lg">
        <div>
          <label className="mb-2 block text-xs font-medium text-gray-400 uppercase">Location</label>
          <textarea
            value={generationSettings.location}
            onChange={e => updateSettings({ location: e.target.value })}
            placeholder="Describe the location..."
            className="h-20 w-full resize-none rounded-lg border border-white/10 bg-black/20 p-3 text-sm focus:border-blue-500/50 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-2 block text-xs font-medium text-gray-400 uppercase">Lighting</label>
          <textarea
            value={generationSettings.lighting}
            onChange={e => updateSettings({ lighting: e.target.value })}
            placeholder="Describe the lighting..."
            className="h-20 w-full resize-none rounded-lg border border-white/10 bg-black/20 p-3 text-sm focus:border-blue-500/50 focus:outline-none"
          />
        </div>
      </div>

      {/* Resolution & Ratio */}
      <div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-lg">
        <div>
          <label className="mb-2 block text-xs font-medium text-gray-400 uppercase">
            Resolution
          </label>
          <div className="flex gap-2">
            {RESOLUTIONS.map(res => (
              <button
                key={res.id}
                onClick={() => updateSettings({ resolution: res.id as any })}
                className={clsx(
                  'flex-1 rounded-lg border py-2 text-sm font-medium transition-colors',
                  generationSettings.resolution === res.id
                    ? 'border-white bg-white text-black'
                    : 'border-white/10 bg-black/20 hover:bg-white/5'
                )}
              >
                {res.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-medium text-gray-400 uppercase">
            Aspect Ratio
          </label>
          <div className="flex gap-2">
            {RATIOS.map(ratio => (
              <button
                key={ratio.id}
                onClick={() => updateSettings({ aspectRatio: ratio.id as any })}
                className={clsx(
                  'flex flex-1 items-center justify-center gap-2 rounded-lg border py-2 text-sm font-medium transition-colors',
                  generationSettings.aspectRatio === ratio.id
                    ? 'border-white bg-white text-black'
                    : 'border-white/10 bg-black/20 hover:bg-white/5'
                )}
              >
                <ratio.icon className="h-4 w-4" />
                {ratio.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
