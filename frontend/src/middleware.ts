import { NextRequest, NextResponse } from 'next/server';

// AI crawler User-Agents that need static HTML (can't execute JavaScript)
const AI_BOT_USER_AGENTS = [
    'GPTBot',
    'ChatGPT-User',
    'Google-Extended',
    'Googlebot',
    'Bingbot',
    'ClaudeBot',
    'Claude-Web',
    'APIs-Google',
    'Anthropic-AI',
    'PerplexityBot',
];

// Generate static HTML for AI crawlers
function generateStaticHTML(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VibeBoard Studio - AI Video Generation Platform</title>
    <meta name="description" content="VibeBoard is a professional AI video generation platform with multi-provider orchestration, cinematic controls, and production-ready export.">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="https://vibeboard.studio/">
</head>
<body>
    <header>
        <h1>VibeBoard Studio</h1>
        <p>AI Video Generation Platform for Creators</p>
    </header>

    <main>
        <section>
            <h2>About VibeBoard</h2>
            <p>VibeBoard is a professional AI video generation platform that combines multiple AI providers into a unified creative workflow. Built for filmmakers, content creators, and visual artists who need production-quality AI-generated video content.</p>
        </section>

        <section>
            <h2>Key Features</h2>
            <ul>
                <li><strong>Multi-Provider AI Generation</strong> - Access 100+ AI models from Fal.ai, Replicate, Together AI, OpenAI, Google, and more</li>
                <li><strong>Text-to-Video</strong> - Generate videos from text prompts using Wan 2.1, Kling, Veo 3, Luma Ray 2, MiniMax, and LTX</li>
                <li><strong>Image-to-Video</strong> - Animate still images with motion and camera movement</li>
                <li><strong>Character Consistency</strong> - Maintain character identity across generations using LoRAs, IP-Adapter, and Flux Kontext</li>
                <li><strong>Cinematic Controls</strong> - Professional camera presets, lens simulation, and lighting setups</li>
                <li><strong>Story Editor</strong> - Script-to-storyboard pipeline with genre styling and director aesthetics</li>
                <li><strong>NLE Timeline</strong> - Non-linear editing with L-Cut/J-Cut support and audio trimming</li>
                <li><strong>Magic Eraser</strong> - AI-powered object removal and inpainting</li>
                <li><strong>Character Foundry</strong> - Generate synthetic training datasets from single images</li>
                <li><strong>Virtual Gaffer</strong> - Inverse lighting analysis with 3-point setup visualization</li>
                <li><strong>Visual Librarian</strong> - Semantic search using cinematic terminology (framing, lighting, lens)</li>
                <li><strong>Export Pipeline</strong> - 24fps CFR output for Premiere/Resolve with EDL and sidecar JSON</li>
            </ul>
        </section>

        <section>
            <h2>AI Providers Integrated</h2>
            <ul>
                <li>Fal.ai - Flux, Wan, Kling, Ideogram, Recraft, IP-Adapter</li>
                <li>Replicate - Custom LoRA models, Consistent Character</li>
                <li>Together AI - Flux Schnell, SDXL</li>
                <li>OpenAI - DALL-E 3, GPT-4 Vision, Sora</li>
                <li>Google - Imagen 3, Veo 3</li>
                <li>xAI - Grok Vision (primary LLM for analysis)</li>
                <li>RunPod - GPU Serverless for custom models</li>
                <li>CivitAI - LoRA library integration</li>
                <li>ComfyUI - Local workflow execution</li>
            </ul>
        </section>

        <section>
            <h2>Production Features</h2>
            <ul>
                <li><strong>Multi-Pass Render Queue</strong> - Draft/Review/Master workflow with seed inheritance for cost savings</li>
                <li><strong>Electronic Press Kit (EPK)</strong> - Self-contained HTML export for studios and clients</li>
                <li><strong>Director's Loupe</strong> - RGB Histogram and Luma Waveform scopes</li>
                <li><strong>Pro Trajectory Engine</strong> - CoTracker3 point tracking for prop compositing</li>
                <li><strong>DOF Simulator</strong> - Real-time depth of field preview with layer controls</li>
                <li><strong>YouTube Delivery</strong> - OAuth2 integration with AI metadata generation</li>
            </ul>
        </section>

        <section>
            <h2>Technical Architecture</h2>
            <ul>
                <li>Frontend: Next.js 16 with React 19, TypeScript, Tailwind CSS 4</li>
                <li>Backend: Node.js with Express, Prisma ORM</li>
                <li>GPU Worker: RunPod Serverless with NVIDIA L40</li>
                <li>Database: PostgreSQL (production), SQLite (development)</li>
                <li>Hosting: Cloudflare Tunnel to Mac Mini</li>
            </ul>
        </section>

        <section>
            <h2>Contact</h2>
            <p>VibeBoard Studio is developed by Antigravity.</p>
            <p>Website: <a href="https://vibeboard.studio">https://vibeboard.studio</a></p>
        </section>
    </main>

    <footer>
        <p>&copy; 2025 VibeBoard Studio. All rights reserved.</p>
    </footer>
</body>
</html>`;
}

export function middleware(request: NextRequest) {
    const userAgent = request.headers.get('user-agent') || '';

    // Check if request is from an AI crawler
    const isAIBot = AI_BOT_USER_AGENTS.some(bot =>
        userAgent.toLowerCase().includes(bot.toLowerCase())
    );

    // Only intercept for root and main pages, not API routes or static assets
    const pathname = request.nextUrl.pathname;
    const shouldIntercept = isAIBot && (
        pathname === '/' ||
        pathname === '/projects' ||
        pathname.startsWith('/projects/') && !pathname.includes('/api/')
    );

    if (shouldIntercept) {
        // Return static HTML for AI crawlers
        return new NextResponse(generateStaticHTML(), {
            status: 200,
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'X-Robots-Tag': 'index, follow',
                'Cache-Control': 'public, max-age=3600',
            },
        });
    }

    // Let normal requests through
    return NextResponse.next();
}

// Configure which paths the middleware runs on
export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization)
         * - favicon.ico, robots.txt, sitemap.xml
         * - API routes
         */
        '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|api/).*)',
    ],
};
