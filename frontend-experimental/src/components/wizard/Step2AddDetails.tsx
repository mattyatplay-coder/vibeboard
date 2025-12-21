import React from 'react';
import { usePromptWizard } from '../../context/PromptWizardContext';
import TagSelector from '../tag-system/TagSelector';
import { sampleTagData } from '../tag-system/sampleTagData';
import { Box, Typography, Chip, Paper } from '@mui/material';

export default function Step2AddDetails() {
    const { state, dispatch } = usePromptWizard();

    return (
        <Box>
            <Typography variant="h5" gutterBottom fontWeight="bold">
                Enhance with Tags
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
                Select tags to define the style, camera, lighting, and mood of your video.
            </Typography>

            {/* Current Prompt Preview */}
            <Paper sx={{ p: 2, mb: 4, bgcolor: 'action.hover', borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                    Current Prompt Idea:
                </Typography>
                <Typography variant="body1">
                    {state.initialPrompt || "No prompt entered yet..."}
                </Typography>
                {state.selectedTags.length > 0 && (
                    <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {state.selectedTags.map(tag => (
                            <Chip
                                key={tag.id}
                                label={tag.name}
                                size="small"
                                color="primary"
                                variant="outlined"
                            />
                        ))}
                    </Box>
                )}
            </Paper>

            <TagSelector
                availableTags={sampleTagData}
                selectedTags={state.selectedTags}
                onTagsChange={(tags) => dispatch({ type: 'SET_SELECTED_TAGS', tags })}
                maxTags={15}
            />
        </Box>
    );
}
