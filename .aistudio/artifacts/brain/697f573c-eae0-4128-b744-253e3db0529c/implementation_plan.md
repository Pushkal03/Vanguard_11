# Vanguard 11 — Universal PDF Opener Studio & Live Camera Presence Upgrade

This upgrade transforms the built-in Homework Reader into a full **Universal PDF & Multi-File Opener Studio** capable of rendering real PDF documents, images, code, and text worksheets with interactive annotations, while upgrading the **5-Second Camera Sentinel** with real-time live webcam face/silhouette tracking, an adjustable sensitivity slider, and one-click desk baseline calibration.

## User Review & Critical Decisions

> [!IMPORTANT]
> All three preferences from our clarification check have been locked into this plan:

- **Confirmed Decision 1 (Visual PDF & All-File Opener)**: Every uploaded file (PDFs, images, Markdown/text, C++/Python files) opens inside a unified visual PDF & document studio featuring zoom controls (`50%` to `200%`), page navigation, and native PDF rendering alongside multi-page interactive worksheet rendering.
- **Confirmed Decision 2 (Live Webcam with Real-Time Face Tracking & Sensitivity Slider)**: The camera sentinel streams your live webcam at full clarity with a real-time face and upper-body tracking overlay, live signal meters (Luminance, Face/Silhouette Lock, Motion Delta), a **Sensitivity Threshold Slider** (`Strict` to `Lenient` for dim lighting), and a **Calibrate My Desk** button so it adapts to your room lighting and never false-alarms when you are sitting still solving problems.
- **Confirmed Decision 3 (Integrated Study Toolkit inside the PDF Opener)**: Includes all four requested study utilities directly inside the PDF Opener:
  1. **Page Bookmarking & Quick-Jump Bar**
  2. **Highlight & Freehand Drawing Canvas Layer** directly over PDF/worksheet pages
  3. **Quick-Toggle 11th Standard Formula Sheet Drawer**
  4. **Side-by-Side Solution Scratchpad & Notes**

---

## 1. Overview & Core Concept

- **What It Does**: Eliminates every reason to leave Lockdown Mode by letting you open, zoom, paginate, highlight, draw on, and bookmark any uploaded PDF or study file directly inside Vanguard 11, while continuously verifying your presence every 5 seconds using calibrated live webcam tracking.
- **Target Audience / Persona**: An ambitious 11th-standard student committing two years of focused preparation who needs zero external browser distractions, seamless access to all PDF coaching sheets and homework files, and reliable camera accountability.
- **Key Value**: Full-fidelity PDF and file viewing without leaving the full-device Lockdown Kiosk, paired with transparent, user-calibratable camera detection that accurately distinguishes between focused motionless reading and actually leaving your desk.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Accept & Open Any File via PDF Opener**: Click or drag any `.pdf`, image (`.png`, `.jpg`), code file, or worksheet into the Always-Open Homework File Acceptor (available on the main dashboard, inside Focus Lockdown, and in the Homework Vault). Clicking **Open in PDF Opener** launches the full-screen split-pane PDF Studio.
  2. **Annotate, Bookmark & Solve in Split-Screen**: Inside the PDF Opener, use the top toolbar to zoom in/out, jump between pages, toggle the **Highlighter / Pen Tool** to mark key diagrams or equations on the page canvas, bookmark tough pages for revision, pop open the **11th Std Formula Sheet overlay**, and type step-by-step derivations in the right-hand **Solution Scratchpad**.
  3. **Calibrate & Monitor Live Webcam Every 5 Seconds**: In Focus Lockdown, view your live mirrored webcam feed with an active green/rose tracking reticle showing your live presence confidence score vs. your chosen sensitivity threshold. Adjust the **Detection Sensitivity Slider** or click **Calibrate Seated Baseline** to lock in your current room lighting and posture.

- **Visual Identity & Theme**:
  - *Aesthetic Direction*: High-density, distraction-free dark studio console (`#020617` canvas, `#0F172A` structural panels, crisp `1px` `#1E293B` borders) following strict SaaS & Dashboard discipline.
  - *Color Palette & Mood*: Deep slate backgrounds (`bg-slate-950`, `bg-slate-900`) paired with high-intent semantic accents—Amber (`#F59E0B`) for primary lockdown actions and bookmarks, Emerald (`#10B981`) for verified camera lock, Sky (`#0EA5E9`) for PDF annotation/coding tools, and Rose (`#F43F5E`) for absence or violation alerts.
  - *Typography & Hierarchy*: `Outfit` for section headers and studio titles, `Plus Jakarta Sans` for clean UI controls and notes, and `JetBrains Mono` (`tabular-nums`) for all page counters, zoom percentages, 5-second countdown timers, and camera confidence telemetry.
  - *Component Styling & Layout*: Single-elevation bordered panels with zero static pills. The PDF Opener uses a responsive 12-column split: 8 columns for the interactive PDF/Document Canvas + Annotation Layer, and 4 columns for the collapsible Solution Scratchpad & Formula Reference Drawer.

- **Interactive Feedback & Motion**:
  - Smooth `<150ms` toolbar state transitions for pen/highlighter color selection, bookmark toggles, and zoom scaling.
  - Live 60fps canvas overlay for freehand highlighting and drawing over document pages, plus real-time visual signal bars on the camera feed updating every 5 seconds.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Hybrid Native Object + Interactive Multi-Page Canvas PDF Opener**
  - *Chosen Approach*: Store uploaded PDFs and images as local Blob/Data URLs so real `.pdf` files render natively inside a sandboxed PDF viewport with a synchronized transparent HTML5 `<canvas>` annotation overlay on top for highlighting and drawing, while also rendering multi-page structured problem sheets cleanly at any zoom level (`50%`–`200%`).
  - *Why*: Browsers' native `<embed>`/`<iframe>` PDF viewers capture mouse events and prevent custom drawing or highlighting unless paired with an overlay layer, and some headless/kiosk environments block external PDF plugins. Combining local Blob PDF rendering with an interactive multi-page canvas guarantees every file opens reliably with full highlight, pen, bookmark, and zoom support.
  - *Alternatives Considered*: Relying solely on raw browser `<iframe src={blobUrl}>` without an annotation layer (rejected because it prevents on-page highlighting and drawing tools).

- **Decision 2: Multi-Signal Webcam Presence Tracking with User Sensitivity & Baseline Calibration**
  - *Chosen Approach*: Upgrade the camera analyzer to combine (a) native browser `FaceDetector` (when supported by Chromium), (b) center-ROI silhouette & skin/contrast occupancy against a calibrated seated baseline, and (c) configurable **Sensitivity Slider** (`25%` to `85%` required confidence) + **Gemini Vision 5-second check**.
  - *Why*: Previously, fixed brightness and skin-tone thresholds could fail in dim room lighting, warm/cool desk lamps, or when a student sits very still while reading a PDF. Allowing 1-click **Calibrate Seated Baseline** and a **Sensitivity Slider** ensures the 5-second auto-monitor works accurately across any webcam and lighting setup.
  - *Alternatives Considered*: Pure frame-to-frame motion detection (rejected because a focused student reading a tough Physics problem often sits still for 10+ seconds and shouldn't be penalized as absent).

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### Architecture & Component Diagram

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                   Vanguard 11 — Full-Device Lockdown Workspace                │
└───────────────────────────────────────┬───────────────────────────────────────┘
                                        │
        ┌───────────────────────────────┴───────────────────────────────┐
        ▼                                                               ▼
┌───────────────────────────────────────┐       ┌───────────────────────────────────────┐
│   Universal PDF & File Opener Studio  │       │  5s Live Camera Presence & Face Lock  │
├───────────────────────────────────────┤       ├───────────────────────────────────────┤
│ • Multi-Format Loader (PDF Blob URL,  │       │ • Live Mirrored <video> + HUD Canvas  │
│   Images, Markdown, Code, Worksheets) │       │ • Center-ROI Face/Silhouette Detector │
│ • Zoom (50%-200%) & Page Jumper       │       │ • Seated Baseline Calibrator          │
│ • Bookmark Manager (Filter/Jump)      │       │ • Sensitivity Threshold Slider        │
│ • Interactive <canvas> Annotation     │       │ • 5s Auto-Monitor Loop & Server       │
│   Overlay (Highlighter, Pen, Eraser)  │       │   Vision Sync (/api/camera/...)       │
│ • Split-Pane Solution Scratchpad &    │       │ • Automatic Absence Violation Logger  │
│   11th Std Formula Sheet Drawer       │       │   (-15 XP on unverified 5s scan)      │
└───────────────────────────────────────┘       └───────────────────────────────────────┘
```

### Data Model & State

- **Enhanced `HomeworkFile` Entity**:
  - `id`, `name`, `subject`, `uploadedAt`, `sizeLabel`, `mimeType` (`application/pdf`, `image/*`, `text/*`)
  - `fileDataUrl?: string` (Object/Data URL for real uploaded PDFs and images)
  - `pages: string[]` (Paginated content segments so multi-page documents support page-by-page navigation and per-page annotations)
  - `bookmarks: number[]` (Array of 1-indexed bookmarked page numbers)
  - `annotationsByPage: Record<number, AnnotationStroke[]>` (Persisted highlighter and pen strokes per page)
  - `notes: string` (Side-by-side solution scratchpad text)
- **Camera Calibration & Telemetry State**:
  - `sensitivityThreshold: number` (Default `55`, adjustable `25`–`85`)
  - `calibratedBaseline: { brightness: number; contrast: number; skinRatio: number } | null`
  - `liveMetrics: { faceDetected: boolean; silhouetteScore: number; motionScore: number; brightness: number; overallConfidence: number }`

### Interactive Component & State Mapping

- **PDF Opener Studio Controls**:
  - **File Selector & Upload Button**: Accepts any file directly inside the PDF Opener or Vault, generates a persistent local URL (`URL.createObjectURL` / Data URL), splits content into pages, and opens it immediately.
  - **Zoom & Page Bar**: `-` / `+` zoom buttons (`50%` to `200%`), `Prev Page` / `Next Page`, direct page number selector, and `Bookmark Page` toggle with a quick-jump dropdown for bookmarked pages.
  - **Highlight & Drawing Layer**: Mode switcher (`Read/Scroll`, `Yellow Highlighter`, `Cyan Pen`, `Red Pen`, `Clear Page`) rendering smooth vector strokes on an overlay `<canvas>` keyed by `file.id` and `currentPage`.
  - **Right-Side Workspace Tabs**: Switch between **Solution Scratchpad** (auto-saved notes per PDF) and **11th Std Formula Sheet Overlay** (Physics, Chemistry, Mathematics quick formulas) without closing the PDF.
- **Camera Presence & Calibration Controls**:
  - **Device Selector & Live Mirror Feed**: Lists available video input devices (`navigator.mediaDevices.enumerateDevices`), renders live video with a real-time `<canvas>` HUD reticle, and shows live confidence vs. threshold.
  - **Sensitivity Slider & Calibrate Button**: Dragging the sensitivity slider updates the required presence score in real time; clicking **Calibrate Seated Baseline** samples the current webcam frame as the student's "Present at Desk" reference.
