'use client';

import React, { useState } from 'react';
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
    Alert,
    Stack,
    Slider,
    FormControlLabel,
    Switch,
    Divider
} from '@mui/material';
import { CloudUpload, Movie, Settings, AutoAwesome, ChevronRight, ChevronLeft } from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { EngineSelectorV2 } from '../generations/EngineSelectorV2';
import CharacterLibrary from '../library/CharacterLibrary';
import { StyleSelectorModal, StyleConfig } from '../storyboard/StyleSelectorModal';

interface AdvancedModeWorkflowProps {
    projectId: string;
}

export default function AdvancedModeWorkflow({ projectId }: AdvancedModeWorkflowProps) {
    const [activeStep, setActiveStep] = useState(0);
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);

    // Step 1: Engine & Source
    const [engineConfig, setEngineConfig] = useState({ provider: 'fal', model: 'fal-ai/ltx-video' });

    // Step 2: Characters & Style
    const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>([]);
    const [styleConfig, setStyleConfig] = useState<StyleConfig | null>(null);
    const [isStyleModalOpen, setIsStyleModalOpen] = useState(false);

    // Step 3: Parameters
    const [prompt, setPrompt] = useState('');
    const [negativePrompt, setNegativePrompt] = useState('');
    const [duration, setDuration] = useState('5');
    const [steps, setSteps] = useState(30);
    const [guidanceScale, setGuidanceScale] = useState(7.5);
    const [seed, setSeed] = useState<number | undefined>(undefined);
    const [continuityWeight, setContinuityWeight] = useState(0.8);

    // Generation State
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationJob, setGenerationJob] = useState<any>(null);

    const onDrop = (acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            const file = acceptedFiles[0];
            setVideoFile(file);
            setVideoUrl(URL.createObjectURL(file));
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'video/*': [] },
        maxFiles: 1
    });

    const handleNext = () => setActiveStep((prev) => prev + 1);
    const handleBack = () => setActiveStep((prev) => prev - 1);

    const handleGenerate = async () => {
        setIsGenerating(true);
        setActiveStep(3); // Move to generation step

        try {
            // Upload video first if it's a file
            let sourceUrl = videoUrl;
            if (videoFile) {
                const formData = new FormData();
                formData.append('file', videoFile);
                const uploadRes = await fetch(`/api/projects/${projectId}/upload`, {
                    method: 'POST',
                    body: formData
                });
                const uploadData = await uploadRes.json();
                sourceUrl = uploadData.url;
            }

            const response = await fetch('/api/extend/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId,
                    mode: 'extend_video',
                    sourceVideoUrl: sourceUrl,
                    prompt,
                    negativePrompt,
                    model: engineConfig.model,
                    provider: engineConfig.provider,
                    duration: parseInt(duration),
                    steps,
                    guidanceScale,
                    seed,
                    continuityWeight,
                    characterIds: selectedCharacterIds,
                    styleConfig
                })
            });

            const job = await response.json();
            setGenerationJob(job);

        } catch (error) {
            console.error("Generation failed:", error);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
            <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
                <Step><StepLabel>Source & Model</StepLabel></Step>
                <Step><StepLabel>Characters & Style</StepLabel></Step>
                <Step><StepLabel>Parameters</StepLabel></Step>
                <Step><StepLabel>Generate</StepLabel></Step>
            </Stepper>

            {/* Step 1: Source & Model */}
            {activeStep === 0 && (
                <Stack spacing={4}>
                    <Paper sx={{ p: 4 }}>
                        <Typography variant="h6" gutterBottom>1. Upload Source Video</Typography>
                        <Box
                            {...getRootProps()}
                            sx={{
                                p: 6,
                                textAlign: 'center',
                                border: '2px dashed',
                                borderColor: isDragActive ? 'primary.main' : 'divider',
                                cursor: 'pointer',
                                bgcolor: isDragActive ? 'action.hover' : 'background.paper',
                                borderRadius: 2
                            }}
                        >
                            <input {...getInputProps()} />
                            {videoUrl ? (
                                <Box>
                                    <video src={videoUrl} style={{ maxHeight: 300, maxWidth: '100%' }} controls />
                                    <Typography variant="body2" sx={{ mt: 2 }}>Click or drag to replace</Typography>
                                </Box>
                            ) : (
                                <Box>
                                    <CloudUpload sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                                    <Typography variant="h6">Drag & Drop Video</Typography>
                                </Box>
                            )}
                        </Box>
                    </Paper>

                    <Paper sx={{ p: 4 }}>
                        <Typography variant="h6" gutterBottom>2. Select Model</Typography>
                        <EngineSelectorV2
                            config={engineConfig}
                            onChange={setEngineConfig}
                            mode="video"
                        />
                    </Paper>

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                            variant="contained"
                            onClick={handleNext}
                            disabled={!videoUrl}
                            endIcon={<ChevronRight />}
                        >
                            Next
                        </Button>
                    </Box>
                </Stack>
            )}

            {/* Step 2: Characters & Style */}
            {activeStep === 1 && (
                <Stack spacing={4}>
                    <Paper sx={{ p: 4 }}>
                        <Typography variant="h6" gutterBottom>3. Select Characters (Optional)</Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            Select characters to maintain consistency in the extended shot.
                        </Typography>
                        {/* Simplified Character Selection - just using the library component for now */}
                        {/* In a real app, we'd pass a selection mode prop to CharacterLibrary */}
                        <CharacterLibrary
                            projectId={projectId}
                            selectionMode="multiple"
                            selectedIds={selectedCharacterIds}
                            onSelectionChange={setSelectedCharacterIds}
                        />
                    </Paper>

                    <Paper sx={{ p: 4 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6">4. Style Configuration</Typography>
                            <Button
                                variant="outlined"
                                startIcon={<AutoAwesome />}
                                onClick={() => setIsStyleModalOpen(true)}
                            >
                                Configure Style
                            </Button>
                        </Box>
                        {styleConfig ? (
                            <Alert severity="info">
                                Style applied: {styleConfig.preset ? 'Preset' : 'Custom'}
                                {styleConfig.inspiration && ` - ${styleConfig.inspiration.substring(0, 50)}...`}
                            </Alert>
                        ) : (
                            <Typography color="text.secondary">No specific style configured. Using model defaults.</Typography>
                        )}
                    </Paper>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Button onClick={handleBack} startIcon={<ChevronLeft />}>Back</Button>
                        <Button variant="contained" onClick={handleNext} endIcon={<ChevronRight />}>Next</Button>
                    </Box>
                </Stack>
            )}

            {/* Step 3: Parameters */}
            {activeStep === 2 && (
                <Stack spacing={4}>
                    <Paper sx={{ p: 4 }}>
                        <Typography variant="h6" gutterBottom>5. Prompting</Typography>
                        <TextField
                            fullWidth
                            multiline
                            rows={4}
                            label="Extension Prompt"
                            placeholder="Describe what happens next in the video..."
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            sx={{ mb: 3 }}
                        />
                        <TextField
                            fullWidth
                            label="Negative Prompt"
                            placeholder="Things to avoid..."
                            value={negativePrompt}
                            onChange={(e) => setNegativePrompt(e.target.value)}
                        />
                    </Paper>

                    <Paper sx={{ p: 4 }}>
                        <Typography variant="h6" gutterBottom>6. Advanced Parameters</Typography>

                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                            <Box>
                                <Typography gutterBottom>Continuity Weight ({continuityWeight})</Typography>
                                <Slider
                                    value={continuityWeight}
                                    onChange={(_, v) => setContinuityWeight(v as number)}
                                    min={0}
                                    max={1}
                                    step={0.05}
                                    valueLabelDisplay="auto"
                                />
                                <Typography variant="caption" color="text.secondary">
                                    Higher values stick closer to the last frame.
                                </Typography>
                            </Box>

                            <Box>
                                <Typography gutterBottom>Guidance Scale ({guidanceScale})</Typography>
                                <Slider
                                    value={guidanceScale}
                                    onChange={(_, v) => setGuidanceScale(v as number)}
                                    min={1}
                                    max={20}
                                    step={0.5}
                                    valueLabelDisplay="auto"
                                />
                            </Box>

                            <Box>
                                <Typography gutterBottom>Steps ({steps})</Typography>
                                <Slider
                                    value={steps}
                                    onChange={(_, v) => setSteps(v as number)}
                                    min={10}
                                    max={100}
                                    step={1}
                                    valueLabelDisplay="auto"
                                />
                            </Box>

                            <Box>
                                <Typography gutterBottom>Duration (Seconds)</Typography>
                                <TextField
                                    type="number"
                                    value={duration}
                                    onChange={(e) => setDuration(e.target.value)}
                                    size="small"
                                    fullWidth
                                />
                            </Box>
                        </Box>

                        <Box sx={{ mt: 3 }}>
                            <Typography gutterBottom>Seed (Optional)</Typography>
                            <TextField
                                type="number"
                                value={seed || ''}
                                onChange={(e) => setSeed(e.target.value ? parseInt(e.target.value) : undefined)}
                                placeholder="Random"
                                size="small"
                                fullWidth
                            />
                        </Box>
                    </Paper>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Button onClick={handleBack} startIcon={<ChevronLeft />}>Back</Button>
                        <Button
                            variant="contained"
                            size="large"
                            onClick={handleGenerate}
                            disabled={!prompt}
                            startIcon={<Movie />}
                        >
                            Generate Extension
                        </Button>
                    </Box>
                </Stack>
            )}

            {/* Step 4: Generate */}
            {activeStep === 3 && (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                    {isGenerating ? (
                        <>
                            <CircularProgress size={60} sx={{ mb: 4 }} />
                            <Typography variant="h5" gutterBottom>
                                Generating Extension...
                            </Typography>
                            <Typography color="text.secondary">
                                This may take a few minutes depending on the model.
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

            <StyleSelectorModal
                isOpen={isStyleModalOpen}
                onClose={() => setIsStyleModalOpen(false)}
                onApply={setStyleConfig}
                projectId={projectId}
            />
        </Box>
    );
}
