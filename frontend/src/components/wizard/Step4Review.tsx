import React, { useEffect } from 'react';
import { usePromptWizard } from '../../context/PromptWizardContext';
import { buildEnhancedPrompt } from '../../lib/promptBuilder';
import EnhancedMotionSlider from '../motion-slider/EnhancedMotionSlider';
import { Box, Typography, TextField, Paper, Divider, Alert } from '@mui/material';

export default function Step4Review() {
  const { state, dispatch } = usePromptWizard();

  // Auto-generate enhanced prompt on mount if not already done
  useEffect(() => {
    if (state.initialPrompt && state.selectedEngine && !state.enhancedPrompt) {
      const result = buildEnhancedPrompt(
        state.initialPrompt,
        state.selectedTags,
        state.selectedEngine
      );

      dispatch({ type: 'SET_ENHANCED_PROMPT', prompt: result.enhancedPrompt });
      dispatch({ type: 'SET_POSITIVE_ADDITIONS', additions: result.positiveAdditions });
      dispatch({ type: 'SET_NEGATIVE_PROMPT', prompt: result.negativePrompt });
    }
  }, [
    state.initialPrompt,
    state.selectedEngine,
    state.selectedTags,
    state.enhancedPrompt,
    dispatch,
  ]);

  return (
    <Box>
      <Typography variant="h5" gutterBottom fontWeight="bold">
        Review & Refine
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        We've constructed a professional prompt based on your inputs. Review the details and adjust
        the motion settings.
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4 }}>
        <Box sx={{ flex: { xs: '1 1 100%', md: '2 1 0' } }}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Enhanced Prompt
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={6}
              value={state.enhancedPrompt}
              onChange={e => dispatch({ type: 'SET_ENHANCED_PROMPT', prompt: e.target.value })}
              helperText="This is the final prompt that will be sent to the AI engine."
            />
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Negative Prompt
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              value={state.negativePrompt}
              onChange={e => dispatch({ type: 'SET_NEGATIVE_PROMPT', prompt: e.target.value })}
              helperText="Things to exclude from the video."
            />
          </Paper>
        </Box>

        <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 0' } }}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Settings
            </Typography>

            <Box sx={{ mb: 4 }}>
              <Typography variant="subtitle2" gutterBottom>
                Motion Control
              </Typography>
              <EnhancedMotionSlider
                value={state.motionScale}
                onChange={val => dispatch({ type: 'SET_MOTION_SCALE', value: val })}
                engineType={state.selectedEngine?.id || 'kling'}
              />
            </Box>

            <Divider sx={{ my: 3 }} />

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Configuration
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Engine
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {state.selectedEngine?.name || 'None'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Resolution
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {state.selectedEngine?.capabilities.resolutions[0] || '1080p'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Duration
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {state.duration}s
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Aspect Ratio
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {state.aspectRatio}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {state.estimatedCost > 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Estimated Cost: {state.estimatedCost} credits
              </Alert>
            )}
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}
