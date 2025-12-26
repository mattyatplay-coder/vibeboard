'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Paper,
    Typography,
    Button,
    IconButton,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Chip,
    CircularProgress,
    Alert,
    Divider,
    Stack,
    Card,
    CardContent,
    LinearProgress,
    Tooltip
} from '@mui/material';
import {
    ArrowBack,
    Add,
    Delete,
    DragIndicator,
    PlayArrow,
    Pause,
    CheckCircle,
    Error,
    Schedule,
    Movie,
    PersonAdd,
    Settings,
    Refresh,
    Image as ImageIcon,
    Close
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import CharacterLibrary from '../library/CharacterLibrary';
import { EngineSelectorV2 } from '../generations/EngineSelectorV2';
import { BACKEND_URL } from '@/lib/api';

interface Segment {
    id: string;
    orderIndex: number;
    prompt: string;
    duration: number;
    status: string;
    outputUrl?: string;
    failureReason?: string;
    transitionType: string;
    firstFrameUrl?: string;
    lastFrameUrl?: string;
}

interface ChainCharacter {
    id: string;
    characterId: string;
    character: {
        id: string;
        name: string;
        primaryImageUrl?: string;
    };
    overrideFaceWeight?: number;
    overrideStyleWeight?: number;
}

interface SceneChain {
    id: string;
    name: string;
    description?: string;
    status: string;
    aspectRatio: string;
    preferredModel?: string;
    transitionStyle: string;
    segments: Segment[];
    characters: ChainCharacter[];
}

interface SceneChainEditorProps {
    projectId: string;
    chainId: string;
    onBack: () => void;
}

export default function SceneChainEditor({ projectId, chainId, onBack }: SceneChainEditorProps) {
    const [chain, setChain] = useState<SceneChain | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // New segment form
    const [newPrompt, setNewPrompt] = useState('');
    const [newDuration, setNewDuration] = useState(5);

    // Settings panel
    const [showCharacterPanel, setShowCharacterPanel] = useState(false);
    const [showSettingsPanel, setShowSettingsPanel] = useState(false);

    // Model selection
    const [selectedModel, setSelectedModel] = useState('fal-ai/wan-2.5/i2v');

    useEffect(() => {
        fetchChain();
    }, [chainId]);

    const fetchChain = async () => {
        try {
            const res = await fetch(`${BACKEND_URL}/api/projects/${projectId}/scene-chains/${chainId}`);
            if (res.ok) {
                const data = await res.json();
                setChain(data);
                if (data.preferredModel) {
                    setSelectedModel(data.preferredModel);
                }
            } else {
                setError('Failed to load scene chain');
            }
        } catch (err) {
            setError('Failed to load scene chain');
        } finally {
            setLoading(false);
        }
    };

    const handleAddSegment = async () => {
        if (!newPrompt.trim()) return;

        try {
            const res = await fetch(`${BACKEND_URL}/api/projects/${projectId}/scene-chains/${chainId}/segments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: newPrompt,
                    duration: newDuration
                })
            });

            if (res.ok) {
                fetchChain();
                setNewPrompt('');
                setNewDuration(5);
            }
        } catch (err) {
            console.error('Failed to add segment:', err);
        }
    };

    const handleUpdateSegment = async (segmentId: string, updates: Partial<Segment>) => {
        try {
            await fetch(`${BACKEND_URL}/api/projects/${projectId}/scene-chains/${chainId}/segments/${segmentId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            fetchChain();
        } catch (err) {
            console.error('Failed to update segment:', err);
        }
    };

    const handleUploadReferenceImage = async (segmentId: string, frameType: 'first' | 'last', file: File) => {
        const formData = new FormData();
        formData.append('file', file);

        try {
            // Upload the file first
            const uploadRes = await fetch(`${BACKEND_URL}/api/upload`, {
                method: 'POST',
                body: formData
            });

            if (uploadRes.ok) {
                const uploadData = await uploadRes.json();
                const fileUrl = uploadData.fileUrl || uploadData.url;

                // Update the segment with the new reference image URL
                const updates = frameType === 'first'
                    ? { firstFrameUrl: fileUrl }
                    : { lastFrameUrl: fileUrl };

                await handleUpdateSegment(segmentId, updates);
            }
        } catch (err) {
            console.error('Failed to upload reference image:', err);
        }
    };

    const handleDeleteSegment = async (segmentId: string) => {
        try {
            await fetch(`${BACKEND_URL}/api/projects/${projectId}/scene-chains/${chainId}/segments/${segmentId}`, {
                method: 'DELETE'
            });
            fetchChain();
        } catch (err) {
            console.error('Failed to delete segment:', err);
        }
    };

    const handleReorder = async (result: DropResult) => {
        if (!result.destination || !chain) return;

        const items = Array.from(chain.segments);
        const [reordered] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reordered);

        const newOrder = items.map((seg, idx) => ({ id: seg.id, orderIndex: idx }));

        try {
            await fetch(`${BACKEND_URL}/api/projects/${projectId}/scene-chains/${chainId}/reorder`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ segments: newOrder })
            });
            fetchChain();
        } catch (err) {
            console.error('Failed to reorder segments:', err);
        }
    };

    const handleAddCharacter = async (characterId: string) => {
        try {
            await fetch(`${BACKEND_URL}/api/projects/${projectId}/scene-chains/${chainId}/characters`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ characterId })
            });
            fetchChain();
        } catch (err) {
            console.error('Failed to add character:', err);
        }
    };

    const handleRemoveCharacter = async (characterId: string) => {
        try {
            await fetch(`${BACKEND_URL}/api/projects/${projectId}/scene-chains/${chainId}/characters/${characterId}`, {
                method: 'DELETE'
            });
            fetchChain();
        } catch (err) {
            console.error('Failed to remove character:', err);
        }
    };

    const handleUpdateChainSettings = async (updates: Partial<SceneChain>) => {
        setSaving(true);
        try {
            await fetch(`${BACKEND_URL}/api/projects/${projectId}/scene-chains/${chainId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            fetchChain();
        } catch (err) {
            console.error('Failed to update chain:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleGenerateChain = async () => {
        setGenerating(true);
        try {
            const genRes = await fetch(`${BACKEND_URL}/api/projects/${projectId}/scene-chains/${chainId}/generate`, {
                method: 'POST'
            });

            if (!genRes.ok) {
                console.error('Failed to start generation:', await genRes.text());
                setGenerating(false);
                return;
            }

            // Start polling for status
            const pollInterval = setInterval(async () => {
                const statusRes = await fetch(`${BACKEND_URL}/api/projects/${projectId}/scene-chains/${chainId}/status`);
                if (statusRes.ok) {
                    const statusData = await statusRes.json();
                    fetchChain();
                    // Check chainStatus (not status) and handle all terminal states
                    if (statusData.chainStatus === 'complete' ||
                        statusData.chainStatus === 'completed' ||
                        statusData.chainStatus === 'failed' ||
                        statusData.chainStatus === 'draft') {
                        clearInterval(pollInterval);
                        setGenerating(false);
                    }
                } else {
                    // If status check fails, stop polling
                    clearInterval(pollInterval);
                    setGenerating(false);
                }
            }, 3000);
        } catch (err) {
            console.error('Failed to start generation:', err);
            setGenerating(false);
        }
    };

    const getSegmentStatusIcon = (status: string) => {
        switch (status) {
            case 'pending': return <Schedule color="disabled" />;
            case 'generating': return <CircularProgress size={20} />;
            case 'completed': return <CheckCircle color="success" />;
            case 'failed': return <Error color="error" />;
            default: return <Schedule color="disabled" />;
        }
    };

    const getTotalDuration = () => {
        if (!chain) return 0;
        return chain.segments.reduce((sum, seg) => sum + seg.duration, 0);
    };

    const getCompletedSegments = () => {
        if (!chain) return 0;
        return chain.segments.filter(s => s.status === 'completed').length;
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error || !chain) {
        return (
            <Alert severity="error" sx={{ m: 4 }}>
                {error || 'Chain not found'}
            </Alert>
        );
    }

    return (
        <Box sx={{ display: 'flex', gap: 3, height: '100%' }}>
            {/* Main Editor */}
            <Box sx={{ flex: 1 }}>
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
                    <IconButton onClick={onBack}>
                        <ArrowBack />
                    </IconButton>
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="h5" fontWeight="bold">
                            {chain.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {chain.segments.length} segments | {getTotalDuration()}s total | {chain.aspectRatio}
                        </Typography>
                    </Box>
                    <Chip
                        label={chain.status}
                        color={chain.status === 'completed' ? 'success' : chain.status === 'generating' ? 'warning' : 'default'}
                    />
                    <IconButton onClick={() => setShowCharacterPanel(!showCharacterPanel)}>
                        <PersonAdd />
                    </IconButton>
                    <IconButton onClick={() => setShowSettingsPanel(!showSettingsPanel)}>
                        <Settings />
                    </IconButton>
                </Box>

                {/* Characters Strip */}
                {chain.characters.length > 0 && (
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Characters in this chain:
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {chain.characters.map(cc => (
                                <Chip
                                    key={cc.id}
                                    label={cc.character.name}
                                    onDelete={() => handleRemoveCharacter(cc.characterId)}
                                    avatar={
                                        cc.character.primaryImageUrl ? (
                                            <Box
                                                component="img"
                                                src={cc.character.primaryImageUrl}
                                                sx={{ width: 24, height: 24, borderRadius: '50%' }}
                                            />
                                        ) : undefined
                                    }
                                />
                            ))}
                        </Box>
                    </Box>
                )}

                {/* Progress Bar (when generating) */}
                {generating && (
                    <Box sx={{ mb: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2">Generating...</Typography>
                            <Typography variant="body2">
                                {getCompletedSegments()} / {chain.segments.length} segments
                            </Typography>
                        </Box>
                        <LinearProgress
                            variant="determinate"
                            value={(getCompletedSegments() / chain.segments.length) * 100}
                        />
                    </Box>
                )}

                {/* Segments List */}
                <DragDropContext onDragEnd={handleReorder}>
                    <Droppable droppableId="segments">
                        {(provided) => (
                            <Stack
                                spacing={2}
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                            >
                                {chain.segments
                                    .sort((a, b) => a.orderIndex - b.orderIndex)
                                    .map((segment, index) => (
                                    <Draggable
                                        key={segment.id}
                                        draggableId={segment.id}
                                        index={index}
                                    >
                                        {(provided, snapshot) => (
                                            <Card
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                sx={{
                                                    opacity: snapshot.isDragging ? 0.8 : 1,
                                                    border: segment.status === 'completed' ? '1px solid' : 'none',
                                                    borderColor: 'success.main'
                                                }}
                                            >
                                                <CardContent>
                                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                                                        <Box
                                                            {...provided.dragHandleProps}
                                                            sx={{ cursor: 'grab', pt: 1 }}
                                                        >
                                                            <DragIndicator color="disabled" />
                                                        </Box>

                                                        <Box sx={{ flex: 1 }}>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                                <Typography variant="subtitle2" color="text.secondary">
                                                                    Segment {index + 1}
                                                                </Typography>
                                                                {getSegmentStatusIcon(segment.status)}
                                                                <Chip
                                                                    label={`${segment.duration}s`}
                                                                    size="small"
                                                                    variant="outlined"
                                                                />
                                                            </Box>

                                                            <TextField
                                                                fullWidth
                                                                multiline
                                                                minRows={2}
                                                                value={segment.prompt}
                                                                onChange={(e) => handleUpdateSegment(segment.id, { prompt: e.target.value })}
                                                                placeholder="Describe this segment..."
                                                                size="small"
                                                                disabled={segment.status === 'generating'}
                                                            />

                                                            {/* Reference Frame Images */}
                                                            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                                                                {/* First Frame Reference */}
                                                                <Box sx={{ flex: 1 }}>
                                                                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                                                                        First Frame
                                                                    </Typography>
                                                                    {segment.firstFrameUrl ? (
                                                                        <Box sx={{ position: 'relative', display: 'inline-block' }}>
                                                                            <Box
                                                                                component="img"
                                                                                src={segment.firstFrameUrl}
                                                                                alt="First frame reference"
                                                                                sx={{
                                                                                    width: 100,
                                                                                    height: 60,
                                                                                    objectFit: 'cover',
                                                                                    borderRadius: 1,
                                                                                    border: '2px solid',
                                                                                    borderColor: 'primary.main'
                                                                                }}
                                                                            />
                                                                            <IconButton
                                                                                size="small"
                                                                                sx={{
                                                                                    position: 'absolute',
                                                                                    top: -8,
                                                                                    right: -8,
                                                                                    bgcolor: 'background.paper',
                                                                                    '&:hover': { bgcolor: 'error.light' }
                                                                                }}
                                                                                onClick={() => handleUpdateSegment(segment.id, { firstFrameUrl: undefined })}
                                                                            >
                                                                                <Close sx={{ fontSize: 14 }} />
                                                                            </IconButton>
                                                                        </Box>
                                                                    ) : (
                                                                        <Button
                                                                            variant="outlined"
                                                                            size="small"
                                                                            component="label"
                                                                            startIcon={<ImageIcon />}
                                                                            sx={{ minWidth: 100 }}
                                                                        >
                                                                            Add
                                                                            <input
                                                                                type="file"
                                                                                hidden
                                                                                accept="image/*"
                                                                                onChange={(e) => {
                                                                                    const file = e.target.files?.[0];
                                                                                    if (file) handleUploadReferenceImage(segment.id, 'first', file);
                                                                                }}
                                                                            />
                                                                        </Button>
                                                                    )}
                                                                </Box>

                                                                {/* Last Frame Reference */}
                                                                <Box sx={{ flex: 1 }}>
                                                                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                                                                        Last Frame
                                                                    </Typography>
                                                                    {segment.lastFrameUrl ? (
                                                                        <Box sx={{ position: 'relative', display: 'inline-block' }}>
                                                                            <Box
                                                                                component="img"
                                                                                src={segment.lastFrameUrl}
                                                                                alt="Last frame reference"
                                                                                sx={{
                                                                                    width: 100,
                                                                                    height: 60,
                                                                                    objectFit: 'cover',
                                                                                    borderRadius: 1,
                                                                                    border: '2px solid',
                                                                                    borderColor: 'secondary.main'
                                                                                }}
                                                                            />
                                                                            <IconButton
                                                                                size="small"
                                                                                sx={{
                                                                                    position: 'absolute',
                                                                                    top: -8,
                                                                                    right: -8,
                                                                                    bgcolor: 'background.paper',
                                                                                    '&:hover': { bgcolor: 'error.light' }
                                                                                }}
                                                                                onClick={() => handleUpdateSegment(segment.id, { lastFrameUrl: undefined })}
                                                                            >
                                                                                <Close sx={{ fontSize: 14 }} />
                                                                            </IconButton>
                                                                        </Box>
                                                                    ) : (
                                                                        <Button
                                                                            variant="outlined"
                                                                            size="small"
                                                                            component="label"
                                                                            startIcon={<ImageIcon />}
                                                                            sx={{ minWidth: 100 }}
                                                                        >
                                                                            Add
                                                                            <input
                                                                                type="file"
                                                                                hidden
                                                                                accept="image/*"
                                                                                onChange={(e) => {
                                                                                    const file = e.target.files?.[0];
                                                                                    if (file) handleUploadReferenceImage(segment.id, 'last', file);
                                                                                }}
                                                                            />
                                                                        </Button>
                                                                    )}
                                                                </Box>
                                                            </Box>

                                                            {segment.failureReason && (
                                                                <Alert severity="error" sx={{ mt: 1 }}>
                                                                    {segment.failureReason}
                                                                </Alert>
                                                            )}

                                                            {segment.outputUrl && (
                                                                <Box sx={{ mt: 2 }}>
                                                                    <video
                                                                        src={segment.outputUrl}
                                                                        controls
                                                                        style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8 }}
                                                                    />
                                                                </Box>
                                                            )}
                                                        </Box>

                                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                                            <FormControl size="small" sx={{ minWidth: 80 }}>
                                                                <Select
                                                                    value={segment.duration}
                                                                    onChange={(e) => handleUpdateSegment(segment.id, { duration: e.target.value as number })}
                                                                    disabled={segment.status === 'generating'}
                                                                >
                                                                    <MenuItem value={3}>3s</MenuItem>
                                                                    <MenuItem value={5}>5s</MenuItem>
                                                                    <MenuItem value={8}>8s</MenuItem>
                                                                    <MenuItem value={10}>10s</MenuItem>
                                                                </Select>
                                                            </FormControl>
                                                            <IconButton
                                                                size="small"
                                                                color="error"
                                                                onClick={() => handleDeleteSegment(segment.id)}
                                                                disabled={segment.status === 'generating'}
                                                            >
                                                                <Delete />
                                                            </IconButton>
                                                        </Box>
                                                    </Box>
                                                </CardContent>
                                            </Card>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                            </Stack>
                        )}
                    </Droppable>
                </DragDropContext>

                {/* Add New Segment */}
                <Paper sx={{ p: 3, mt: 3, border: '2px dashed', borderColor: 'divider' }}>
                    <Typography variant="subtitle2" gutterBottom>
                        Add New Segment
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextField
                            fullWidth
                            multiline
                            minRows={2}
                            value={newPrompt}
                            onChange={(e) => setNewPrompt(e.target.value)}
                            placeholder="Describe what happens in this segment..."
                        />
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <FormControl size="small" sx={{ minWidth: 80 }}>
                                <InputLabel>Duration</InputLabel>
                                <Select
                                    value={newDuration}
                                    label="Duration"
                                    onChange={(e) => setNewDuration(e.target.value as number)}
                                >
                                    <MenuItem value={3}>3s</MenuItem>
                                    <MenuItem value={5}>5s</MenuItem>
                                    <MenuItem value={8}>8s</MenuItem>
                                    <MenuItem value={10}>10s</MenuItem>
                                </Select>
                            </FormControl>
                            <Button
                                variant="contained"
                                onClick={handleAddSegment}
                                disabled={!newPrompt.trim()}
                                startIcon={<Add />}
                            >
                                Add
                            </Button>
                        </Box>
                    </Box>
                </Paper>

                {/* Generate Button */}
                <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center', gap: 2 }}>
                    <Button
                        variant="contained"
                        size="large"
                        startIcon={generating ? <Pause /> : <PlayArrow />}
                        onClick={handleGenerateChain}
                        disabled={chain.segments.length === 0 || generating}
                    >
                        {generating ? 'Generating...' : 'Generate Chain'}
                    </Button>
                    {generating && (
                        <Button
                            variant="outlined"
                            startIcon={<Refresh />}
                            onClick={fetchChain}
                        >
                            Refresh Status
                        </Button>
                    )}
                </Box>
            </Box>

            {/* Character Panel */}
            {showCharacterPanel && (
                <Paper sx={{ width: 400, p: 3, maxHeight: '80vh', overflow: 'auto' }}>
                    <Typography variant="h6" gutterBottom>
                        Add Characters
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                        Select characters to maintain consistency across all segments.
                    </Typography>
                    <CharacterLibrary
                        projectId={projectId}
                        selectionMode="multiple"
                        selectedIds={chain.characters.map(c => c.characterId)}
                        onSelectionChange={(ids) => {
                            // Find new IDs to add
                            const currentIds = chain.characters.map(c => c.characterId);
                            const toAdd = ids.filter(id => !currentIds.includes(id));
                            const toRemove = currentIds.filter(id => !ids.includes(id));

                            toAdd.forEach(id => handleAddCharacter(id));
                            toRemove.forEach(id => handleRemoveCharacter(id));
                        }}
                    />
                </Paper>
            )}

            {/* Settings Panel */}
            {showSettingsPanel && (
                <Paper sx={{ width: 400, p: 3, maxHeight: '80vh', overflow: 'auto' }}>
                    <Typography variant="h6" gutterBottom>
                        Chain Settings
                    </Typography>

                    <Stack spacing={3}>
                        <TextField
                            label="Chain Name"
                            value={chain.name}
                            onChange={(e) => handleUpdateChainSettings({ name: e.target.value })}
                            fullWidth
                        />

                        <TextField
                            label="Description"
                            value={chain.description || ''}
                            onChange={(e) => handleUpdateChainSettings({ description: e.target.value })}
                            multiline
                            rows={3}
                            fullWidth
                        />

                        <FormControl fullWidth>
                            <InputLabel>Aspect Ratio</InputLabel>
                            <Select
                                value={chain.aspectRatio}
                                label="Aspect Ratio"
                                onChange={(e) => handleUpdateChainSettings({ aspectRatio: e.target.value })}
                            >
                                <MenuItem value="16:9">16:9 (Landscape)</MenuItem>
                                <MenuItem value="9:16">9:16 (Portrait)</MenuItem>
                                <MenuItem value="1:1">1:1 (Square)</MenuItem>
                                <MenuItem value="4:3">4:3 (Standard)</MenuItem>
                            </Select>
                        </FormControl>

                        <FormControl fullWidth>
                            <InputLabel>Transition Style</InputLabel>
                            <Select
                                value={chain.transitionStyle}
                                label="Transition Style"
                                onChange={(e) => handleUpdateChainSettings({ transitionStyle: e.target.value })}
                            >
                                <MenuItem value="smooth">Smooth</MenuItem>
                                <MenuItem value="cut">Hard Cut</MenuItem>
                                <MenuItem value="fade">Fade</MenuItem>
                                <MenuItem value="morph">Morph</MenuItem>
                            </Select>
                        </FormControl>

                        <Box>
                            <Typography variant="subtitle2" gutterBottom>
                                Preferred Model
                            </Typography>
                            <EngineSelectorV2
                                selectedProvider="fal"
                                selectedModel={selectedModel}
                                onSelect={(provider, model) => {
                                    setSelectedModel(model);
                                    handleUpdateChainSettings({ preferredModel: model });
                                }}
                                mode="video"
                            />
                        </Box>
                    </Stack>

                    {saving && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                            <CircularProgress size={24} />
                        </Box>
                    )}
                </Paper>
            )}
        </Box>
    );
}
