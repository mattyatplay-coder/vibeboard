import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'VibeBoard Studio - AI-Powered Cinematic Production Suite',
  description:
    'Professional AI video generation platform with multi-provider orchestration, character consistency, storyboarding, and real-time collaboration.',
};

// This is a Server Component - fully rendered HTML for AI bots and SEO
export default function ShowcasePage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Hero Section */}
      <header className="relative overflow-hidden px-6 py-24 text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 to-transparent" />
        <div className="relative mx-auto max-w-4xl">
          <h1 className="bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-6xl font-bold text-transparent">
            VibeBoard Studio
          </h1>
          <p className="mt-6 text-xl text-gray-300">AI-Powered Cinematic Production Suite</p>
          <p className="mt-4 text-lg text-gray-400">
            Professional video generation platform with multi-provider AI orchestration, character
            consistency, storyboarding, and real-time collaboration.
          </p>
        </div>
      </header>

      {/* Features Grid */}
      <main className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="mb-12 text-center text-3xl font-bold">Core Features</h2>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {/* Feature: Multi-Provider AI */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="mb-3 text-xl font-semibold text-blue-400">
              Multi-Provider AI Generation
            </h3>
            <p className="text-gray-400">
              Seamlessly switch between Fal.ai, Replicate, Together AI, OpenAI, Google, and RunPod
              for text-to-image, image-to-video, and text-to-video generation.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-gray-500">
              <li>• 100+ AI models available</li>
              <li>• Automatic provider failover</li>
              <li>• Cost optimization routing</li>
            </ul>
          </section>

          {/* Feature: Character Consistency */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="mb-3 text-xl font-semibold text-purple-400">Character Consistency</h3>
            <p className="text-gray-400">
              Maintain character identity across scenes using IP-Adapter, Flux Kontext, custom
              LoRAs, and face preservation technology.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-gray-500">
              <li>• Character Foundry for synthetic datasets</li>
              <li>• 4 reference images per generation</li>
              <li>• Custom LoRA training support</li>
            </ul>
          </section>

          {/* Feature: Storyboard & Timeline */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="mb-3 text-xl font-semibold text-green-400">Storyboard & Timeline</h3>
            <p className="text-gray-400">
              Visual storyboarding with scene chains, shot navigator, and NLE timeline with
              L-Cut/J-Cut audio editing support.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-gray-500">
              <li>• Drag-and-drop shot organization</li>
              <li>• Beginning/Ending frame workflow</li>
              <li>• Export to CMX 3600 EDL</li>
            </ul>
          </section>

          {/* Feature: Virtual Gaffer */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="mb-3 text-xl font-semibold text-amber-400">Virtual Gaffer</h3>
            <p className="text-gray-400">
              AI-powered lighting analysis with inverse gaffing - drop a reference image to
              automatically recreate the lighting setup.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-gray-500">
              <li>• Grok Vision analysis</li>
              <li>• Gel color presets</li>
              <li>• 3D light positioning</li>
            </ul>
          </section>

          {/* Feature: Visual Librarian */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="mb-3 text-xl font-semibold text-cyan-400">Visual Librarian</h3>
            <p className="text-gray-400">
              Semantic search across all generations using professional cinematography terminology -
              search by framing, lighting, lens, and mood.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-gray-500">
              <li>• ECU, CU, WS framing detection</li>
              <li>• Chiaroscuro, rim-lit analysis</li>
              <li>• Find similar composition/lighting</li>
            </ul>
          </section>

          {/* Feature: Processing Suite */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="mb-3 text-xl font-semibold text-pink-400">VFX Processing Suite</h3>
            <p className="text-gray-400">
              Magic Eraser inpainting, tattoo compositing, rotoscoping, set extension, and
              AI-powered video enhancement.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-gray-500">
              <li>• Brush-based mask painting</li>
              <li>• RIFE frame interpolation</li>
              <li>• MMAudio sound generation</li>
            </ul>
          </section>
        </div>

        {/* UI Architecture Section */}
        <section className="mt-20">
          <h2 className="mb-8 text-center text-3xl font-bold">UI Architecture</h2>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
            <h3 className="mb-4 text-xl font-semibold">Design System</h3>
            <p className="mb-6 text-gray-400">
              VibeBoard uses a &quot;Glass Studio&quot; theme with glassmorphism, dark mode by
              default, and a cohesive color palette inspired by professional video editing software.
            </p>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h4 className="mb-3 font-medium text-gray-300">Color Palette</h4>
                <ul className="space-y-2 text-sm text-gray-500">
                  <li className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded bg-blue-500" /> Primary: Blue (#3B82F6)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded bg-purple-500" /> Accent: Purple (#A855F7)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded bg-zinc-950" /> Background: Zinc-950 (#09090B)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded border border-white/20 bg-white/5" /> Cards:
                    White/5 with border
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="mb-3 font-medium text-gray-300">Component Library</h4>
                <ul className="space-y-2 text-sm text-gray-500">
                  <li>• Radix UI primitives (Dropdown, Tooltip, Dialog)</li>
                  <li>• Framer Motion animations</li>
                  <li>• Lucide React icons</li>
                  <li>• Tailwind CSS 4 with custom utilities</li>
                  <li>• DnD Kit for drag-and-drop</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Page Structure */}
        <section className="mt-12">
          <h3 className="mb-6 text-xl font-semibold">Application Pages</h3>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <h4 className="font-medium text-blue-400">/projects/[id]/generate</h4>
              <p className="mt-1 text-sm text-gray-500">
                Main generation interface with unified prompt bar, model selector, element picker,
                and masonry gallery of results.
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <h4 className="font-medium text-purple-400">/projects/[id]/storyboard</h4>
              <p className="mt-1 text-sm text-gray-500">
                Visual storyboard with scene chains, shot cards, first/last frame workflow, and
                per-shot video generation.
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <h4 className="font-medium text-green-400">/projects/[id]/timeline</h4>
              <p className="mt-1 text-sm text-gray-500">
                NLE timeline with video track, audio track, trim handles, L-Cut/J-Cut support, and
                FFmpeg baking.
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <h4 className="font-medium text-amber-400">/projects/[id]/elements</h4>
              <p className="mt-1 text-sm text-gray-500">
                Asset library for character references, props, backgrounds, and other reusable
                elements.
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <h4 className="font-medium text-cyan-400">/projects/[id]/train</h4>
              <p className="mt-1 text-sm text-gray-500">
                Character Foundry for LoRA training with synthetic dataset generation and pose
                presets.
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <h4 className="font-medium text-pink-400">/projects/[id]/process</h4>
              <p className="mt-1 text-sm text-gray-500">
                VFX suite with Magic Eraser, tattoo compositing, rotoscoping, set extension, and
                video enhancement.
              </p>
            </div>
          </div>
        </section>

        {/* Key Components */}
        <section className="mt-12">
          <h3 className="mb-6 text-xl font-semibold">Key UI Components</h3>

          <div className="space-y-4 text-sm">
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <code className="text-blue-400">GenerationCard</code>
              <p className="mt-1 text-gray-500">
                Displays generated images/videos with hover toolbar containing actions: Fullscreen,
                Download, Upscale (Clarity 2x/4x, Aura SR), Animate (I2V), Enhance (Audio, Smooth),
                AI Reshoot, Find Similar, Delete.
              </p>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <code className="text-purple-400">EngineLibraryModal</code>
              <p className="mt-1 text-gray-500">
                Model browser with category filters (Image, Video, Animation, Character), provider
                filters (Fal.ai, Replicate, etc.), LoRA compatibility badges, and favorites system.
              </p>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <code className="text-green-400">ShotNavigator</code>
              <p className="mt-1 text-gray-500">
                Scene chain selector with shot cards, drag-and-drop frame assignment,
                click-to-upload for beginning/ending frames, and per-shot video generation.
              </p>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <code className="text-amber-400">LightingStage</code>
              <p className="mt-1 text-gray-500">
                3D lighting visualization with draggable lights, gel color pickers, intensity
                sliders, and inverse gaffing via reference image analysis.
              </p>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <code className="text-cyan-400">PromptBuilder</code>
              <p className="mt-1 text-gray-500">
                Smart prompt enhancement with LoRA trigger words, character references, style
                presets, and AI-powered prompt refinement via Grok.
              </p>
            </div>
          </div>
        </section>

        {/* API Endpoints */}
        <section className="mt-12">
          <h3 className="mb-6 text-xl font-semibold">API Endpoints</h3>
          <p className="mb-4 text-gray-400">
            Backend runs on Express.js with Prisma ORM. Key endpoints:
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  <th className="pr-4 pb-3 font-medium text-gray-300">Endpoint</th>
                  <th className="pb-3 font-medium text-gray-300">Description</th>
                </tr>
              </thead>
              <tbody className="text-gray-500">
                <tr className="border-b border-white/5">
                  <td className="py-2 pr-4 font-mono text-blue-400">
                    POST /api/projects/:id/generations
                  </td>
                  <td className="py-2">Create new AI generation</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-2 pr-4 font-mono text-purple-400">
                    GET /api/projects/:id/scene-chains
                  </td>
                  <td className="py-2">List storyboard scene chains</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-2 pr-4 font-mono text-green-400">
                    POST /api/process/magic-eraser
                  </td>
                  <td className="py-2">AI object removal with mask</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-2 pr-4 font-mono text-amber-400">POST /api/lighting/analyze</td>
                  <td className="py-2">Grok Vision lighting analysis</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-2 pr-4 font-mono text-cyan-400">
                    GET /api/projects/:id/search
                  </td>
                  <td className="py-2">Semantic search generations</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-mono text-pink-400">POST /api/youtube/upload</td>
                  <td className="py-2">YouTube delivery integration</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 px-6 py-12 text-center text-gray-500">
        <p>VibeBoard Studio - AI-Powered Cinematic Production Suite</p>
        <p className="mt-2 text-sm">
          Built with Next.js 16, React 19, TypeScript, Tailwind CSS 4, Prisma, and 100+ AI models.
        </p>
        <p className="mt-4">
          <a href="/api/info" className="text-blue-400 hover:underline">
            API Documentation
          </a>
          {' • '}
          <a href="/" className="text-blue-400 hover:underline">
            Launch App
          </a>
        </p>
      </footer>
    </div>
  );
}
