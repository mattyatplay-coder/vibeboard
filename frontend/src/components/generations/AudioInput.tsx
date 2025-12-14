"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Upload, X, Play, Square, Loader2, Music } from "lucide-react";
import { clsx } from "clsx";

interface AudioInputProps {
    onAudioChange: (file: File | null) => void;
    className?: string;
}

export function AudioInput({ onAudioChange, className }: AudioInputProps) {
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        return () => {
            if (audioUrl) URL.revokeObjectURL(audioUrl);
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [audioUrl]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAudioFile(file);
            const url = URL.createObjectURL(file);
            setAudioUrl(url);
            onAudioChange(file);
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const file = new File([audioBlob], "recording.webm", { type: 'audio/webm' });
                setAudioFile(file);
                const url = URL.createObjectURL(file);
                setAudioUrl(url);
                onAudioChange(file);

                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);

            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

        } catch (err) {
            console.error("Error accessing microphone:", err);
            alert("Could not access microphone. Please check permissions.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
        }
    };

    const clearAudio = () => {
        setAudioFile(null);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
        onAudioChange(null);
        setIsPlaying(false);
    };

    const togglePlayback = () => {
        if (!audioPlayerRef.current || !audioUrl) return;

        if (isPlaying) {
            audioPlayerRef.current.pause();
            setIsPlaying(false);
        } else {
            audioPlayerRef.current.play();
            setIsPlaying(true);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className={clsx("bg-[#1a1a1a] border border-white/10 rounded-xl p-4", className)}>
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-white flex items-center gap-2">
                    <Music className="w-4 h-4 text-blue-400" />
                    Audio Source
                    <span className="text-xs text-gray-500 font-normal ml-2">Required for Avatar models</span>
                </h3>
                {audioFile && (
                    <button
                        onClick={clearAudio}
                        className="text-gray-500 hover:text-white transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {!audioFile && !isRecording ? (
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex flex-col items-center justify-center gap-2 p-4 border border-dashed border-white/20 rounded-lg hover:bg-white/5 transition-colors group"
                    >
                        <Upload className="w-5 h-5 text-gray-400 group-hover:text-blue-400 transition-colors" />
                        <span className="text-xs text-gray-400 group-hover:text-gray-200">Upload Audio</span>
                    </button>
                    <button
                        onClick={startRecording}
                        className="flex flex-col items-center justify-center gap-2 p-4 border border-dashed border-white/20 rounded-lg hover:bg-white/5 transition-colors group"
                    >
                        <Mic className="w-5 h-5 text-gray-400 group-hover:text-red-400 transition-colors" />
                        <span className="text-xs text-gray-400 group-hover:text-gray-200">Record Mic</span>
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="audio/*"
                        className="hidden"
                    />
                </div>
            ) : isRecording ? (
                <div className="flex items-center justify-between p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-sm font-medium text-red-400">Recording... {formatTime(recordingTime)}</span>
                    </div>
                    <button
                        onClick={stopRecording}
                        className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                    >
                        <Square className="w-4 h-4 fill-current" />
                    </button>
                </div>
            ) : (
                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
                    <button
                        onClick={togglePlayback}
                        className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors"
                    >
                        {isPlaying ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                    </button>

                    <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">
                            {audioFile?.name || "Recorded Audio"}
                        </p>
                        <p className="text-xs text-gray-500">
                            {(audioFile?.size ? (audioFile.size / 1024 / 1024).toFixed(2) : "0")} MB
                        </p>
                    </div>

                    <audio
                        ref={audioPlayerRef}
                        src={audioUrl || undefined}
                        onEnded={() => setIsPlaying(false)}
                        className="hidden"
                    />
                </div>
            )}
        </div>
    );
}
