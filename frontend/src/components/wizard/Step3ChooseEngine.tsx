/* eslint-disable react-hooks/rules-of-hooks */
import React, { useEffect, useState } from 'react';
import { usePromptWizard } from '../../context/PromptWizardContext';
import { recommendEngine, ENGINES } from '../../lib/engineRecommendation';
import { Box, Typography, Card, CardContent, CardActions, Button, Grid, Chip } from '@mui/material';
import { CheckCircle, Star } from '@mui/icons-material';

export default function Step3ChooseEngine() {
  const { state, dispatch } = usePromptWizard();
  const [recommendation, setRecommendation] = useState<ReturnType<typeof recommendEngine> | null>(
    null
  );

  useEffect(() => {
    if (state.initialPrompt) {
      const rec = recommendEngine(state.initialPrompt, state.selectedTags);
      setRecommendation(rec);
      // Auto-select if not already selected
      if (!state.selectedEngine) {
        dispatch({ type: 'SET_ENGINE', engine: rec.engine });
      }
    }
  }, [state.initialPrompt, state.selectedTags, dispatch, state.selectedEngine]);

  const handleSelectEngine = (engineId: string) => {
    dispatch({ type: 'SET_ENGINE', engine: ENGINES[engineId] });
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom fontWeight="bold">
        Choose Your Engine
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Select the AI model that best fits your vision. We've analyzed your prompt and tags to
        provide a recommendation.
      </Typography>

      {recommendation && (
        <Card
          sx={{
            mb: 4,
            border: '2px solid',
            borderColor: 'primary.main',
            bgcolor: 'primary.50',
          }}
        >
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <Star color="primary" />
              <Typography variant="h6" color="primary.main" fontWeight="bold">
                Recommended: {recommendation.engine.name}
              </Typography>
            </Box>
            <Typography variant="body1" paragraph>
              {recommendation.reasoning}
            </Typography>
            <Box display="flex" gap={2} flexWrap="wrap">
              <Chip label={`Best for: ${recommendation.bestFor}`} size="small" />
              <Chip
                label={`Est. Cost: ${recommendation.estimatedCost} credits`}
                size="small"
                variant="outlined"
              />
            </Box>
          </CardContent>
          <CardActions sx={{ justifyContent: 'flex-end', p: 2 }}>
            <Button
              variant="contained"
              onClick={() => handleSelectEngine(recommendation.engine.id)}
              disabled={state.selectedEngine?.id === recommendation.engine.id}
            >
              {state.selectedEngine?.id === recommendation.engine.id
                ? 'Selected'
                : 'Select Recommended'}
            </Button>
          </CardActions>
        </Card>
      )}

      <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
        All Available Engines
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
          gap: 2,
        }}
      >
        {Object.values(ENGINES).map(engine => (
          <Box key={engine.id}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                border: state.selectedEngine?.id === engine.id ? '2px solid' : '1px solid',
                borderColor: state.selectedEngine?.id === engine.id ? 'primary.main' : 'divider',
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 3,
                },
              }}
              onClick={() => handleSelectEngine(engine.id)}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Box display="flex" justifyContent="space-between" alignItems="start">
                  <Typography variant="h6" gutterBottom>
                    {engine.name}
                  </Typography>
                  {state.selectedEngine?.id === engine.id && <CheckCircle color="primary" />}
                </Box>
                <Typography variant="body2" color="text.secondary" paragraph>
                  {engine.description}
                </Typography>
                <Box display="flex" flexDirection="column" gap={0.5}>
                  <Typography variant="caption" display="block">
                    • Max Duration: {engine.capabilities.maxDuration}s
                  </Typography>
                  <Typography variant="caption" display="block">
                    • Cost: {engine.costPerSecond} credits/s
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
