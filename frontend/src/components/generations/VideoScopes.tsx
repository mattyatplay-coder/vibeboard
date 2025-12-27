/**
 * VideoScopes - Director's Loupe
 *
 * Professional RGB Histogram and Luma Waveform scopes for quality control.
 * Helps identify clipping, exposure issues, and color balance.
 *
 * Features:
 * - RGB Histogram: Shows R/G/B channel distribution
 * - Luma Waveform: Shows brightness levels (BT.709)
 * - Clipping Indicators: Red bars for crushed blacks/clipped highlights
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { clsx } from 'clsx';
import { Activity, BarChart3 } from 'lucide-react';

type ScopeType = 'histogram' | 'waveform';

interface VideoScopesProps {
  imageUrl?: string;
  videoRef?: React.RefObject<HTMLVideoElement>;
  className?: string;
  defaultType?: ScopeType;
}

export function VideoScopes({
  imageUrl,
  videoRef,
  className,
  defaultType = 'histogram',
}: VideoScopesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scopeType, setScopeType] = useState<ScopeType>(defaultType);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const animationFrameRef = useRef<number | undefined>(undefined);

  // BT.709 Luma coefficients
  const LUMA_R = 0.2126;
  const LUMA_G = 0.7152;
  const LUMA_B = 0.0722;

  const analyzeFrame = useCallback((sourceCanvas: HTMLCanvasElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Get source image data
    const sourceCtx = sourceCanvas.getContext('2d');
    if (!sourceCtx) return;

    const imageData = sourceCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
    const data = imageData.data;

    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);

    if (scopeType === 'histogram') {
      drawHistogram(ctx, data, width, height);
    } else {
      drawWaveform(ctx, data, sourceCanvas.width, sourceCanvas.height, width, height);
    }
  }, [scopeType]);

  const drawHistogram = (
    ctx: CanvasRenderingContext2D,
    data: Uint8ClampedArray,
    width: number,
    height: number
  ) => {
    // Initialize histogram bins
    const rHist = new Array(256).fill(0);
    const gHist = new Array(256).fill(0);
    const bHist = new Array(256).fill(0);

    // Count pixel values
    for (let i = 0; i < data.length; i += 4) {
      rHist[data[i]]++;
      gHist[data[i + 1]]++;
      bHist[data[i + 2]]++;
    }

    // Find max value for normalization
    const maxVal = Math.max(
      ...rHist.slice(1, 254),
      ...gHist.slice(1, 254),
      ...bHist.slice(1, 254)
    );

    const barWidth = width / 256;
    const padding = 10;
    const graphHeight = height - padding * 2;

    // Draw each channel
    const drawChannel = (hist: number[], color: string, alpha: number) => {
      ctx.fillStyle = color;
      ctx.globalAlpha = alpha;

      for (let i = 0; i < 256; i++) {
        const barHeight = (hist[i] / maxVal) * graphHeight;
        ctx.fillRect(
          i * barWidth,
          height - padding - barHeight,
          barWidth,
          barHeight
        );
      }
    };

    // Draw in order: Blue, Green, Red (so red is on top)
    drawChannel(bHist, '#3b82f6', 0.6);
    drawChannel(gHist, '#22c55e', 0.6);
    drawChannel(rHist, '#ef4444', 0.6);

    ctx.globalAlpha = 1;

    // Draw clipping indicators
    const clipThreshold = maxVal * 0.8;

    // Crushed blacks
    if (rHist[0] > clipThreshold || gHist[0] > clipThreshold || bHist[0] > clipThreshold) {
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(0, 0, 4, height);
    }

    // Clipped highlights
    if (rHist[255] > clipThreshold || gHist[255] > clipThreshold || bHist[255] > clipThreshold) {
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(width - 4, 0, 4, height);
    }

    // Draw scale lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const x = (i / 4) * width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
  };

  const drawWaveform = (
    ctx: CanvasRenderingContext2D,
    data: Uint8ClampedArray,
    sourceWidth: number,
    sourceHeight: number,
    width: number,
    height: number
  ) => {
    const padding = 10;
    const graphHeight = height - padding * 2;

    // Draw IRE scale (0-100)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';

    for (let ire = 0; ire <= 100; ire += 20) {
      const y = height - padding - (ire / 100) * graphHeight;
      ctx.fillText(`${ire}`, 20, y + 3);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath();
      ctx.moveTo(25, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Sample columns for waveform
    const sampleStep = Math.max(1, Math.floor(sourceWidth / (width - 30)));

    // Create waveform data
    ctx.globalAlpha = 0.15;

    for (let col = 0; col < sourceWidth; col += sampleStep) {
      for (let row = 0; row < sourceHeight; row++) {
        const idx = (row * sourceWidth + col) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // Calculate luma using BT.709
        const luma = LUMA_R * r + LUMA_G * g + LUMA_B * b;
        const ire = luma / 255;

        const x = 30 + ((col / sourceWidth) * (width - 30));
        const y = height - padding - (ire * graphHeight);

        // Draw colored dot based on RGB dominance
        if (r > g && r > b) {
          ctx.fillStyle = '#ef4444';
        } else if (g > r && g > b) {
          ctx.fillStyle = '#22c55e';
        } else if (b > r && b > g) {
          ctx.fillStyle = '#3b82f6';
        } else {
          ctx.fillStyle = '#ffffff';
        }

        ctx.fillRect(x, y, 1, 1);
      }
    }

    ctx.globalAlpha = 1;

    // Draw clipping indicators
    // Check for crushed blacks (lots of 0 luma)
    let blackCount = 0;
    let whiteCount = 0;
    const totalPixels = sourceWidth * sourceHeight;

    for (let i = 0; i < data.length; i += 4) {
      const luma = LUMA_R * data[i] + LUMA_G * data[i + 1] + LUMA_B * data[i + 2];
      if (luma < 5) blackCount++;
      if (luma > 250) whiteCount++;
    }

    if (blackCount / totalPixels > 0.05) {
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(0, height - 4, width, 4);
      ctx.fillStyle = '#fff';
      ctx.font = '8px sans-serif';
      ctx.fillText('CRUSHED', 5, height - 6);
    }

    if (whiteCount / totalPixels > 0.05) {
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(0, 0, width, 4);
      ctx.fillStyle = '#fff';
      ctx.font = '8px sans-serif';
      ctx.fillText('CLIPPED', 5, 10);
    }
  };

  // Analyze from image URL
  useEffect(() => {
    if (!imageUrl || videoRef?.current) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = img.width;
      tempCanvas.height = img.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.drawImage(img, 0, 0);
        analyzeFrame(tempCanvas);
      }
    };
    img.src = imageUrl;
  }, [imageUrl, analyzeFrame]);

  // Analyze from video
  useEffect(() => {
    if (!videoRef?.current) return;

    const video = videoRef.current;

    const captureFrame = () => {
      if (video.readyState >= 2) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = video.videoWidth || 640;
        tempCanvas.height = video.videoHeight || 360;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.drawImage(video, 0, 0);
          analyzeFrame(tempCanvas);
        }
      }
      animationFrameRef.current = requestAnimationFrame(captureFrame);
    };

    if (!video.paused) {
      setIsAnalyzing(true);
      captureFrame();
    }

    const handlePlay = () => {
      setIsAnalyzing(true);
      captureFrame();
    };

    const handlePause = () => {
      setIsAnalyzing(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      // Capture one last frame
      captureFrame();
    };

    const handleSeeked = () => {
      // Capture frame after seek
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = video.videoWidth || 640;
      tempCanvas.height = video.videoHeight || 360;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.drawImage(video, 0, 0);
        analyzeFrame(tempCanvas);
      }
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('seeked', handleSeeked);

    // Initial capture if paused
    if (video.paused && video.readyState >= 2) {
      handleSeeked();
    }

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('seeked', handleSeeked);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [videoRef, analyzeFrame]);

  return (
    <div className={clsx('rounded-lg border border-white/10 bg-black/80 p-2', className)}>
      {/* Scope Type Toggle */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex gap-1">
          <button
            onClick={() => setScopeType('histogram')}
            className={clsx(
              'flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors',
              scopeType === 'histogram'
                ? 'bg-cyan-500/20 text-cyan-400'
                : 'text-gray-500 hover:text-white'
            )}
          >
            <BarChart3 className="h-3 w-3" />
            RGB Histogram
          </button>
          <button
            onClick={() => setScopeType('waveform')}
            className={clsx(
              'flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors',
              scopeType === 'waveform'
                ? 'bg-cyan-500/20 text-cyan-400'
                : 'text-gray-500 hover:text-white'
            )}
          >
            <Activity className="h-3 w-3" />
            Luma Waveform
          </button>
        </div>
        {isAnalyzing && (
          <span className="text-xs text-green-400">● Live</span>
        )}
      </div>

      {/* Scope Canvas */}
      <canvas
        ref={canvasRef}
        width={280}
        height={120}
        className="w-full rounded bg-black"
      />

      {/* Legend */}
      <div className="mt-1 flex justify-center gap-3 text-[10px]">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          R
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          G
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-blue-500" />
          B
        </span>
        {scopeType === 'waveform' && (
          <span className="text-gray-500">| IRE 0-100</span>
        )}
      </div>
    </div>
  );
}

export default VideoScopes;
