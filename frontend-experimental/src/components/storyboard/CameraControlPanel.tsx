import React from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ZoomIn, ZoomOut, Move, RotateCw, RotateCcw } from 'lucide-react';

export interface CameraMovement {
    type: 'pan' | 'tilt' | 'zoom' | 'roll' | 'static';
    direction?: 'left' | 'right' | 'up' | 'down' | 'in' | 'out' | 'cw' | 'ccw';
    intensity?: number; // 1-10
}

interface CameraControlPanelProps {
    value: CameraMovement;
    onChange: (value: CameraMovement) => void;
}

export function CameraControlPanel({ value, onChange }: CameraControlPanelProps) {
    const handleDirection = (type: CameraMovement['type'], direction: CameraMovement['direction']) => {
        onChange({ type, direction, intensity: 5 });
    };

    const isActive = (type: string, dir?: string) => {
        if (value.type !== type) return false;
        if (dir && value.direction !== dir) return false;
        return true;
    };

    const btnClass = (active: boolean) =>
        `p-2 rounded-lg border transition-all ${active
            ? 'bg-blue-500/20 border-blue-500 text-blue-400'
            : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-400'}`;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-zinc-300">Camera Movement</label>
                {value.type !== 'static' && (
                    <button
                        onClick={() => onChange({ type: 'static' })}
                        className="text-xs text-zinc-500 hover:text-zinc-300"
                    >
                        Reset
                    </button>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
                {/* Pan & Tilt Control Pad */}
                <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800 flex flex-col items-center justify-center gap-2">
                    <span className="text-xs text-zinc-500 mb-1">Pan & Tilt</span>
                    <div className="grid grid-cols-3 gap-1">
                        <div />
                        <button
                            className={btnClass(isActive('tilt', 'up'))}
                            onClick={() => handleDirection('tilt', 'up')}
                            title="Tilt Up"
                        >
                            <ArrowUp size={16} />
                        </button>
                        <div />

                        <button
                            className={btnClass(isActive('pan', 'left'))}
                            onClick={() => handleDirection('pan', 'left')}
                            title="Pan Left"
                        >
                            <ArrowLeft size={16} />
                        </button>
                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                            <Move size={14} className="text-zinc-600" />
                        </div>
                        <button
                            className={btnClass(isActive('pan', 'right'))}
                            onClick={() => handleDirection('pan', 'right')}
                            title="Pan Right"
                        >
                            <ArrowRight size={16} />
                        </button>

                        <div />
                        <button
                            className={btnClass(isActive('tilt', 'down'))}
                            onClick={() => handleDirection('tilt', 'down')}
                            title="Tilt Down"
                        >
                            <ArrowDown size={16} />
                        </button>
                        <div />
                    </div>
                </div>

                {/* Zoom & Roll */}
                <div className="space-y-3">
                    <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800">
                        <span className="text-xs text-zinc-500 block mb-2">Zoom</span>
                        <div className="flex gap-2">
                            <button
                                className={`flex-1 flex items-center justify-center gap-2 ${btnClass(isActive('zoom', 'in'))}`}
                                onClick={() => handleDirection('zoom', 'in')}
                            >
                                <ZoomIn size={16} />
                                <span className="text-xs">In</span>
                            </button>
                            <button
                                className={`flex-1 flex items-center justify-center gap-2 ${btnClass(isActive('zoom', 'out'))}`}
                                onClick={() => handleDirection('zoom', 'out')}
                            >
                                <ZoomOut size={16} />
                                <span className="text-xs">Out</span>
                            </button>
                        </div>
                    </div>

                    <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800">
                        <span className="text-xs text-zinc-500 block mb-2">Roll</span>
                        <div className="flex gap-2">
                            <button
                                className={`flex-1 flex items-center justify-center gap-2 ${btnClass(isActive('roll', 'ccw'))}`}
                                onClick={() => handleDirection('roll', 'ccw')}
                            >
                                <RotateCcw size={16} />
                                <span className="text-xs">CCW</span>
                            </button>
                            <button
                                className={`flex-1 flex items-center justify-center gap-2 ${btnClass(isActive('roll', 'cw'))}`}
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
                        onChange={(e) => onChange({ ...value, intensity: parseInt(e.target.value) })}
                        className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                </div>
            )}
        </div>
    );
}
