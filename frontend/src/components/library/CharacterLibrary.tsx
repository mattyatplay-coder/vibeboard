'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { Add, Delete, Edit } from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';

interface Character {
  id: string;
  name: string;
  turnaroundUrl: string;
  type: string;
  triggerWord?: string;
  description?: string;
  distinctiveFeatures?: string[];
  tags?: string[];
}

interface CharacterLibraryProps {
  projectId: string;
  selectionMode?: 'none' | 'single' | 'multiple';
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
}

export default function CharacterLibrary({
  projectId,
  selectionMode = 'none',
  selectedIds = [],
  onSelectionChange,
}: CharacterLibraryProps) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  useEffect(() => {
    fetchCharacters();
  }, [projectId]);

  const fetchCharacters = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/characters`);
      const data = await res.json();
      setCharacters(data);
    } catch (error) {
      console.error('Failed to fetch characters:', error);
    }
  };

  const onDrop = async (acceptedFiles: File[]) => {
    const formData = new FormData();
    acceptedFiles.forEach(file => {
      formData.append('files', file);
    });

    try {
      await fetch(`/api/projects/${projectId}/characters/batch`, {
        method: 'POST',
        body: formData,
      });
      fetchCharacters();
      setIsUploadOpen(false);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const handleCardClick = (id: string) => {
    if (selectionMode === 'none') return;

    let newSelected: string[];
    if (selectionMode === 'single') {
      newSelected = [id];
    } else {
      const selectedIndex = selectedIds.indexOf(id);
      if (selectedIndex === -1) {
        newSelected = [...selectedIds, id];
      } else {
        newSelected = selectedIds.filter(sid => sid !== id);
      }
    }

    if (onSelectionChange) {
      onSelectionChange(newSelected);
    }
  };

  const { getRootProps, getInputProps } = useDropzone({ onDrop });

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5">Character Library</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setIsUploadOpen(true)}>
          Add Characters
        </Button>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
          gap: 3,
        }}
      >
        {characters.map(char => (
          <Box key={char.id}>
            <Card
              sx={{
                cursor: selectionMode !== 'none' ? 'pointer' : 'default',
                border: selectedIds.includes(char.id) ? '2px solid #1976d2' : 'none',
                position: 'relative',
              }}
              onClick={() => handleCardClick(char.id)}
            >
              {selectedIds.includes(char.id) && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    bgcolor: 'primary.main',
                    color: 'white',
                    borderRadius: '50%',
                    width: 24,
                    height: 24,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1,
                  }}
                >
                  ✓
                </Box>
              )}
              <CardMedia
                component="img"
                height="200"
                image={char.turnaroundUrl || '/placeholder-character.png'}
                alt={char.name}
              />
              <CardContent>
                <Typography variant="h6">{char.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {char.type}
                </Typography>
                {char.triggerWord && (
                  <Typography variant="caption" display="block" color="primary">
                    Trigger: {char.triggerWord}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Box>
        ))}
      </Box>

      <Dialog open={isUploadOpen} onClose={() => setIsUploadOpen(false)}>
        <DialogTitle>Upload Characters</DialogTitle>
        <DialogContent>
          <Box
            {...getRootProps()}
            sx={{
              p: 4,
              border: '2px dashed grey',
              textAlign: 'center',
              cursor: 'pointer',
              mt: 2,
            }}
          >
            <input {...getInputProps()} />
            <Typography>Drag & drop character sheets here, or click to select files</Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsUploadOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
