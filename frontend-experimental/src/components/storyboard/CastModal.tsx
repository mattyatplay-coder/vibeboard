"use client";

import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

interface CastModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
}

export function CastModal({ isOpen, onClose, projectId }: CastModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="relative w-full max-w-sm bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-1 bg-black/5 hover:bg-black/10 rounded-full text-gray-500 transition-colors z-10"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {/* Content */}
                        <div className="p-6 pt-12 text-center">
                            {/* Avatar Grid Placeholder */}
                            <div className="grid grid-cols-3 gap-2 mb-6 opacity-80">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                                        <img
                                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`}
                                            alt="Cast member"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                ))}
                            </div>

                            <h2 className="text-xl font-bold text-gray-900 mb-2">See your cast in Elements</h2>
                            <p className="text-sm text-gray-500 mb-8">
                                Check out this project's characters, major props, locations, and more, in the Elements section.
                            </p>

                            <div className="flex items-center justify-center gap-3">
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                                >
                                    Got it
                                </button>
                                <Link
                                    href={`/projects/${projectId}/elements`}
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-blue-600/20"
                                >
                                    Explore Elements
                                </Link>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
