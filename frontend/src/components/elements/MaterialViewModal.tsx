'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Layers, Circle, Mountain, Sparkles, Sun, ArrowUp } from 'lucide-react';
import { clsx } from 'clsx';

interface PBRMaps {
  albedo?: string;
  normal?: string;
  roughness?: string;
  metallic?: string;
  ao?: string;
  height?: string;
}

interface MaterialViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  elementName: string;
  pbrMaps: PBRMaps;
}

const MAP_INFO = {
  albedo: {
    label: 'Albedo',
    description: 'Base color without lighting',
    icon: Circle,
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/20',
  },
  normal: {
    label: 'Normal',
    description: 'Surface detail and bumps',
    icon: Mountain,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
  },
  roughness: {
    label: 'Roughness',
    description: 'Surface smoothness',
    icon: Sparkles,
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/20',
  },
  metallic: {
    label: 'Metallic',
    description: 'Metal vs non-metal',
    icon: Layers,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
  },
  ao: {
    label: 'Ambient Occlusion',
    description: 'Soft shadows in crevices',
    icon: Sun,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
  },
  height: {
    label: 'Height',
    description: 'Displacement depth',
    icon: ArrowUp,
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
  },
};

export function MaterialViewModal({
  isOpen,
  onClose,
  elementName,
  pbrMaps,
}: MaterialViewModalProps) {
  const [selectedMap, setSelectedMap] = useState<keyof PBRMaps | null>(null);

  const availableMaps = Object.entries(pbrMaps).filter(([_, url]) => url) as [
    keyof PBRMaps,
    string,
  ][];

  const handleDownload = (mapType: keyof PBRMaps, url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `${elementName}_${mapType}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAll = () => {
    availableMaps.forEach(([mapType, url]) => {
      setTimeout(() => handleDownload(mapType, url), 100);
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-zinc-900"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <div>
                <h2 className="text-xl font-bold">PBR Material Maps</h2>
                <p className="text-sm text-gray-400">{elementName}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadAll}
                  className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
                >
                  <Download className="h-4 w-4" />
                  Download All
                </button>
                <button
                  onClick={onClose}
                  className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto p-4">
              {/* Grid of maps */}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {availableMaps.map(([mapType, url]) => {
                  const info = MAP_INFO[mapType];
                  const Icon = info.icon;

                  return (
                    <motion.div
                      key={mapType}
                      className={clsx(
                        'group relative cursor-pointer overflow-hidden rounded-xl border transition-all',
                        selectedMap === mapType
                          ? 'border-blue-500 ring-2 ring-blue-500/50'
                          : 'border-white/10 hover:border-white/20'
                      )}
                      onClick={() => setSelectedMap(mapType === selectedMap ? null : mapType)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {/* Image */}
                      <div className="aspect-square bg-black">
                        <img
                          src={url}
                          alt={`${info.label} map`}
                          className="h-full w-full object-cover"
                        />
                      </div>

                      {/* Label overlay */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                        <div className="flex items-center gap-2">
                          <div className={clsx('rounded-lg p-1.5', info.bgColor)}>
                            <Icon className={clsx('h-4 w-4', info.color)} />
                          </div>
                          <div>
                            <p className="font-medium text-white">{info.label}</p>
                            <p className="text-xs text-gray-400">{info.description}</p>
                          </div>
                        </div>
                      </div>

                      {/* Download button on hover */}
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleDownload(mapType, url);
                        }}
                        className="absolute top-2 right-2 rounded-lg bg-black/50 p-2 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:bg-black/70"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </motion.div>
                  );
                })}
              </div>

              {/* Selected map preview */}
              {selectedMap && pbrMaps[selectedMap] && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 rounded-xl border border-white/10 bg-black/50 p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-medium">{MAP_INFO[selectedMap].label} Preview</h3>
                    <button
                      onClick={() => handleDownload(selectedMap, pbrMaps[selectedMap]!)}
                      className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </button>
                  </div>
                  <div className="max-h-96 overflow-hidden rounded-lg">
                    <img
                      src={pbrMaps[selectedMap]!}
                      alt={`${MAP_INFO[selectedMap].label} map full preview`}
                      className="w-full object-contain"
                    />
                  </div>
                </motion.div>
              )}

              {/* Empty state */}
              {availableMaps.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Layers className="mb-4 h-12 w-12 text-gray-600" />
                  <h3 className="text-lg font-medium text-gray-400">No PBR Maps Available</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Extract materials from this element to generate PBR maps.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
