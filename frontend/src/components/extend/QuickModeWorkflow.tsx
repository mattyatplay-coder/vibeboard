'use client';

import React, { useState, useRef } from 'react';
import {
    Box,
    Paper,
    Typography,
    Button,
    Stepper,
    Step,
    StepLabel,
    CircularProgress,
    TextField,
    Alert
} from '@mui/material';
import { CloudUpload, AutoAwesome, Movie } from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';

interface QuickModeWorkflowProps {
    projectId: string;
}

export default function QuickModeWorkflow({ projectId }: QuickModeWorkflowProps) {
    const [activeStep, setActiveStep] = useState(0);
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationJob, setGenerationJob] = useState<any>(null);

    const onDrop = (acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            setVideoFile(acceptedFiles[0]);
            analyzeVideo(acceptedFiles[0]);
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'video/*': [] },
        maxFiles: 1
    });

    const analyzeVideo = async (file: File) => {
        setIsAnalyzing(true);
        setActiveStep(1);

        try {
            const formData = new FormData();
            formData.append('video', file);
            formData.append('projectId', projectId);

            const response = await fetch('/api/extend/analyze', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            setAnalysisResult(data);

            // Auto-recommend model
            const recResponse = await fetch('/api/extend/recommend-model', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    metadata: data.metadata,
                    detectedCharacters: data.detectedCharacters
                })
            });
            const recData = await recResponse.json();
            setAnalysisResult((prev: any) => ({ ...prev, recommendation: recData }));

        } catch (error) {
            console.error("Analysis failed:", error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        setActiveStep(2);

        try {
            // Enhance prompt first
            const enhanceResponse = await fetch('/api/extend/enhance-prompt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    projectStyle: analysisResult.metadata, // Using metadata as proxy for style
                    characters: analysisResult.detectedCharacters
                })
            });
            const enhanceData = await enhanceResponse.json();

            // Generate
            const generateResponse = await fetch('/api/extend/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId,
                    startFrame: analysisResult.startFrame.imageUrl, // In real app, this would be the actual image data/url
                    prompt: enhanceData.enhanced,
                    model: analysisResult.recommendation.recommendedModel.id,
                    duration: 5,
                    mode: 'extend_video'
                })
            });

            const job = await generateResponse.json();
            setGenerationJob(job);

            // Poll for status (simplified)
            // In real app, use a proper polling hook or socket

        } catch (error) {
            console.error("Generation failed:", error);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Box sx={{ maxWidth: 800, mx: 'auto' }}>
            <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
                <Step><StepLabel>Upload Video</StepLabel></Step>
                <Step><StepLabel>Analyze & Prompt</StepLabel></Step>
                <Step><StepLabel>Generate</StepLabel></Step>
            </Stepper>

            {activeStep === 0 && (
                <Paper
                    {...getRootProps()}
                    sx={{
                        p: 6,
                        textAlign: 'center',
                        border: '2px dashed',
                        borderColor: isDragActive ? 'primary.main' : 'divider',
                        cursor: 'pointer',
                        bgcolor: isDragActive ? 'action.hover' : 'background.paper'
                    }}
                >
                    <input {...getInputProps()} />
                    <CloudUpload sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h5" gutterBottom>
                        Drag & Drop Source Video
                    </Typography>
                    <Typography color="text.secondary">
                        or click to browse
                    </Typography>
                </Paper>
            )}

            {activeStep === 1 && analysisResult && (
                <Box>
                    <Alert severity="success" sx={{ mb: 3 }}>
                        Video analyzed! Detected {analysisResult.detectedCharacters.length} characters and {analysisResult.metadata.style[0]} style.
                    </Alert>

                    <Paper sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            What happens next?
                        </Typography>
                        <TextField
                            fullWidth
                            multiline
                            rows={3}
                            label="Describe the next action..."
                            placeholder="e.g. The character turns around and walks away"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            sx={{ mb: 2 }}
                        />

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                            <AutoAwesome color="primary" />
                            <Typography variant="body2" color="text.secondary">
                                We'll use <strong>{analysisResult.recommendation.recommendedModel.name}</strong> ({analysisResult.recommendation.reason})
                            </Typography>
                        </Box>

                        <Button
                            variant="contained"
                            fullWidth
                            size="large"
                            onClick={handleGenerate}
                            disabled={!prompt}
                            startIcon={<Movie />}
                        >
                            Generate Extension
                        </Button>
                    </Paper>
                </Box>
            )}

            {activeStep === 2 && (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                    {isGenerating ? (
                        <>
                            <CircularProgress size={60} sx={{ mb: 4 }} />
                            <Typography variant="h5" gutterBottom>
                                Generating your video...
                            </Typography>
                            <Typography color="text.secondary">
                                This usually takes 2-3 minutes.
                            </Typography>
                        </>
                    ) : (
                        <Box>
                            <Typography variant="h5" gutterBottom>
                                Generation Queued!
                            </Typography>
                            <Typography color="text.secondary" paragraph>
                                Job ID: {generationJob?.id}
                            </Typography>
                            <Button variant="outlined" onClick={() => setActiveStep(0)}>
                                Start Another
                            </Button>
                        </Box>
                    )}
                </Box>
            )}
        </Box>
    );
}
