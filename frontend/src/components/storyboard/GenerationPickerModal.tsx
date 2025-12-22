import { useState, useEffect } from 'react';
import { fetchAPI } from '@/lib/api';
import { X, Loader2, Play } from 'lucide-react';
import { clsx } from 'clsx';

interface GenerationPickerModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (generation: any) => void;
}

export function GenerationPickerModal({
  projectId,
  isOpen,
  onClose,
  onSelect,
}: GenerationPickerModalProps) {
  const [generations, setGenerations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadGenerations();
    }
  }, [isOpen]);

  const loadGenerations = async () => {
    setLoading(true);
    try {
      const data = await fetchAPI(`/projects/${projectId}/generations`);
      // Filter for only succeeded generations
      setGenerations(data.filter((g: any) => g.status === 'succeeded'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="flex max-h-[80vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#1a1a1a] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 p-6">
          <h2 className="text-xl font-bold text-white">Select a Shot</h2>
          <button onClick={onClose} className="text-gray-400 transition-colors hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : generations.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              No generated shots found. Go to the Generate tab to create some!
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {generations.map(gen => (
                <button
                  key={gen.id}
                  onClick={() => onSelect(gen)}
                  className="group relative aspect-video overflow-hidden rounded-lg border border-white/10 bg-black/50 text-left transition-all hover:border-blue-500 hover:ring-2 hover:ring-blue-500/50"
                >
                  {gen.outputs?.[0] ? (
                    <img src={gen.outputs[0].url} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-600">
                      No Image
                    </div>
                  )}
                  <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-transparent to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
                    <p className="line-clamp-2 text-xs text-white">{gen.inputPrompt}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
