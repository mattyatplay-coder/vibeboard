# VibeBoard

A self-hosted AI video generation platform.

## Architecture
- **Frontend**: Next.js 16 (React 19, TypeScript, Tailwind CSS 4)
- **Backend**: Node.js (Express, TypeScript, Prisma)
- **Database**: SQLite (dev) / PostgreSQL (production)
- **Storage**: Local filesystem (mounted volume)
- **AI Providers**: Fal.ai, Google Veo, ComfyUI (local)

## Prerequisites
- Docker & Docker Desktop
- Node.js 18+ (for local dev)
- Fal.ai API key (for cloud generation)

## Quick Start (Docker)

1. **Start the full stack:**
   ```bash
   docker-compose up --build
   ```

2. **Access the app:**
   - Frontend: [http://localhost:3000](http://localhost:3000)
   - Backend API: [http://localhost:3001](http://localhost:3001)

## Local Development

### Backend
1. Navigate to `backend`:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start Postgres (if not running via Docker Compose):
   ```bash
   # From root
   docker-compose up -d postgres
   ```
4. Run migrations:
   ```bash
   npx prisma migrate dev
   ```
5. Start server:
   ```bash
   npm run dev
   ```

### Frontend
1. Navigate to `frontend`:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start dev server:
   ```bash
   npm run dev
   ```

### Running Tests
```bash
cd frontend
npm test                    # Run all Playwright tests
npm run test:ui             # Run tests with Playwright UI
npm run test:audit          # Run session fixes audit tests
```

## Deployment (Hostinger VPS)

1. **SSH into your VPS.**
2. **Clone this repository.**
3. **Install Docker & Docker Compose.**
4. **Configure Environment:**
   - Create a `.env` file in `backend` with your API keys.
   - Update `docker-compose.yml` with secure passwords.
5. **Run:**
   ```bash
   docker-compose up -d --build
   ```
6. **Reverse Proxy (Nginx):**
   - Point your domain to `localhost:3000`.

## Features

### Core Features
- **Projects**: Create and manage multiple projects
- **Elements**: Upload characters, props, and locations with metadata
- **Generate**: Create AI generations with real-time queuing
- **Storyboard**: Organize shots into scenes with drag-and-drop

### Generation Features
- **30+ AI Models** via Fal.ai:
  - **Image Models**: Flux Dev/Schnell/Pro, Recraft V3, Ideogram V2, Stable Diffusion 3.5
  - **Video Models**: Wan 2.2/2.5, Kling 2.1/2.6/O1, Hunyuan, MiniMax, Luma Dream Machine, LTX-Video
  - **Upscalers**: Clarity Upscaler (2x/4x), Creative Upscaler, Aura SR
- **Google Veo** 2, 3, 3.1 support
- **Local ComfyUI** integration (free, unlimited generations)
- **Video Intent Auto-Detection** from prompt keywords

### Storyboard Workflow
- **Foundation Image Panel** with Timeline Prompting structure:
  - Aesthetic + Lighting + Color Palette + Camera Direction
  - Inspired by professional AI video workflows
- **Shot Actions Panel** with V2V editing:
  - Weather presets (Sunny, Night, Rain, Snow, Fog, Storm)
  - Camera angle changes (Overhead, Low, Close-up, Wide, Dutch, POV)
  - Background change with custom prompts
  - Predict Next/Previous shot features
- **Grab First/Last Frame** for seamless video extensions

### Style & Parameters
- **24 Style Presets** including Cinematic, Anime, Film Noir, Indie, Y2K, Pop Art, Grunge
- **3-Column Layout** for efficient style selection
- **Quick Add Tags** with 7 categories: Cameras, Lenses, Film Stock, Color Grade, Lighting, Motion, Mood
- **LoRA Management** with Civitai integration and version grouping
- **Custom Workflow Upload** (ComfyUI JSON)

### Generation Card UI
- **Top Left**: Selection checkbox + Favorite heart
- **Top Right**: Fullscreen, Upscale (3 options), Animate, Download, Delete
- **Upscale Modal**: Clarity 2x, Clarity 4x, Aura SR
- **Reliable Downloads** using blob fetch

### LoRA Training & Character Foundry
- **Character Foundry**: Generate 20 pose variations from a single reference image
  - Powered by Flux 2 Max for best character consistency
  - 7 clothing-aware pose presets (Universal, Swimwear, Casual, Formal, Fantasy, Anime, Cartoon)
  - Dynamic aspect ratios (1:1, 3:4, 9:16) based on shot type
  - Frame-relative directions for accurate pose rendering
  - External editing support (edit in Photoshop before training)
- **Smart Dataset Curation**: Face matching with cosine similarity
- **Multi-Provider Training**: Fal.ai and Replicate support
- **Video Frame Extraction**: Extract training frames from video with ffmpeg

### Backend Features
- **JSON Field Serialization** for SQLite compatibility
- **LoRA Editing** with PUT endpoint
- **Nested Generation Parsing** in scenes

## Environment Variables

### Backend (.env)
```env
FAL_KEY=your_fal_api_key
GOOGLE_API_KEY=your_google_api_key
DATABASE_URL=file:./dev.db
```

## API Endpoints

### Projects
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project details
- `DELETE /api/projects/:id` - Delete project

### Generations
- `GET /api/projects/:id/generations` - List generations
- `POST /api/projects/:id/generations` - Create generation
- `PATCH /api/projects/:id/generations/:genId` - Update generation
- `DELETE /api/projects/:id/generations/:genId` - Delete generation

### Elements
- `GET /api/projects/:id/elements` - List elements
- `POST /api/projects/:id/elements` - Upload element
- `DELETE /api/projects/:id/elements/:elemId` - Delete element

### LoRAs
- `GET /api/projects/:id/loras` - List LoRAs
- `POST /api/projects/:id/loras` - Add LoRA
- `PUT /api/projects/:id/loras/:loraId` - Update LoRA
- `DELETE /api/projects/:id/loras/:loraId` - Delete LoRA

### Scenes
- `GET /api/projects/:id/scenes` - List scenes with shots
- `POST /api/projects/:id/scenes` - Create scene
- `POST /api/scenes/:sceneId/shots` - Add shot to scene

### Training (LoRA)
- `GET /api/training/pose-presets` - List available pose presets
- `POST /api/training/jobs` - Create training job
- `GET /api/training/jobs` - List all training jobs
- `POST /api/training/jobs/:id/curate` - Upload images for curation
- `POST /api/training/jobs/:id/generate-dataset` - Generate synthetic dataset (Character Foundry)
- `GET /api/training/jobs/:id/dataset` - Get generated dataset images
- `DELETE /api/training/jobs/:id/dataset/:filename` - Delete dataset image
- `POST /api/training/jobs/:id/start` - Start training
- `DELETE /api/training/jobs/:id` - Delete training job

## Recent Updates

### December 2024
- **Character Foundry**: Single-image to full training dataset generation
  - 7 pose presets (Universal, Swimwear, Casual, Formal, Fantasy, Anime, Cartoon)
  - Flux 2 Max integration for character consistency
  - External editing workflow support
- **Cinematic Tags System**: 150+ professional cinematography tags across 7 categories
  - Cameras (including 2025 smartphones), Lenses, Film Stock, Color Grade, Lighting, Motion, Mood
  - Social media filter presets (Instagram, TikTok, VSCO)
- Added Wan 2.5 T2V/I2V support
- Added Kling O1 T2V/I2V/V2V Edit models
- Added Kling 2.6 T2V/I2V models
- Added Google Veo 3.1 as default video model
- Enhanced video intent detection from prompts
- Added storyboard workflow enhancements (Timeline Prompting, V2V editing)
- Added LoRA editing functionality
- Fixed JSON field serialization for SQLite
- Added comprehensive Playwright test suite
- UI improvements: scrollbar hiding, GenerationCard layout, upscale modal

## Deployment Status
Last updated: Tue Dec 17 12:00:00 EST 2024
