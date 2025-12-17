'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    Box,
    Container,
    Typography,
    Button,
    Card,
    CardActionArea
} from '@mui/material';
import { ArrowBack, Speed, Tune } from '@mui/icons-material';
import QuickModeWorkflow from '@/components/extend/QuickModeWorkflow';
import AdvancedModeWorkflow from '@/components/extend/AdvancedModeWorkflow';

export default function ExtendVideoPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.id as string;

    const [mode, setMode] = useState<'select' | 'quick' | 'advanced'>('select');

    return (
        <Container maxWidth="xl" sx={{ py: 4 }}>
            <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Button
                    startIcon={<ArrowBack />}
                    onClick={() => mode === 'select' ? router.push(`/projects/${projectId}`) : setMode('select')}
                >
                    {mode === 'select' ? 'Back to Project' : 'Change Mode'}
                </Button>
                <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
                    Extend Video
                </Typography>
            </Box>

            {mode === 'select' && (
                <Box sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    gap: 4,
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: '60vh'
                }}>
                    <Box sx={{ width: { xs: '100%', md: '40%' } }}>
                        <Card
                            sx={{
                                height: '100%',
                                border: '1px solid rgba(255,255,255,0.1)',
                                transition: 'transform 0.2s, border-color 0.2s',
                                '&:hover': {
                                    transform: 'translateY(-4px)',
                                    borderColor: 'primary.main'
                                }
                            }}
                        >
                            <CardActionArea
                                sx={{ height: '100%', p: 4, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start' }}
                                onClick={() => setMode('quick')}
                            >
                                <Box sx={{
                                    p: 2,
                                    borderRadius: '50%',
                                    bgcolor: 'primary.main',
                                    color: 'black',
                                    mb: 3
                                }}>
                                    <Speed fontSize="large" />
                                </Box>
                                <Typography variant="h4" gutterBottom fontWeight="bold">
                                    Quick Mode
                                </Typography>
                                <Typography variant="h6" color="text.secondary" gutterBottom>
                                    Fast & Automated
                                </Typography>
                                <Typography variant="body1" color="text.secondary" paragraph>
                                    Best for rapid iteration and testing ideas.
                                </Typography>
                                <Box component="ul" sx={{ pl: 2, color: 'text.secondary' }}>
                                    <li>Auto-recommended models</li>
                                    <li>Smart prompt enhancement</li>
                                    <li>Simple variations</li>
                                    <li>~2 minutes setup</li>
                                </Box>
                            </CardActionArea>
                        </Card>
                    </Box>

                    <Box sx={{ width: { xs: '100%', md: '40%' } }}>
                        <Card
                            sx={{
                                height: '100%',
                                border: '1px solid rgba(255,255,255,0.1)',
                                transition: 'transform 0.2s, border-color 0.2s',
                                '&:hover': {
                                    transform: 'translateY(-4px)',
                                    borderColor: 'secondary.main'
                                }
                            }}
                        >
                            <CardActionArea
                                sx={{ height: '100%', p: 4, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start' }}
                                onClick={() => setMode('advanced')}
                            >
                                <Box sx={{
                                    p: 2,
                                    borderRadius: '50%',
                                    bgcolor: 'secondary.main',
                                    color: 'black',
                                    mb: 3
                                }}>
                                    <Tune fontSize="large" />
                                </Box>
                                <Typography variant="h4" gutterBottom fontWeight="bold">
                                    Advanced Mode
                                </Typography>
                                <Typography variant="h6" color="text.secondary" gutterBottom>
                                    Full Control
                                </Typography>
                                <Typography variant="body1" color="text.secondary" paragraph>
                                    Best for production-ready shots and specific styles.
                                </Typography>
                                <Box component="ul" sx={{ pl: 2, color: 'text.secondary' }}>
                                    <li>Manual model selection</li>
                                    <li>Detailed character & style control</li>
                                    <li>Custom parameter tuning</li>
                                    <li>Consistency analysis</li>
                                </Box>
                            </CardActionArea>
                        </Card>
                    </Box>
                </Box>
            )}

            {mode === 'quick' && <QuickModeWorkflow projectId={projectId} />}
            {mode === 'advanced' && <AdvancedModeWorkflow projectId={projectId} />}

        </Container>
    );
}
