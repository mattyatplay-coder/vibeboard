# 📦 Phase 3: The Asset Bin (Art Department)

**Objective:** Upgrade the "Elements" page to support 3D Scene Deconstruction and PBR Material Extraction via the GPU Worker.

## 1. Backend: New Controller (`assetController.ts`)
Create a new controller to handle asset transformation requests.

```typescript
import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { gpuWorkerClient } from '../services/gpu/GPUWorkerClient';

export const assetController = {

  /**
   * Deconstruct a 2D image into 3D objects
   * POST /api/projects/:projectId/assets/deconstruct
   */
  deconstructScene: async (req: Request, res: Response) => {
    const { elementId } = req.body;
    const element = await prisma.element.findUnique({ where: { id: elementId } });

    if (!element?.fileUrl) return res.status(404).json({ error: "Element not found" });

    // 1. Submit to RunPod (Task: 'scene_deconstruct')
    // Expects: { image_url: string }
    const result = await gpuWorkerClient.submitTask('scene_deconstruct', {
      image_url: element.fileUrl
    });

    // 2. Update Element to show processing state
    await prisma.element.update({
      where: { id: elementId },
      data: {
        metadata: {
          ...JSON.parse(element.metadata as string || '{}'),
          deconstructStatus: 'processing'
        }
      }
    });

    res.json({ success: true, message: "Deconstruction started" });
  },

  /**
   * Extract PBR Maps (Albedo, Normal, Roughness)
   * POST /api/projects/:projectId/assets/extract-materials
   */
  extractMaterials: async (req: Request, res: Response) => {
    const { elementId } = req.body;
    const element = await prisma.element.findUnique({ where: { id: elementId } });

    // Task: 'extract_pbr'
    await gpuWorkerClient.submitTask('extract_pbr', {
      image_url: element?.fileUrl
    });

    res.json({ success: true, message: "Material extraction started" });
  }
};
```

*Note: You will need to add `submitTask` to `GPUWorkerClient` if you haven't exposed a generic method, or add specific methods like `deconstructScene`.*

## 2. GPU Client Update (`GPUWorkerClient.ts`)
Add the specific interfaces for Phase 3 tasks.

```typescript
// Add to existing methods
async deconstructScene(imageUrl: string): Promise<ProcessingResult> {
  return this.executeOperation('scene_deconstruct', { image_url: imageUrl });
}

async extractMaterials(imageUrl: string): Promise<ProcessingResult> {
  return this.executeOperation('extract_pbr', { image_url: imageUrl });
}
```

## 3. Frontend Updates (`frontend/src/app/projects/[id]/elements/page.tsx`)

**A. Add "Deconstruct" Action:**
*   In `ElementCard`, add a button (Icon: `BoxSelect` or `Component`).
*   Only show this button if `element.type === 'image'`.
*   On click, call the `deconstruct` endpoint.

**B. Add "Material View" Modal:**
*   If an element has `metadata.pbrMaps`, show a "View Materials" button.
*   Opens a modal displaying the 4 maps (Albedo, Normal, Roughness, Metallic).
