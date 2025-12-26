'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Box, Container, Typography, Button } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import SceneChainList from '@/components/scenechain/SceneChainList';
import SceneChainEditor from '@/components/scenechain/SceneChainEditor';

export default function SceneChainsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [selectedChainId, setSelectedChainId] = useState<string | null>(null);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {!selectedChainId ? (
        <>
          <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button startIcon={<ArrowBack />} onClick={() => router.push(`/projects/${projectId}`)}>
              Back to Project
            </Button>
            <Typography variant="h4" component="h1" fontWeight="bold">
              Scene Chains
            </Typography>
          </Box>

          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Create scene chains to sequence multiple video generations with consistent characters
            and style. Each segment builds on the previous one, creating seamless video narratives.
          </Typography>

          <SceneChainList projectId={projectId} onSelectChain={setSelectedChainId} />
        </>
      ) : (
        <SceneChainEditor
          projectId={projectId}
          chainId={selectedChainId}
          onBack={() => setSelectedChainId(null)}
        />
      )}
    </Container>
  );
}
