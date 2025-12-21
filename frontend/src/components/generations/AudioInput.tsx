"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Upload, X, Play, Square, Loader2, Music } from "lucide-react";
import { clsx } from "clsx";

interface AudioInputProps {
    file?: File | null;
    onAudioChange: (file: File | null) => void;
    className?: string;
}

export function AudioInput({ file, onAudioChange, className }: AudioInputProps) {
    const [audioFile, setAudioFile] = useState<File | null>(file || null);
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

            // Auto-stop and save if unmounting while recording
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
            }
            // Cleanup manual WAV recorder
            if (processorRef.current) {
                processorRef.current.disconnect();
                processorRef.current = null;
            }
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close();
                audioContextRef.current = null;
            }
        };
    }, [audioUrl]);

    // Sync from parent prop
    useEffect(() => {
        if (file !== undefined && file !== audioFile) {
            setAudioFile(file);
            // Create URL for preview if file exists
            if (file) {
                const url = URL.createObjectURL(file);
                setAudioUrl(url);
            } else {
                setAudioUrl(null);
            }
        }
    }, [file]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAudioFile(file);
            const url = URL.createObjectURL(file);
            setAudioUrl(url);
            onAudioChange(file);
        }
    };

    const audioContextRef = useRef<AudioContext | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const inputsRef = useRef<Float32Array[]>([]);

    const getSupportedMimeType = () => {
        const types = [
            { mime: 'audio/mpeg', ext: 'mp3' }, // Requested "native" for Chrome/Firefox (rarely supported, but checked first)
            { mime: 'audio/ogg', ext: 'ogg' },  // Firefox preferred
            { mime: 'audio/mp4', ext: 'm4a' },  // Safari preferred
            { mime: 'audio/aac', ext: 'aac' },
            { mime: 'audio/wav', ext: 'wav' }
        ];
        for (const t of types) {
            if (MediaRecorder.isTypeSupported(t.mime)) return t;
        }
        return null;
    };

    const writeWavHeader = (samples: Float32Array, sampleRate: number) => {
        const buffer = new ArrayBuffer(44 + samples.length * 2);
        const view = new DataView(buffer);

        const writeString = (view: DataView, offset: number, string: string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };

        writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + samples.length * 2, true);
        writeString(view, 8, 'WAVE');
        writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        writeString(view, 36, 'data');
        view.setUint32(40, samples.length * 2, true);

        const floatTo16BitPCM = (output: DataView, offset: number, input: Float32Array) => {
            for (let i = 0; i < input.length; i++, offset += 2) {
                const s = Math.max(-1, Math.min(1, input[i]));
                output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
            }
        };

        floatTo16BitPCM(view, 44, samples);
        return view;
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Try supported MediaRecorder formats first
            const supported = getSupportedMimeType();

            if (supported) {
                // Use MediaRecorder for MP4/AAC/OGG
                const mediaRecorder = new MediaRecorder(stream, { mimeType: supported.mime });
                mediaRecorderRef.current = mediaRecorder;
                audioChunksRef.current = [];

                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        audioChunksRef.current.push(event.data);
                    }
                };

                mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(audioChunksRef.current, { type: supported.mime });
                    const file = new File([audioBlob], `recording.${supported.ext}`, { type: supported.mime });
                    setAudioFile(file);
                    const url = URL.createObjectURL(file);
                    setAudioUrl(url);
                    onAudioChange(file);
                    stream.getTracks().forEach(track => track.stop());
                };

                mediaRecorder.start();
                setIsRecording(true);
            } else {
                // Fallback to WAV using AudioContext (usually Chrome/Firefox if OGG/MP4 fail)
                const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                audioContextRef.current = audioContext;
                const source = audioContext.createMediaStreamSource(stream);
                const processor = audioContext.createScriptProcessor(4096, 1, 1);
                processorRef.current = processor;
                inputsRef.current = [];

                processor.onaudioprocess = (e) => {
                    // Clone the data
                    const channel = e.inputBuffer.getChannelData(0);
                    inputsRef.current.push(new Float32Array(channel));
                };

                source.connect(processor);
                processor.connect(audioContext.destination);
                setIsRecording(true);
            }

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
        if (isRecording) {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            } else if (audioContextRef.current && processorRef.current) {
                // Stop WAV recording
                if (processorRef.current) processorRef.current.disconnect();
                if (audioContextRef.current) audioContextRef.current.close();

                // Flatten buffers
                const flattenLength = inputsRef.current.reduce((acc, buf) => acc + buf.length, 0);
                const result = new Float32Array(flattenLength);
                let offset = 0;
                for (const buf of inputsRef.current) {
                    result.set(buf, offset);
                    offset += buf.length;
                }

                // Encode WAV
                const sampleRate = audioContextRef.current?.sampleRate || 44100;
                const view = writeWavHeader(result, sampleRate);
                const blob = new Blob([view], { type: 'audio/wav' });
                const file = new File([blob], "recording.wav", { type: 'audio/wav' });

                setAudioFile(file);
                setAudioUrl(URL.createObjectURL(file));
                onAudioChange(file);

                // Reset refs
                processorRef.current = null;
                audioContextRef.current = null;
                inputsRef.current = [];
            }

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
