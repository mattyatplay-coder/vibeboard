import React from 'react';
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ZoomIn,
  ZoomOut,
  Move,
  RotateCw,
  RotateCcw,
} from 'lucide-react';
import { Tooltip } from '@/components/ui/Tooltip';
import { useViewfinderStore, type CameraMovement } from '@/lib/viewfinderStore';

// Re-export CameraMovement type for backwards compatibility
export type { CameraMovement };

interface CameraControlPanelProps {
  /** Optional: Direct value control (legacy mode) */
  value?: CameraMovement;
  /** Optional: Direct onChange callback (legacy mode) */
  onChange?: (value: CameraMovement) => void;
  /**
   * If true, use global viewfinderStore instead of props.
   * This enables the "Remote Control" pattern where changes
   * are automatically reflected in DirectorViewfinder.
   * @default false
   */
  useGlobalStore?: boolean;
}

export function CameraControlPanel({
  value: propValue,
  onChange: propOnChange,
  useGlobalStore = false,
}: CameraControlPanelProps) {
  // Global store access
  const storeMovement = useViewfinderStore(state => state.cameraMovement);
  const setStoreMovement = useViewfinderStore(state => state.setCameraMovement);

  // Determine which value/onChange to use
  const value = useGlobalStore ? storeMovement : (propValue ?? { type: 'static' as const });
  const onChange = useGlobalStore ? setStoreMovement : propOnChange;

  const handleDirection = (
    type: CameraMovement['type'],
    direction: CameraMovement['direction']
  ) => {
    onChange?.({ type, direction, intensity: 5 });
  };

  const isActive = (type: string, dir?: string) => {
    if (value.type !== type) return false;
    if (dir && value.direction !== dir) return false;
    return true;
  };

  const btnClass = (active: boolean) =>
    `p-2 rounded-lg border transition-all ${
      active
        ? 'bg-blue-500/20 border-blue-500 text-blue-400'
        : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-400'
    }`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-zinc-300">Camera Movement</label>
        {value.type !== 'static' && (
          <button
            onClick={() => onChange?.({ type: 'static' })}
            className="text-xs text-zinc-500 hover:text-zinc-300"
          >
            Reset
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Pan & Tilt Control Pad */}
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
          <span className="mb-1 text-xs text-zinc-500">Pan & Tilt</span>
          <div className="grid grid-cols-3 gap-1">
            <div />
            <Tooltip content="Tilt Up" side="top">
              <button
                className={btnClass(isActive('tilt', 'up'))}
                onClick={() => handleDirection('tilt', 'up')}
              >
                <ArrowUp size={16} />
              </button>
            </Tooltip>
            <div />

            <Tooltip content="Pan Left" side="left">
              <button
                className={btnClass(isActive('pan', 'left'))}
                onClick={() => handleDirection('pan', 'left')}
              >
                <ArrowLeft size={16} />
              </button>
            </Tooltip>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800">
              <Move size={14} className="text-zinc-600" />
            </div>
            <Tooltip content="Pan Right" side="right">
              <button
                className={btnClass(isActive('pan', 'right'))}
                onClick={() => handleDirection('pan', 'right')}
              >
                <ArrowRight size={16} />
              </button>
            </Tooltip>

            <div />
            <Tooltip content="Tilt Down" side="top">
              <button
                className={btnClass(isActive('tilt', 'down'))}
                onClick={() => handleDirection('tilt', 'down')}
              >
                <ArrowDown size={16} />
              </button>
            </Tooltip>
            <div />
          </div>
        </div>

        {/* Zoom & Roll */}
        <div className="space-y-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
            <span className="mb-2 block text-xs text-zinc-500">Zoom</span>
            <div className="flex gap-2">
              <button
                className={`flex flex-1 items-center justify-center gap-2 ${btnClass(isActive('zoom', 'in'))}`}
                onClick={() => handleDirection('zoom', 'in')}
              >
                <ZoomIn size={16} />
                <span className="text-xs">In</span>
              </button>
              <button
                className={`flex flex-1 items-center justify-center gap-2 ${btnClass(isActive('zoom', 'out'))}`}
                onClick={() => handleDirection('zoom', 'out')}
              >
                <ZoomOut size={16} />
                <span className="text-xs">Out</span>
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
            <span className="mb-2 block text-xs text-zinc-500">Roll</span>
            <div className="flex gap-2">
              <button
                className={`flex flex-1 items-center justify-center gap-2 ${btnClass(isActive('roll', 'ccw'))}`}
                onClick={() => handleDirection('roll', 'ccw')}
              >
                <RotateCcw size={16} />
                <span className="text-xs">CCW</span>
              </button>
              <button
                className={`flex flex-1 items-center justify-center gap-2 ${btnClass(isActive('roll', 'cw'))}`}
                onClick={() => handleDirection('roll', 'cw')}
              >
                <RotateCw size={16} />
                <span className="text-xs">CW</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Intensity Slider */}
      {value.type !== 'static' && (
        <div className="space-y-2 pt-2">
          <div className="flex justify-between text-xs text-zinc-500">
            <span>Intensity</span>
            <span>{value.intensity || 5}</span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            value={value.intensity || 5}
            onChange={e => onChange?.({ ...value, intensity: parseInt(e.target.value) })}
            className="h-1 w-full cursor-pointer appearance-none rounded-lg bg-zinc-700 accent-blue-500"
          />
        </div>
      )}
    </div>
  );
}
