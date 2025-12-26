import { useState, useEffect } from 'react';
import { fetchAPI } from '@/lib/api';
import { Plus, Trash2, Check, Settings2 } from 'lucide-react';
import { clsx } from 'clsx';

interface ModelParameter {
  id: string;
  type: 'sampler' | 'scheduler';
  name: string;
  value: string;
}

interface ParameterManagerProps {
  projectId: string;
  type: 'sampler' | 'scheduler';
  isOpen: boolean;
  onClose: () => void;
  selectedId?: string;
  onSelect?: (parameter: ModelParameter | null) => void;
  embedded?: boolean;
}

export function ParameterManager({
  projectId,
  type,
  isOpen,
  onClose,
  selectedId,
  onSelect,
  embedded = false,
}: ParameterManagerProps) {
  const [parameters, setParameters] = useState<ModelParameter[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [value, setValue] = useState('');

  const COMMON_PRESETS = {
    sampler: [
      { name: 'Euler a', value: 'euler_a' },
      { name: 'Euler', value: 'euler' },
      { name: 'DPM++ 2M Karras', value: 'dpmpp_2m_karras' },
      { name: 'DPM++ SDE Karras', value: 'dpmpp_sde_karras' },
      { name: 'DDIM', value: 'ddim' },
      { name: 'Flow Match Euler', value: 'flow_match_euler' },
    ],
    scheduler: [
      { name: 'Simple', value: 'simple' },
      { name: 'Karras', value: 'karras' },
      { name: 'SGM Uniform', value: 'sgm_uniform' },
      { name: 'Beta', value: 'beta' },
      { name: 'Linear', value: 'linear' },
    ],
  };

  useEffect(() => {
    if (isOpen) {
      loadParameters();
    }
  }, [isOpen, projectId, type]);

  const loadParameters = async () => {
    try {
      const data = await fetchAPI(`/projects/${projectId}/parameters?type=${type}`);
      setParameters(data);
    } catch (err) {
      console.error('Failed to load parameters', err);
    }
  };

  const handleAdd = async (presetName?: string, presetValue?: string) => {
    const nameToSend = presetName || name;
    const valueToSend = presetValue || value;

    if (!nameToSend || !valueToSend) return;

    try {
      await fetchAPI(`/projects/${projectId}/parameters`, {
        method: 'POST',
        body: JSON.stringify({
          type,
          name: nameToSend,
          value: valueToSend,
        }),
      });
      setName('');
      setValue('');
      setIsAdding(false);
      loadParameters();
    } catch (err: any) {
      console.error('Failed to create parameter', err);
      setError(err.message || `Failed to add ${type}`);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to remove this ${type}?`)) return;
    try {
      await fetchAPI(`/projects/${projectId}/parameters/${id}`, {
        method: 'DELETE',
      });
      loadParameters();
      if (selectedId === id && onSelect) {
        onSelect(null);
      }
    } catch (err) {
      console.error(`Failed to delete ${type}`, err);
    }
  };

  if (!isOpen) return null;

  const content = (
    <div
      className={clsx(
        'flex flex-col overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1a] shadow-2xl',
        embedded
          ? 'h-full max-h-full w-full max-w-[400px] min-w-[300px]'
          : 'max-h-[85vh] w-full max-w-4xl'
      )}
    >
      <div className="flex items-center justify-between border-b border-white/10 p-4">
        <h2 className="text-lg font-bold text-white capitalize">{type}s</h2>
        {!embedded && (
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            ✕
          </button>
        )}
      </div>

      <div className="show-scrollbar-on-hover flex-1 overflow-y-auto p-4">
        {isAdding ? (
          <div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-sm font-medium text-white">
              Add New {type === 'sampler' ? 'Sampler' : 'Scheduler'}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-gray-400">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={type === 'sampler' ? 'e.g. DPM++ 2M Karras' : 'e.g. Karras'}
                  className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-400">API Value</label>
                <input
                  type="text"
                  value={value}
                  onChange={e => setValue(e.target.value)}
                  placeholder={type === 'sampler' ? 'e.g. dpmpp_2m_karras' : 'e.g. karras'}
                  className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 font-mono text-sm text-white outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {error && <div className="px-1 text-xs text-red-400">{error}</div>}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsAdding(false)}
                className="px-3 py-1.5 text-xs text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAdd()}
                disabled={!name || !value}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              onClick={() => setIsAdding(true)}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/20 py-2 text-sm text-gray-400 transition-all hover:border-white/40 hover:bg-white/5 hover:text-white"
            >
              <Plus className="h-4 w-4" />
              Add New {type === 'sampler' ? 'Sampler' : 'Scheduler'}
            </button>

            {/* Quick Add Presets */}
            <div className="mb-4 border-b border-white/10 pb-4">
              <p className="mb-2 text-[10px] font-bold tracking-wider text-gray-500 uppercase">
                Quick Add Popular
              </p>
              <div className="flex flex-wrap gap-2">
                {COMMON_PRESETS[type].map(preset => {
                  const isAdded = parameters.some(p => p.value === preset.value);
                  return (
                    <button
                      key={preset.value}
                      onClick={() => !isAdded && handleAdd(preset.name, preset.value)}
                      disabled={isAdded}
                      className={clsx(
                        'rounded border px-2 py-1 text-xs transition-colors',
                        isAdded
                          ? 'cursor-default border-blue-500/50 bg-blue-500/20 text-blue-300'
                          : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
                      )}
                    >
                      {isAdded ? '✓ ' : '+ '}
                      {preset.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              {parameters.map((param, index) => {
                const isSelected = selectedId === param.id;
                return (
                  <div
                    key={param.id || `param-${index}`}
                    className={clsx(
                      'flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors',
                      isSelected
                        ? 'border-blue-500/50 bg-blue-500/10'
                        : 'border-white/5 bg-white/5 hover:border-white/10'
                    )}
                    onClick={() => onSelect && onSelect(isSelected ? null : param)}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div
                        className={clsx(
                          'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded border',
                          isSelected
                            ? 'border-blue-400 bg-blue-500 text-white'
                            : 'border-white/10 bg-white/5 text-gray-500'
                        )}
                      >
                        {isSelected ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Settings2 className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4
                          className={clsx(
                            'truncate text-sm font-medium',
                            isSelected ? 'text-blue-200' : 'text-white'
                          )}
                        >
                          {param.name}
                        </h4>
                        <div className="truncate font-mono text-[10px] text-gray-500">
                          {param.value}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={e => handleDelete(param.id, e)}
                      className="p-1.5 text-gray-500 transition-colors hover:text-red-400"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
              {parameters.length === 0 && !isLoading && (
                <p className="py-4 text-center text-xs text-gray-500">No {type}s added yet.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      {content}
    </div>
  );
}
