import React from 'react';
import { PromptWizardProvider, usePromptWizard } from '../../context/PromptWizardContext';
import Step1InitialPrompt from './Step1InitialPrompt';
import Step2AddDetails from './Step2AddDetails';
import Step3ChooseEngine from './Step3ChooseEngine';
import Step4Review from './Step4Review';
import { Box, Stepper, Step, StepLabel, Button, Paper, Container } from '@mui/material';
import { ArrowBack, ArrowForward, AutoAwesome } from '@mui/icons-material';

const steps = ['Initial Idea', 'Add Details', 'Choose Engine', 'Review & Generate'];

function WizardContent({ onGenerate }: { onGenerate: (data: any) => void }) {
  const { state, dispatch } = usePromptWizard();

  const handleNext = () => {
    if (state.currentStep < 4) {
      dispatch({ type: 'SET_STEP', step: state.currentStep + 1 });
    } else {
      onGenerate(state);
    }
  };

  const handleBack = () => {
    if (state.currentStep > 1) {
      dispatch({ type: 'SET_STEP', step: state.currentStep - 1 });
    }
  };

  const renderStep = () => {
    switch (state.currentStep) {
      case 1:
        return <Step1InitialPrompt />;
      case 2:
        return <Step2AddDetails />;
      case 3:
        return <Step3ChooseEngine />;
      case 4:
        return <Step4Review />;
      default:
        return <Step1InitialPrompt />;
    }
  };

  const isNextDisabled = () => {
    if (state.currentStep === 1 && !state.initialPrompt) return true;
    if (state.currentStep === 3 && !state.selectedEngine) return true;
    return false;
  };

  return (
    <Box sx={{ width: '100%', py: 4 }}>
      <Stepper activeStep={state.currentStep - 1} alternativeLabel sx={{ mb: 6 }}>
        {steps.map(label => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Box sx={{ minHeight: 400, mb: 4 }}>{renderStep()}</Box>

      <Paper
        elevation={3}
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          p: 2,
          zIndex: 1000,
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Container maxWidth="lg">
          <Box display="flex" justifyContent="space-between">
            <Button
              disabled={state.currentStep === 1}
              onClick={handleBack}
              startIcon={<ArrowBack />}
            >
              Back
            </Button>
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={isNextDisabled()}
              endIcon={state.currentStep === 4 ? <AutoAwesome /> : <ArrowForward />}
              size="large"
            >
              {state.currentStep === 4 ? 'Generate Video' : 'Next'}
            </Button>
          </Box>
        </Container>
      </Paper>
      {/* Spacer for fixed footer */}
      <Box sx={{ height: 80 }} />
    </Box>
  );
}

export default function PromptWizard({ onGenerate }: { onGenerate: (data: any) => void }) {
  return (
    <PromptWizardProvider>
      <WizardContent onGenerate={onGenerate} />
    </PromptWizardProvider>
  );
}
