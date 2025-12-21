"use client";

import { X, Check } from "lucide-react";
import { Element } from "@/lib/store";
import { clsx } from "clsx";

interface ElementPickerProps {
    isOpen: boolean;
    onClose: () => void;
    elements: Element[];
    selectedElementIds: string[];
    onToggleElement: (element: Element) => void;
}

export function ElementPicker({ isOpen, onClose, elements, selectedElementIds, onToggleElement }: ElementPickerProps) {
    console.log("ElementPicker elements:", elements);
    if (!isOpen) return null;

    return (
        <div className="absolute bottom-full right-0 mb-4 w-96 bg-[#1a1a1a] border border-white/20 rounded-xl shadow-2xl z-50 flex flex-col max-h-[500px] animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Select Elements</h3>
                <button onClick={onClose} className="text-gray-400 hover:text-white">
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="p-2 overflow-y-auto flex-1 space-y-4">
                {elements.length === 0 ? (
                    <div className="py-8 text-center text-gray-500 text-sm">
                        No elements found. Upload some in the Elements tab!
                    </div>
                ) : (
                    Object.entries(
                        elements.reduce((acc, el) => {
                            const sessionName = el.session?.name || "Global / Unassigned";
                            if (!acc[sessionName]) acc[sessionName] = [];
                            acc[sessionName].push(el);
                            return acc;
                        }, {} as Record<string, Element[]>)
                    ).map(([sessionName, sessionElements]) => (
                        <div key={sessionName}>
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">{sessionName}</h4>
                            <div className="grid grid-cols-3 gap-2">
                                {sessionElements.map((el) => {
                                    const isSelected = selectedElementIds.includes(el.id);
                                    return (
                                        <button
                                            key={el.id}
                                            onClick={() => onToggleElement(el)}
                                            className={clsx(
                                                "relative aspect-square rounded-lg overflow-hidden group border-2 transition-all",
                                                isSelected ? "border-blue-500" : "border-transparent hover:border-white/20"
                                            )}
                                        >
                                            {el.type === 'video' ? (
                                                <video src={el.url} className="w-full h-full object-cover" />
                                            ) : (
                                                <img src={el.url} className="w-full h-full object-cover" />
                                            )}

                                            <div className={clsx(
                                                "absolute inset-0 bg-black/40 transition-opacity flex items-center justify-center",
                                                isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                            )}>
                                                {isSelected && <Check className="w-6 h-6 text-blue-500" />}
                                            </div>

                                            <div className="absolute bottom-0 left-0 right-0 p-1 bg-black/60 text-[10px] text-white truncate">
                                                {el.name}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
