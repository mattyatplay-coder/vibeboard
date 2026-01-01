This is the complete list of files your **UX/UI team** needs to execute the final sprint. These files contain the logic for the **Studio Spine** and the **Producer Agent** and control the appearance of the entire application.

I have separated them into **Core Structure** (Navigation and Layout) and **Core Features** (The new components).

### 📄 VibeBoard Final UX Handoff List

| Category | File Path | Component / Focus | Purpose |
| :--- | :--- | :--- | :--- |
| **I. Core Structure (The Spine)** | | | |
| **Layout** | `frontend/src/components/layout/Sidebar.tsx` | **Studio Spine** | **CRITICAL:** Implements the sequential grouping logic (Development, Production, Post) and the new navigation structure. |
| **Layout** | `frontend/src/components/layout/StudioLayout.tsx` | Global Shell | Ensures a stable canvas for the new fixed widgets and backgrounds. |
| **Routing** | `frontend/src/app/page.tsx` | Project Hub Redirect | Logic to enforce redirect to `/script-lab` upon project selection. |
| **Inputs** | `frontend/src/components/storyboard/StoryConceptInput.tsx` | The Story Hub | The page where the "content" switch happens (YouTube vs. Cinema). |
| **II. Core Behavior (The Producer Agent)** | | | |
| **New Hook** | `frontend/src/hooks/useProducerAgent.ts` | **NEW LOGIC:** Contains all the business logic for calculating cost and triggering alerts (The Doctrine). | **CRITICAL:** Drives the warnings. |
| **New Widget** | `frontend/src/components/ui/ProducerWidget.tsx` | **NEW COMPONENT:** The final UI for the cost badge and the alert cards (The Warnings). | **CRITICAL:** Displays the alerts. |
| **III. Core Feature Overhauls** | | | |
| **Optics** | `frontend/src/components/optics/FocusScrubber.tsx` | **Focus Scrubbing:** The component that replaces the focus slider with a video player. | **CRITICAL:** Implements the real-time physics. |
| **Shot Studio**| `frontend/src/components/shot-studio/ShotStudioControls.tsx`| **ReCo/Spatia UI:** The controls for managing bounding boxes and locking locations. | **CRITICAL:** Hides the complexity. |
| **Asset Bin** | `frontend/src/components/elements/ElementCard.tsx` | Asset Card Actions | Needs the new action buttons (`Deconstruct 3D`, `View Materials`) added to the toolbar. |
| **Asset Bin** | `frontend/src/components/assets/AssetMaterialModal.tsx` | Material Viewer | The new modal for displaying the PBR maps. |
| **Styling** | `tailwind.config.js` | Global Design Tokens | For setting the correct **Zinc** colors, **Monospace** font families, and `backdrop-blur` utility classes. |

### 🔑 Final Directive to the Team

*   **Focus:** The highest leverage item is the **Sidebar** and the **Producer Widget**. These two components define the entire user workflow.
*   **Aesthetic:** Reference the "Linear meets DaVinci Resolve" aesthetic defined in the Product Bible.