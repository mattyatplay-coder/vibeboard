import React from 'react';
import { usePromptWizard } from '../../context/PromptWizardContext';
import { Box, TextField, Typography, Paper } from '@mui/material';
import { CloudUpload } from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';

export default function Step1InitialPrompt() {
  const { state, dispatch } = usePromptWizard();

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      dispatch({ type: 'SET_REFERENCE_MEDIA', file: acceptedFiles[0] });
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [], 'video/*': [] },
    maxFiles: 1,
  });

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h5" gutterBottom fontWeight="bold">
        Start with an Idea
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Describe the video you want to create. Be as specific as possible about the subject and
        action.
      </Typography>

      <TextField
        fullWidth
        multiline
        rows={4}
        placeholder="e.g. A futuristic city with flying cars at sunset..."
        value={state.initialPrompt}
        onChange={e => dispatch({ type: 'SET_INITIAL_PROMPT', prompt: e.target.value })}
        sx={{ mb: 4 }}
        autoFocus
      />

      <Typography variant="h6" gutterBottom>
        Reference Media (Optional)
      </Typography>
      <Paper
        {...getRootProps()}
        sx={{
          p: 4,
          textAlign: 'center',
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'divider',
          cursor: 'pointer',
          bgcolor: isDragActive ? 'action.hover' : 'background.paper',
          borderRadius: 2,
        }}
      >
        <input {...getInputProps()} />
        {state.referenceMedia ? (
          <Box>
            <Typography variant="body1" fontWeight="medium">
              {state.referenceMedia.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {(state.referenceMedia.size / 1024 / 1024).toFixed(2)} MB
            </Typography>
            <Typography variant="body2" color="primary" sx={{ mt: 1 }}>
              Click or drag to replace
            </Typography>
          </Box>
        ) : (
          <Box>
            <CloudUpload sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
            <Typography variant="body1">Drag & drop an image or video</Typography>
            <Typography variant="caption" color="text.secondary">
              Use as a visual reference for style or structure
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
