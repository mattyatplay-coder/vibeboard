import React, { useState, useRef, useEffect } from 'react';
import { Loader2, Upload, Sliders, Save, Layers, Eraser } from 'lucide-react';
import { toast } from 'sonner';

interface TattooPlacementPanelProps {
    initialImageUrl?: string;
}

export function TattooPlacementPanel({ initialImageUrl }: TattooPlacementPanelProps) {
    const [baseImage, setBaseImage] = useState<File | null>(null);
    const [tattooImage, setTattooImage] = useState<File | null>(null);
    const [maskImage, setMaskImage] = useState<File | null>(null); // New Mask
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isLoadingInitial, setIsLoadingInitial] = useState(false);
    const initialLoadedRef = useRef(false);

    // Parameters
    const [opacity, setOpacity] = useState(0.85);
    const [xOffset, setXOffset] = useState(60);
    const [yOffset, setYOffset] = useState(0); // New Y Offset
    const [widthRatio, setWidthRatio] = useState(0.4);
    const [removeBackground, setRemoveBackground] = useState(false);

    const [isProcessing, setIsProcessing] = useState(false);

    // Debounce processing
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Load initial image from URL if provided
    useEffect(() => {
        if (!initialImageUrl || initialLoadedRef.current) return;
        initialLoadedRef.current = true;

        const loadInitialImage = async () => {
            setIsLoadingInitial(true);
            try {
                const response = await fetch(initialImageUrl);
                if (!response.ok) throw new Error('Failed to fetch image');
                const blob = await response.blob();
                const file = new File([blob], 'initial-image.png', { type: blob.type || 'image/png' });
                setBaseImage(file);
                toast.success('Image loaded');
            } catch (err) {
                console.error('Failed to load initial image:', err);
                toast.error('Failed to load image');
            } finally {
                setIsLoadingInitial(false);
            }
        };

        loadInitialImage();
    }, [initialImageUrl]);

    useEffect(() => {
        if (baseImage && tattooImage) {
            updatePreview();
        }
    }, [opacity, xOffset, yOffset, widthRatio, removeBackground, baseImage, tattooImage, maskImage]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'base' | 'tattoo' | 'mask') => {
        if (e.target.files?.[0]) {
            if (type === 'base') setBaseImage(e.target.files[0]);
            else if (type === 'tattoo') setTattooImage(e.target.files[0]);
            else setMaskImage(e.target.files[0]);
        }
    };

    const updatePreview = async () => {
        if (!baseImage || !tattooImage) return;

        // Debounce
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        timeoutRef.current = setTimeout(async () => {
            setIsProcessing(true);
            try {
                const formData = new FormData();
                formData.append('base_image', baseImage);
                formData.append('tattoo_image', tattooImage);
                if (maskImage) formData.append('mask_image', maskImage);

                formData.append('opacity', opacity.toString());
                formData.append('xOffset', xOffset.toString());
                formData.append('yOffset', yOffset.toString()); // Send Y
                formData.append('widthRatio', widthRatio.toString());
                formData.append('removeBackground', removeBackground.toString());

                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/process/tattoo-composite`, {
                    method: 'POST',
                    body: formData
                });

                if (!res.ok) throw new Error("Processing failed");

                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                setPreviewUrl(prev => {
                    if (prev) URL.revokeObjectURL(prev);
                    return url;
                });

            } catch (err) {
                console.error(err);
                toast.error("Failed to update preview");
            } finally {
                setIsProcessing(false);
            }
        }, 500); // 500ms delay
    };

    const handleDownload = () => {
        if (!previewUrl) return;
        const link = document.createElement('a');
        link.href = previewUrl;
        link.download = `tattoo_composite_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Image downloaded");
    };

    return (
        <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 h-full flex flex-col">
            <h2 className="text-xl font-bold flex items-center gap-2 mb-6 text-purple-400">
                <Layers className="w-6 h-6" />
                Tattoo Studio
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full">

                {/* Left: Controls */}
                <div className="space-y-6">
                    {/* Uploads */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400 block">Base Skin</label>
                            <label className="border border-dashed border-white/20 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-colors h-32 relative">
                                {baseImage ? (
                                    <img src={URL.createObjectURL(baseImage)} className="absolute inset-0 w-full h-full object-cover opacity-50 rounded-lg" />
                                ) : (
                                    <Upload className="w-6 h-6 text-gray-500 mb-2" />
                                )}
                                <span className="text-xs text-gray-400 text-center z-10">{baseImage ? "Change Photo" : "Select Photo"}</span>
                                <input type="file" accept="image/*" className="hidden" onChange={e => handleFileSelect(e, 'base')} />
                            </label>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400 block">Tattoo Design</label>
                            <label className="border border-dashed border-white/20 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-colors h-32 relative">
                                {tattooImage ? (
                                    <img src={URL.createObjectURL(tattooImage)} className="absolute inset-0 w-full h-full object-contain opacity-50 rounded-lg p-2" />
                                ) : (
                                    <Upload className="w-6 h-6 text-gray-500 mb-2" />
                                )}
                                <span className="text-xs text-gray-400 text-center z-10">{tattooImage ? "Change Design" : "Select PNG"}</span>
                                <input type="file" accept="image/png" className="hidden" onChange={e => handleFileSelect(e, 'tattoo')} />
                            </label>
                        </div>
                    </div>

                    {/* Masking Input */}
                    <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-xs font-medium text-gray-400 flex items-center gap-2">
                                <Eraser className="w-3 h-3" /> Optional Mask
                            </label>
                            {maskImage && (
                                <button onClick={() => setMaskImage(null)} className="text-[10px] text-red-400 hover:text-red-300">Remove</button>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <label className="flex-1 cursor-pointer">
                                <div className="text-xs text-center border border-dashed border-gray-600 rounded bg-black/20 py-2 hover:bg-white/5 transition-colors">
                                    {maskImage ? maskImage.name : "Upload Black/White Mask"}
                                </div>
                                <input type="file" accept="image/*" className="hidden" onChange={e => handleFileSelect(e, 'mask')} />
                            </label>
                        </div>
                        <p className="text-[10px] text-gray-600 mt-1">White areas in mask will be erased from tattoo.</p>
                    </div>

                    {/* Sliders */}
                    <div className="space-y-4 p-4 bg-black/20 rounded-lg border border-white/5">
                        <div className="flex items-center gap-2 mb-2 text-purple-300">
                            <Sliders className="w-4 h-4" />
                            <span className="font-medium text-sm">Fine Tuning</span>
                        </div>

                        <div>
                            <label className="flex items-center gap-2 text-xs text-gray-400 mb-4 cursor-pointer hover:text-white transition-colors">
                                <input
                                    type="checkbox"
                                    checked={removeBackground}
                                    onChange={e => setRemoveBackground(e.target.checked)}
                                    className="w-4 h-4 rounded bg-white/10 border-white/20 accent-purple-500"
                                />
                                <span>Remove White Background (Dark Mode)</span>
                            </label>
                        </div>

                        <div>
                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                                <span>Opacity</span>
                                <span>{Math.round(opacity * 100)}%</span>
                            </div>
                            <input
                                type="range" min="0.1" max="1.0" step="0.05"
                                value={opacity}
                                onChange={e => setOpacity(parseFloat(e.target.value))}
                                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                            />
                        </div>

                        {/* X / Y Position Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="flex justify-between text-xs text-gray-400 mb-1">
                                    <span>X Offset</span>
                                    <span>{xOffset}px</span>
                                </div>
                                <input
                                    type="range" min="-300" max="300" step="10"
                                    value={xOffset}
                                    onChange={e => setXOffset(parseInt(e.target.value))}
                                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                />
                            </div>
                            <div>
                                <div className="flex justify-between text-xs text-gray-400 mb-1">
                                    <span>Y Offset</span>
                                    <span>{yOffset}px</span>
                                </div>
                                <input
                                    type="range" min="-300" max="300" step="10"
                                    value={yOffset}
                                    onChange={e => setYOffset(parseInt(e.target.value))}
                                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                                <span>Scale</span>
                                <span>{Math.round(widthRatio * 100)}%</span>
                            </div>
                            <input
                                type="range" min="0.1" max="0.9" step="0.05"
                                value={widthRatio}
                                onChange={e => setWidthRatio(parseFloat(e.target.value))}
                                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Right: Preview */}
                <div className="bg-black/40 rounded-lg overflow-hidden border border-white/10 flex items-center justify-center relative min-h-[400px]">
                    {!baseImage && !tattooImage && (
                        isLoadingInitial ? (
                            <div className="text-center">
                                <Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto mb-2" />
                                <p className="text-gray-400 text-sm">Loading image...</p>
                            </div>
                        ) : (
                            <p className="text-gray-600 text-sm">Upload images to start</p>
                        )
                    )}

                    {isProcessing && (
                        <div className="absolute inset-0 bg-black/60 z-10 flex items-center justify-center backdrop-blur-sm">
                            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                        </div>
                    )}

                    {previewUrl ? (
                        <div className="relative w-full h-full flex flex-col">
                            <img src={previewUrl} className="flex-1 object-contain w-full h-full" alt="Composite Preview" />
                            <div className="absolute bottom-4 right-4">
                                <button
                                    onClick={handleDownload}
                                    className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg text-sm"
                                >
                                    <Save className="w-4 h-4" /> Download
                                </button>
                            </div>
                        </div>
                    ) : (
                        baseImage && <img src={URL.createObjectURL(baseImage)} className="max-w-full max-h-full object-contain opacity-50" />
                    )}
                </div>
            </div>
        </div>
    );
}
