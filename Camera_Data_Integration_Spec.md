This is an excellent point of reference. **Cadrage** is a foundational tool for professional directors.

It is a **Digital Director's Viewfinder** that uses the iPhone camera to simulate the field of view (FOV) of hundreds of professional cameras and lenses *before* the shoot. Its entire value proposition is eliminating technical uncertainty.

For **VibeBoard**, we need to replicate Cadrage's **UX Credibility** and **Metadata Rigor** to make our simulation feel real.

---

### 1. The Lesson: UX Credibility and Standardization

Cadrage's brilliance is that it turns the complex language of focal length into an **unambiguous visual experience**. VibeBoard must do the same.

| Cadrage Feature | VibeBoard Integration | Implementation Detail |
| :--- | :--- | :--- |
| **Camera Menu** | **Optics Engine** (Viewfinder) | Replace generic categories ("Vintage," "Modern") with real-world **Brand Presets**. (e.g., `ARRI Alexa 35`, `RED KOMODO`, `iPhone 17 Pro`). |
| **Lens Simulation** | **Optics Engine** (Viewfinder) | Use actual lens names: `Zeiss Master Prime (50mm)` or `Cooke Anamorphic (40mm)`. This makes our DOF simulation feel tangible. |
| **Framing Guides** | **Shot Studio** (Blocking Canvas) | Add **rule-of-thirds grids, golden spirals, and safe area overlays** (16:9, 4:3, 2.35:1) directly onto the ReCo blocking canvas. |

### 2. The Core Feature: The Technical Strip (Export)

Cadrage saves images with all technical metadata attached. VibeBoard must go one step further and bake the metadata *into the final video file* for professional accountability.

*   **New Feature:** **"Burn-In Metadata"** (or **Technical Strip**)
*   **Location:** **Sequencer** (Export Final Endpoint)
*   **Implementation:** Before FFmpeg finalizes the video, add a **VFX pass** that burns in a thin, non-intrusive technical strip along the top or bottom of the frame (like professional dailies).

| Burn-In Data | VibeBoard Source |
| :--- | :--- |
| **Camera/Lens** | Optics Engine Preset |
| **Timecode** | Sequencer (Current Frame) |
| **Quality Tier** | Render Job Status (e.g., MASTER-Q5) |
| **Seed** | Original Generation Job ID |

**Impact:** This makes the VibeBoard output instantly usable as a **Final Digital Asset** in a real production workflow.

### 3. The Feature Enhancement: The Movement Check

Cadrage's weakness is it can only do static photos. VibeBoard has video.

*   **New Feature:** **"Motion Confidence Check"**
*   **Location:** **Dailies Review** (A/B Lightbox)
*   **Workflow:**
    1.  User loads a video.
    2.  They click **Motion Check**.
    3.  The system calculates the **"Temporal Coherence Score"** (how much the pixels are changing unnaturally).
*   **Visual Output:** A heatmap overlay on the video:
    *   **Green:** Score 95+ (Smooth, confident motion).
    *   **Red:** Score 70- (Glitchy hands, flickering background).
*   **Impact:** This gives the Director an objective measure of **"AI Flicker"** before the shot goes to the timeline.

### 🛠️ Final Code Directive

Add the **Technical Strip** feature to your final UI sprint.

**Frontend Task:** In the **Sequencer** export modal, add a toggle:

```typescript
// Export Modal UI
<label>
    <input type="checkbox" checked={includeTechStrip} />
    Include Technical Burn-In (Timecode, Lens, Seed)
</label>
```
**Backend Task:** In `MasterExportService.ts` add a **drawtext/drawbox** FFmpeg filter to the final command if the boolean is true.

That is the correct strategic move. The link you provided is the **data source** for professional credibility.

By incorporating real-world data like **Sensor Size** and **Aspect Ratio Limits** from that list, VibeBoard's **Optics Engine** will stop feeling like a simulator and start feeling like an indispensable prep tool.

### 1. The Architectural Integration

We will not hardcode this into the UI. We will create a **Data Service** that manages this information and a **UI Component** that displays it.

#### **A. The Data Layer (`backend/src/data/CameraDatabase.ts`)**
Create a new file to store the crucial optical constants.

```typescript
// backend/src/data/CameraDatabase.ts

export interface SensorSpec {
    diagonal_mm: number;
    crop_factor_ff: number; // Relative to Full Frame (FF)
    coc_mm: number;         // Circle of Confusion (for DOF math)
}

export interface CameraSpec {
    id: string;
    brand: string;
    model: string;
    sensor_spec: SensorSpec;
    max_aperture: number;
    aspect_ratios: string[];
}

// ARRI Alexa 35 (Example from Cadrage Data)
const ALEXA_35_SENSOR: SensorSpec = {
    diagonal_mm: 33.96,
    crop_factor_ff: 1.25, // Based on 35mm FF
    coc_mm: 0.027 // For cinematic standards
};

// ... massive array of cameras and lenses based on Cadrage specs ...
export const CAMERA_DATABASE: CameraSpec[] = [
    {
        id: 'arri_alexa_35',
        brand: 'Arri',
        model: 'Alexa 35',
        sensor_spec: ALEXA_35_SENSOR,
        max_aperture: 1.2, // Max lens aperture for DOF calculation limit
        aspect_ratios: ['4:3', '16:9', '2.39:1'],
    },
    {
        id: 'red_komodo',
        brand: 'RED',
        model: 'KOMODO 6K',
        sensor_spec: { diagonal_mm: 30.56, crop_factor_ff: 1.45, coc_mm: 0.021 },
        max_aperture: 1.0,
        aspect_ratios: ['17:9', '16:9', '2:1'],
    },
    // ... continue for Sony, Canon, Blackmagic, etc.
];

export const LENS_DATABASE: Array<{brand: string, model: string, min_f: number, max_f: number}> = [
    { brand: 'Cooke', model: 'S4/i Prime', min_f: 2.0, max_f: 22 },
    { brand: 'Zeiss', model: 'Master Prime', min_f: 1.3, max_f: 16 },
    // ... continue for all focal lengths
];
```

### 2. The UI Integration: The "Setup Panel"

#### A. Optics Engine Integration
In your **Optics Engine** page, replace the generic "Full Frame" / "APS-C" selector with a **Camera Model Selector**.

*   **Action:** When a user selects **"Arri Alexa 35"**:
    1.  The `sensor_spec.crop_factor_ff` (1.25) is injected into the backend DOF formula.
    2.  The `aspect_ratios` list (`4:3, 16:9, 2.39:1`) dynamically overrides the global Aspect Ratio selector.
*   **Result:** You prevent the user from selecting an impossible combination (e.g., shooting a 16:9 image on a 4:3-only sensor).

#### B. Shot Studio (Prompt Injection)
In the **Shot Studio** generator, the chosen camera/lens becomes part of the final prompt.

*   **Action:** If a user chooses "Zeiss Master Prime (50mm)" in the Optics Engine.
*   **Prompt Injector:** The `handleGenerate` function adds the keywords:
    `...cinematic lighting, Zeiss Master Prime lens, 50mm, shot on Arri Alexa 35...`
*   **Impact:** This dramatically improves the style coherence of the final image.

### 3. Immediate Next Step

Your coder is already focused on the final UI sprint. The logical next step is to **create the data structure** and the **UI component** that controls it.

**Action:**
1.  **Create** `backend/src/data/CameraDatabase.ts` with a subset of the Cadrage data.
2.  **Create** `frontend/src/components/optics/CameraSelector.tsx` to handle the dropdown.

This is the last piece of **data plumbing** before the entire VibeBoard architecture is fully optimized.

This is the **Data Acquisition and Reverse Engineering Protocol**.

You are correct that copying data from a single commercial app is risky and incomplete. We need a strategy to get the full technical specification (Sensor Size, Base ISO, Color Science) for the most popular cameras and, more importantly, the **AI prompt keywords** that simulate their look.

Here is the three-tiered approach to building the **VibeBoard Camera & Lens Database**.

---

### 1. Tier 1: The Technical Base (Automated Data Acquisition)

We need the non-negotiable optical facts. These can be scraped from public domain spec sheets.

| Data Point | Source | Why We Need It |
| :--- | :--- | :--- |
| **Sensor Dimensions** (Width/Height in mm) | Public Spec Sheets (e.g., *IMDB Tech Specs*, *Red Camera Docs*, *Wikipedia Camera Sensor List*) | **DOF & FOV Calculation:** This is the base for your `opticalPhysics.ts` functions (determining the Crop Factor and Angle of View). |
| **Base ISO** | Manufacturer Documentation | **Noise Simulation:** A base ISO of 800 (Alexa) gives a different "clean" than 160 (RED Monstro). This is crucial for **Negative Prompt** generation (`--no noise, digital grain`). |
| **Color Space/Gamut** | Manufacturer Documentation (e.g., *ARRI Log C4*, *REDWideGamutRGB*) | **Color Science Prompting:** This is the most valuable data. It translates to keywords like: `muted color palette, high dynamic range, Log C4 color grade` in the prompt. |

### 2. Tier 2: The "Look" (Prompt Keyword Reverse Engineering)

This cannot be found in a manual. This is the **Core IP** of your project. You must define the keywords that accurately trigger the AI to simulate the specific lens look.

#### **A. The "Look Book" Analysis Protocol**
1.  **Select Target:** E.g., **"Cooke S4/i Prime (T2.0)"**
2.  **Visual Analysis:** Search **ShotDeck** (or a similar high-res gallery) for stills shot on this specific lens.
3.  **Keyword Extraction:** Identify the signature characteristics:
    *   *Falloff:* Soft edge roll-off.
    *   *Bokeh:* Smooth, non-clinical.
    *   *Aberration:* Controlled spherical aberration.
4.  **VibeBoard Prompt:** This translates to a single keyword array:
    ```json
    "cooke_s4": ["smooth bokeh", "lens roll-off", "creamy skin tones", "vintage warmth", "cinematic look"]
    ```

#### **B. The "Anamorphic Flare" Database**
For Anamorphic lenses, the flare is the entire story.

1.  **Data Point:** **Flare Color/Shape** (E.g., Blue, Gold, Green)
2.  **Prompt:** `blue horizontal anamorphic lens flare`, `subtle gold streak flare`
3.  **Implementation:** Create a small database of these flare presets linked to the lens model. This is the simplest way to add "Pro-Grade" flair.

### 3. Tier 3: Lens Simulation (DoF & Bokeh)

This is the physics layer we already started building, but now it's data-driven.

*   **Focal Length (F):** Use the actual mm value (e.g., 35mm).
*   **Aperture (N):** Use the T-Stop (e.g., T2.0).
*   **Final Output:** When a user selects a camera and lens, the final generated prompt should be a clean concatenation:

```
// Final Prompt Construction (ScriptService.ts)
const finalPrompt = `
    [USER PROMPT]
    -- Technical Data:
    shot on ARRI Alexa 35,
    Cooke S4/i lens, 35mm, T2.0,
    Log C4 color grading,
    high contrast black and white,
    subtle gold streak flare,
    ${USER_PROMPT}
`;
```

### 4. Immediate Next Step (The Data Structure)

To handle this complexity, you must update your data model.

**Action:** Create a unified `CameraDatabase.ts` file that manages all this complex data, moving beyond simple strings.

```typescript
// backend/src/data/CameraDatabase.ts

export interface CameraSpec {
    id: string;
    brand: string;
    model: string;
    sensor_size_mm: number;
    log_color_space: string;  // e.g. 'LogC4'
    prompt_keywords: string[]; // For base style
}

export interface LensSpec {
    id: string;
    brand: string;
    model: string;
    min_t_stop: number;
    is_anamorphic: boolean;
    prompt_keywords: string[]; // e.g. 'swirly bokeh', 'creamy skin tones'
}
```

By focusing on the **Prompt Keywords** (Tier 2) and the **Physics Constants** (Tier 1), you get 90% of the Cadrage value with zero legal or scraping risk.

That is the critical trade-off at this stage.

My professional recommendation is: **Implement the Core Data Structure and Logic first (Tier 1 & 2), and then start the UX sprint.**

Here is the strategic breakdown of why we should do the **Data/Logic first** (a 1-day task) before jumping into the week-long **UX/UI sprint**:

| Task | Estimated Time | Why it Must Come First |
| :--- | :--- | :--- |
| **1. Data Structure** (Tier 1 & 2) | 1 Day | **CRITICAL Dependency:** The `Optics Engine` and `Shot Studio` pages (the UI we are about to build) **cannot function** without this data. The `CameraSelector.tsx` component relies on `CameraDatabase.ts` to populate its dropdowns. |
| **2. UX/UI Sprint** (Studio Spine, Producer Widget, Shot Studio Controls) | 5-7 Days | This is the long task. It requires the data from Step 1 to be stable so the developer doesn't have to constantly rewrite UI components. |

### The Risk of Skipping Data First

If you start the UX sprint now:
1.  The developer builds a `<CameraSelector>` component that uses hardcoded values (`"Arri"`, `"Zeiss"`).
2.  Later, they have to rewrite that component to accept the new data structure with `sensor_size_mm` and `log_color_space`.
3.  This is a **break/rewrite cycle** that slows down the long UI sprint.

### The Recommendation

We will execute a **micro-sprint** to build the data model and the corresponding prompt injection logic.

**Action Plan:**
1.  **Build** the `CameraDatabase.ts` file with the structures we defined.
2.  **Update** `ScriptService.ts` to use this data to build the final prompt.
3.  **Then**, launch into the **Final UX/UI Sprint** armed with the correct, stable data.

**Let's start by defining the final, complete data structure now.**

Here is the final **Data Acquisition and Integration Package**.

This plan focuses on creating the new data model and ensuring the **ScriptService** logic is updated to consume it, providing the foundation for the upcoming **Optics Engine** UI.

### File 1: `Camera_Data_Integration_Spec.md`

```markdown
# 📸 Phase 4A Extension: Camera & Lens Data Integration

**Objective:** Create the VibeBoard Camera/Lens database to power the Optics Engine UI and inject accurate cinematic metadata into the AI prompt.

## 1. Backend Data Structure (`backend/src/data/CameraDatabase.ts`)

Create a dedicated file to hold technical and aesthetic data for seamless injection.

```typescript
export interface SensorSpec {
    diagonal_mm: number;
    crop_factor_ff: number; // Ratio to Full Frame (1.0)
    coc_mm: number;         // Circle of Confusion (for accurate DOF)
}

export interface CameraSpec {
    id: string;
    brand: string;
    model: string;
    sensor_spec: SensorSpec;
    log_color_space: string;  // e.g., 'ARRI Log C4', 'REDWideGamutRGB'
    prompt_keywords: string[]; // Keywords for AI color science (e.g., 'high dynamic range', 'clean shadows')
    aspect_ratios: string[]; // Supported frame ratios (locks the UI selector)
}

export interface LensSpec {
    id: string;
    brand: string;
    model: string;
    focal_length_mm: number; // The specific focal length
    min_t_stop: number;      // Max aperture (e.g., 1.3)
    is_anamorphic: boolean;
    prompt_keywords: string[]; // Keywords for lens character (e.g., 'creamy skin tones', 'swirly bokeh')
}

// Example Data (Use the actual Cadrage data for all 50 models)
export const CAMERA_DATABASE: CameraSpec[] = [
    {
        id: 'arri_alexa_35',
        brand: 'Arri',
        model: 'Alexa 35',
        sensor_spec: { diagonal_mm: 33.96, crop_factor_ff: 1.25, coc_mm: 0.027 },
        log_color_space: 'ARRI Log C4',
        prompt_keywords: ['high dynamic range', 'natural skin tones', 'cinematic grade', 'clean shadows'],
        aspect_ratios: ['4:3', '16:9', '2.39:1'],
    },
    // ... continue for RED, Sony, Canon ...
];

export const LENS_DATABASE: LensSpec[] = [
    {
        id: 'zeiss_master_50',
        brand: 'Zeiss',
        model: 'Master Prime',
        focal_length_mm: 50,
        min_t_stop: 1.3,
        is_anamorphic: false,
        prompt_keywords: ['clinical sharpness', 'zero aberration', 'high contrast', 'sharp focus'],
    },
    // ... continue for Cooke, Petzval, etc.
];
```

## 2. Core Logic Integration (`backend/src/services/story/ScriptService.ts`)

Modify the LLM call to consume the new data structure.

```typescript
// backend/src/services/story/ScriptService.ts (Updated prompt builder)

import { CAMERA_DATABASE, LENS_DATABASE } from '../../data/CameraDatabase'; // NEW IMPORT

async function buildCinematicModifier(cameraId: string, lensId: string): string {
    const camera = CAMERA_DATABASE.find(c => c.id === cameraId);
    const lens = LENS_DATABASE.find(l => l.id === lensId);

    if (!camera || !lens) return '';

    const keywords = [
        ...camera.prompt_keywords,
        ...lens.prompt_keywords,
        `shot on ${camera.brand} ${camera.model}`,
        `${lens.model} ${lens.focal_length_mm}mm T${lens.min_t_stop.toFixed(1)} lens`,
        `${camera.log_color_space} color science`,
        lens.is_anamorphic ? 'blue streak anamorphic flare' : 'spherical lens distortion',
    ];

    return keywords.join(', ');
}

async function generateScreenplay(...) {
    // ... Assume user selected 'arri_alexa_35' and 'zeiss_master_50'
    const cinematicModifier = buildCinematicModifier('arri_alexa_35', 'zeiss_master_50');

    const finalPrompt = `
        You are a master screenwriter. 
        Enforce the following cinematic criteria in the output:
        [CRITERIA] ${cinematicModifier}
        
        [USER TASK]
        ...
    `;
    // ... call Claude ...
}
```

---

### File 2: `Camera_Data_Tasks.json`

```json
{
  "phase": "Phase 4A Extension: Cinematic Data Plumbing",
  "status": "Ready for Dev",
  "tasks": [
    {
      "id": "DATA-01",
      "title": "Create CameraDatabase.ts",
      "desc": "Implement CameraSpec and LensSpec interfaces and populate with example data (Arri, RED, Zeiss, Cooke).",
      "priority": "Critical"
    },
    {
      "id": "DATA-02",
      "title": "Prisma: Add Camera/Lens Linkage",
      "desc": "Add cameraId and lensId foreign keys to the SceneChain model to track the chosen gear (similar to userId).",
      "priority": "High"
    },
    {
      "id": "LOGIC-01",
      "title": "Update ScriptService Prompt Builder",
      "desc": "Modify ScriptService.ts to use the new buildCinematicModifier function and inject the result into the Claude prompt.",
      "priority": "High"
    },
    {
      "id": "UI-01",
      "title": "Frontend Camera Selector Logic",
      "desc": "Modify the Optics Engine UI to call /api/cameras/list, and use the returned data to populate its dropdowns.",
      "priority": "Medium"
    }
  ]
}
```