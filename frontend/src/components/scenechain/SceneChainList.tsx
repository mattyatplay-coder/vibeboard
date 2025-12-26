'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Chip,
  CircularProgress,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import { Add, MoreVert, PlayArrow, Edit, Delete, Movie } from '@mui/icons-material';
import { BACKEND_URL } from '@/lib/api';

interface SceneChain {
  id: string;
  name: string;
  description?: string;
  status: string;
  targetDuration?: number;
  aspectRatio: string;
  createdAt: string;
  _count?: {
    segments: number;
    characters: number;
  };
}

interface SceneChainListProps {
  projectId: string;
  onSelectChain: (chainId: string) => void;
}

export default function SceneChainList({ projectId, onSelectChain }: SceneChainListProps) {
  const [chains, setChains] = useState<SceneChain[]>([]);
  const [loading, setLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedChainId, setSelectedChainId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newChainName, setNewChainName] = useState('');
  const [newChainDescription, setNewChainDescription] = useState('');

  useEffect(() => {
    fetchChains();
  }, [projectId]);

  const fetchChains = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/projects/${projectId}/scene-chains`);
      if (res.ok) {
        const data = await res.json();
        setChains(data);
      }
    } catch (error) {
      console.error('Failed to fetch scene chains:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, chainId: string) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedChainId(chainId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedChainId(null);
  };

  const handleCreateChain = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/projects/${projectId}/scene-chains`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newChainName,
          description: newChainDescription,
        }),
      });
      if (res.ok) {
        const newChain = await res.json();
        setChains(prev => [...prev, newChain]);
        setIsCreateOpen(false);
        setNewChainName('');
        setNewChainDescription('');
        onSelectChain(newChain.id);
      } else {
        const error = await res.json();
        console.error('Failed to create chain:', error);
      }
    } catch (error) {
      console.error('Failed to create chain:', error);
    }
  };

  const handleDeleteChain = async () => {
    if (!selectedChainId) return;
    try {
      const res = await fetch(
        `${BACKEND_URL}/api/projects/${projectId}/scene-chains/${selectedChainId}`,
        {
          method: 'DELETE',
        }
      );
      if (res.ok) {
        setChains(prev => prev.filter(c => c.id !== selectedChainId));
      }
    } catch (error) {
      console.error('Failed to delete chain:', error);
    }
    handleMenuClose();
  };

  const handleGenerateChain = async (chainId: string) => {
    try {
      await fetch(`${BACKEND_URL}/api/projects/${projectId}/scene-chains/${chainId}/generate`, {
        method: 'POST',
      });
      // Refresh chains to show updated status
      fetchChains();
    } catch (error) {
      console.error('Failed to start generation:', error);
    }
    handleMenuClose();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'default';
      case 'generating':
        return 'warning';
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h5" fontWeight="bold">
          Scene Chains
        </Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setIsCreateOpen(true)}>
          New Chain
        </Button>
      </Box>

      {chains.length === 0 ? (
        <Card sx={{ p: 6, textAlign: 'center', border: '2px dashed', borderColor: 'divider' }}>
          <Movie sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No Scene Chains Yet
          </Typography>
          <Typography color="text.secondary" paragraph>
            Create a scene chain to sequence multiple video generations with continuity.
          </Typography>
          <Button variant="contained" startIcon={<Add />} onClick={() => setIsCreateOpen(true)}>
            Create First Chain
          </Button>
        </Card>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 3,
          }}
        >
          {chains.map(chain => (
            <Card
              key={chain.id}
              sx={{
                cursor: 'pointer',
                transition: 'transform 0.2s, border-color 0.2s',
                border: '1px solid transparent',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  borderColor: 'primary.main',
                },
              }}
              onClick={() => onSelectChain(chain.id)}
            >
              <CardContent>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      {chain.name}
                    </Typography>
                    <Chip
                      label={chain.status}
                      size="small"
                      color={getStatusColor(chain.status) as any}
                      sx={{ mt: 1 }}
                    />
                  </Box>
                  <IconButton size="small" onClick={e => handleMenuOpen(e, chain.id)}>
                    <MoreVert />
                  </IconButton>
                </Box>

                {chain.description && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 2, overflow: 'hidden', textOverflow: 'ellipsis' }}
                  >
                    {chain.description}
                  </Typography>
                )}

                <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    {chain._count?.segments || 0} segments
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {chain._count?.characters || 0} characters
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {chain.aspectRatio}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem
          onClick={() => {
            onSelectChain(selectedChainId!);
            handleMenuClose();
          }}
        >
          <Edit fontSize="small" sx={{ mr: 1 }} /> Edit
        </MenuItem>
        <MenuItem onClick={() => selectedChainId && handleGenerateChain(selectedChainId)}>
          <PlayArrow fontSize="small" sx={{ mr: 1 }} /> Generate All
        </MenuItem>
        <MenuItem onClick={handleDeleteChain} sx={{ color: 'error.main' }}>
          <Delete fontSize="small" sx={{ mr: 1 }} /> Delete
        </MenuItem>
      </Menu>

      <Dialog open={isCreateOpen} onClose={() => setIsCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Scene Chain</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="Chain Name"
            fullWidth
            value={newChainName}
            onChange={e => setNewChainName(e.target.value)}
            sx={{ mt: 2, mb: 2 }}
          />
          <TextField
            label="Description (Optional)"
            fullWidth
            multiline
            rows={3}
            value={newChainDescription}
            onChange={e => setNewChainDescription(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateChain} disabled={!newChainName.trim()}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
