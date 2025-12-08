# VibeBoard

A self-hosted AI video generation platform.

## Architecture
- **Frontend**: Next.js 14 (React, TypeScript, Tailwind CSS)
- **Backend**: Node.js (Express, TypeScript, Prisma)
- **Database**: PostgreSQL
- **Storage**: Local filesystem (mounted volume)

## Prerequisites
- Docker & Docker Desktop
- Node.js 18+ (for local dev)

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

## Deployment (Hostinger VPS)

1. **SSH into your VPS.**
2. **Clone this repository.**
3. **Install Docker & Docker Compose.**
4. **Configure Environment:**
   - Create a `.env` file in `backend` if needed (though defaults work for dev).
   - Update `docker-compose.yml` with secure passwords.
5. **Run:**
   ```bash
   docker-compose up -d --build
   ```
6. **Reverse Proxy (Nginx):**
   - Point your domain to `localhost:3000`.

## Features
- **Projects**: Create and manage multiple projects.
- **Elements**: Upload characters, props, and locations.
- **Generate**: Create AI generations (mocked for MVP) with queuing.
- **Storyboard**: Organize shots into scenes.

## Deployment Status
Last updated: Mon Dec  1 22:51:09 EST 2025
