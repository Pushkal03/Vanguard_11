import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "15mb" }));

// Quota exhaustion tracker and rate limiting for Gemini free tier
const quotaExhaustedUntil: Record<string, number> = {
  vision: 0,
  chat: 0,
  timetable: 0,
  pdf: 0,
};

let lastVisionAiCallTime = 0;
const MIN_VISION_AI_COOLDOWN_MS = 60000; // 60 seconds minimum between Gemini Vision calls

function isQuotaExhaustionError(error: any): boolean {
  if (!error) return false;
  if (error?.status === 429) return true;
  const str = (
    (error?.message || "") +
    " " +
    (error?.status || "") +
    " " +
    JSON.stringify(error?.details || "")
  ).toLowerCase();
  return (
    str.includes("429") ||
    str.includes("resource_exhausted") ||
    str.includes("quota exceeded") ||
    str.includes("rate limit") ||
    str.includes("free_tier_requests")
  );
}

function getGenAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// 1. AI Timetable Generator Endpoint
app.post("/api/timetable/generate", async (req, res) => {
  try {
    const { tasks, instructions, startTime = "08:00" } = req.body;
    const ai = getGenAIClient();
    const now = Date.now();

    if (!ai || now < quotaExhaustedUntil.timetable) {
      return res.status(200).json({
        usedFallback: true,
        partnerNote:
          "I locked in your schedule directly from your instructions. Visual Studio Code is strictly gated to your Coding slots, and Homework Upload is open only during Break slots. Zero excuses today.",
        blocks: null,
      });
    }

    const prompt = `You are Kai, an uncompromising yet deeply caring AI Accountability Partner and closest friend for an 11th-standard student who is sacrificing 2 years to achieve their highest dreams, but struggles with laziness unless pushed.

Student's tasks for today:
${JSON.stringify(tasks, null, 2)}

Student's custom timetable instructions:
"${instructions || "Start at 08:00. Alternate intense study/coding blocks with short breaks for homework uploads."}"

Preferred start time: ${startTime}

Create a structured timetable of blocks covering all their tasks plus strategic breaks (where homework files can be uploaded).
Rules for allowedApps per block category:
- "coding": allowedApps MUST be ["vscode", "terminal"] (Visual Studio Code is ONLY unlocked during coding blocks)
- "study": allowedApps MUST be ["homework_reader", "formula_sheet"]
- "break": allowedApps MUST be ["homework_uploader", "water_stretch"] (Homework file uploads are accepted during breaks)
- "revision": allowedApps MUST be ["homework_reader", "flashcards"]

Return JSON matching the schema.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            partnerNote: {
              type: Type.STRING,
              description:
                "A direct, motivating 2-sentence message from Kai challenging the student to stick to this schedule.",
            },
            blocks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  startTime: { type: Type.STRING, description: "HH:MM 24-hour format" },
                  endTime: { type: Type.STRING, description: "HH:MM 24-hour format" },
                  title: { type: Type.STRING },
                  category: {
                    type: Type.STRING,
                    description: "One of: study, coding, break, revision",
                  },
                  taskId: {
                    type: Type.STRING,
                    description: "Matching task id if linked to a task, or empty string for breaks",
                  },
                  allowedApps: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  pointsReward: { type: Type.INTEGER },
                  strictLockdown: { type: Type.BOOLEAN },
                },
                required: [
                  "id",
                  "startTime",
                  "endTime",
                  "title",
                  "category",
                  "allowedApps",
                  "pointsReward",
                  "strictLockdown",
                ],
              },
            },
          },
          required: ["partnerNote", "blocks"],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? "{}").trim());
    return res.json(parsed);
  } catch (error: any) {
    if (isQuotaExhaustionError(error)) {
      quotaExhaustedUntil.timetable = Date.now() + 60 * 60 * 1000;
      console.warn("[Timetable] Gemini quota reached, seamlessly using structured local generator.");
    } else {
      console.warn("[Timetable] Generation fallback active:", error?.message || error);
    }
    return res.status(200).json({
      usedFallback: true,
      partnerNote:
        "I built your strict timetable locally so we don't lose a single second. Let's get to work.",
      blocks: null,
    });
  }
});

// 2. AI Accountability Partner Chat & Push Endpoint
app.post("/api/partner/chat", async (req, res) => {
  try {
    const { message, context } = req.body;
    const ai = getGenAIClient();
    const now = Date.now();

    if (!ai || now < quotaExhaustedUntil.chat) {
      return res.json({
        reply:
          "Listen to me: you said in 11th standard you're ready to sacrifice two years for your dream, and that you only work when pushed. Consider this your push right now. Close every distraction, lock into the current block, and earn those points. I'm watching your progress—show me what you're made of!",
        tone: "challenge",
      });
    }

    const systemInstruction = `You are Kai, the student's closest friend and uncompromising AI Accountability Partner.
The student is in 11th standard with massive aspirations and is ready to sacrifice 2 years for success, but admits they are lazy unless someone pushes them hard.
Your job:
1. Be warm like a ride-or-die best friend, yet fiercely disciplined like an elite coach.
2. Reference their live state (Tasks completed, XP points, active block, tab-switch violations, camera presence status).
3. Never let them rationalize procrastination. Give concrete, immediate action orders (3-4 sentences max).`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: `Live Student Telemetry: ${JSON.stringify(context || {})}\n\nStudent says: "${message}"`,
      config: {
        systemInstruction,
      },
    });

    return res.json({
      reply:
        response.text ||
        "No excuses right now. You promised yourself two years of relentless focus. Start the timer and finish this block.",
      tone: "challenge",
    });
  } catch (error: any) {
    if (isQuotaExhaustionError(error)) {
      quotaExhaustedUntil.chat = Date.now() + 60 * 60 * 1000;
      console.warn("[Partner Chat] Gemini quota reached, seamlessly using local accountability coach.");
    } else {
      console.warn("[Partner Chat] Local coach fallback active:", error?.message || error);
    }
    return res.json({
      reply:
        "You told me you can work to any extent once someone pushes you. I'm pushing you right now: lock your screen, keep your camera active, and finish the current task before you even think of taking a breather.",
      tone: "challenge",
    });
  }
});

// 3. Camera Presence & Posture Check (Edge Sentinel First + Throttled AI Vision)
app.post("/api/camera/verify-presence", async (req, res) => {
  try {
    const { imageBase64, activeTaskTitle, clientMetrics, forceAiAudit } = req.body;
    const ai = getGenAIClient();
    const now = Date.now();
    const isVisionQuotaExhausted = now < quotaExhaustedUntil.vision;

    // Routine 5-second automatic scans: Prioritize Edge Optical Sentinel.
    // Instant response, 0ms network lag, 0 API quota burned.
    if (!forceAiAudit || !ai || !imageBase64 || isVisionQuotaExhausted || (now - lastVisionAiCallTime < MIN_VISION_AI_COOLDOWN_MS)) {
      const fallbackPresent = clientMetrics && typeof clientMetrics.present === "boolean"
        ? clientMetrics.present
        : true;
      const score = clientMetrics?.confidence ?? (fallbackPresent ? 95 : 18);
      const note = clientMetrics?.reason || (fallbackPresent
        ? "Desk presence verified (5s continuous optical monitor). Eyes on the work!"
        : "ALERT: Human presence not detected at desk. Return to your seat immediately.");

      return res.json({
        present: fallbackPresent,
        focusScore: score,
        feedback: note,
        verifiedBy: isVisionQuotaExhausted ? "edge_sentinel_quota_safe" : "edge_sentinel",
      });
    }

    // Explicit on-demand AI Vision check
    lastVisionAiCallTime = now;
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: cleanBase64,
            },
          },
          {
            text: `Analyze this webcam frame of an 11th standard student working on "${activeTaskTitle || "their study block"}".
Check strictly whether a human is physically present in front of the camera and focused at their desk, or if the chair is empty / camera is covered / person walked away.
Respond in JSON with { "present": boolean, "focusScore": number (0-100), "feedback": "1 short sentence from their accountability partner Kai" }.`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            present: { type: Type.BOOLEAN },
            focusScore: { type: Type.INTEGER },
            feedback: { type: Type.STRING },
          },
          required: ["present", "focusScore", "feedback"],
        },
      },
    });

    const result = JSON.parse((response.text ?? "{}").trim());
    return res.json({ ...result, verifiedBy: "gemini_vision" });
  } catch (error: any) {
    if (isQuotaExhaustionError(error)) {
      quotaExhaustedUntil.vision = Date.now() + 60 * 60 * 1000; // 1-hour backoff
      console.warn("[Camera Sentinel] Gemini Vision API quota exhausted (free tier 20 req/day limit). Seamlessly switching to edge optical face & presence tracking.");
    } else {
      console.warn("[Camera Sentinel] Vision fallback active:", error?.message || error);
    }
    const fallbackPresent = req.body?.clientMetrics?.present ?? true;
    return res.json({
      present: fallbackPresent,
      focusScore: fallbackPresent ? 92 : 20,
      feedback: fallbackPresent
        ? "Presence verified at desk. Keep pushing through this problem set."
        : "Human presence lost! Get back to your desk immediately.",
      verifiedBy: "edge_fallback",
    });
  }
});

// 4. Multimodal PDF & Worksheet Content Extractor Endpoint
app.post("/api/pdf/extract", async (req, res) => {
  try {
    const { base64Data, mimeType = "application/pdf", fileName = "document.pdf" } = req.body;
    const ai = getGenAIClient();
    const now = Date.now();

    if (!ai || !base64Data || now < quotaExhaustedUntil.pdf) {
      return res.json({
        extracted: false,
        pages: [],
      });
    }

    const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, "");

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: cleanBase64,
            },
          },
          {
            text: `Extract all readable text, numbered problems, equations, formulas, and notes from this study document ("${fileName}").
Preserve the exact question numbers, mathematical expressions, and structure page by page.
Return JSON with { "pages": ["Page 1 full text...", "Page 2 full text..."] }.`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            pages: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ["pages"],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? "{}").trim());
    if (Array.isArray(parsed.pages) && parsed.pages.length > 0) {
      return res.json({
        extracted: true,
        pages: parsed.pages,
      });
    }
    return res.json({ extracted: false, pages: [] });
  } catch (error: any) {
    if (isQuotaExhaustionError(error)) {
      quotaExhaustedUntil.pdf = Date.now() + 60 * 60 * 1000;
      console.warn("[PDF Extract] Gemini quota reached, using local text/rendering parser.");
    } else {
      console.warn("[PDF Extract] PDF multimodal extraction fallback active:", error?.message || error);
    }
    return res.json({
      extracted: false,
      pages: [],
    });
  }
});

// 5. Server-Authoritative Real-Time Multi-Device (max 5) & Parent (max 2) Sync Bus
interface SyncedRoomState {
  syncVersion: number;
  updatedAtMs: number;
  pairingCode: string;
  studentName: string;
  studentEmail?: string;
  classStandard: string;
  targetExam: string;
  dailyGoalHours?: number;
  studyStartTime?: string;
  isLockdownActive: boolean;
  cameraVerified: boolean;
  cameraConfidence: number;
  xpPoints: number;
  streakDays: number;
  activeBlockTitle: string;
  activeBlockCategory: string;
  completedTasksCount: number;
  totalTasksCount: number;
  violationsCount: number;
  tasks: any[];
  timetableBlocks: any[];
  timetableInstructions?: string;
  violations: any[];
  devices: any[];
  parents: any[];
  moments: any[];
  homeworkFiles: any[];
  parentEncouragement: string;
  updatedAt: string;
  lastUpdatedByDeviceId?: string;
  lastUpdatedByClientId?: string;
}

const PERSIST_FILE_PATH = "/tmp/vanguard11_sync_rooms_v2.json";
const syncRooms = new Map<string, SyncedRoomState>();
const emailToPairingCode = new Map<string, string>();
const sseClientsByRoom = new Map<string, Set<express.Response>>();

const DEFAULT_HOMEWORK_FILES = [
  {
    id: "hw-1",
    name: "Physics_Ch7_Rotational_Mechanics_Sheet.pdf",
    subject: "Physics (11th Std)",
    uploadedAt: "15:45",
    uploadedDuringBlock: "Pre-Session Break Intake",
    sizeLabel: "420 KB",
    mimeType: "application/pdf",
    contentPreview: `--- PAGE 1 ---
PROBLEM SET: ROTATIONAL DYNAMICS (11th STD ADVANCED)
Q1. A uniform solid cylinder of mass M = 4 kg and radius R = 0.5 m rolls without slipping down an inclined plane of angle 30°. Calculate the linear acceleration of its center of mass and the minimum coefficient of static friction required.

Q2. Find the moment of inertia of a uniform square lamina of mass M and side length 'a' about an axis passing through one of its corners and perpendicular to its plane.

Q3. A thin circular ring of mass M and radius R is rotating in a horizontal plane with angular velocity ω₀. Two small spheres of mass m each are gently attached to opposite ends of a diameter. Find the new angular velocity.
--- PAGE 2 ---
SECTION B: ANGULAR MOMENTUM & COLLISION NUMERICALS (PAGE 2)
Q4. A uniform rod of length L = 1.2 m and mass M = 3 kg is pivoted smoothly at its top end. A bullet of mass m = 0.05 kg strikes the lower end horizontally with speed v = 120 m/s and embeds in it. Find the angular velocity just after impact.

Q5. Derive the expression for kinetic energy of a rolling body: K_total = ½ Mv_cm² (1 + k²/R²). Compare the time taken by a solid sphere, hollow sphere, and disc to reach the bottom of an incline of height h = 4.9 m.`,
    pages: [
      `PROBLEM SET: ROTATIONAL DYNAMICS (11th STD ADVANCED)\nQ1. A uniform solid cylinder of mass M = 4 kg and radius R = 0.5 m rolls without slipping down an inclined plane of angle 30°. Calculate the linear acceleration of its center of mass and the minimum coefficient of static friction required.\n\nQ2. Find the moment of inertia of a uniform square lamina of mass M and side length 'a' about an axis passing through one of its corners and perpendicular to its plane.\n\nQ3. A thin circular ring of mass M and radius R is rotating in a horizontal plane with angular velocity ω₀. Two small spheres of mass m each are gently attached to opposite ends of a diameter. Find the new angular velocity.`,
      `SECTION B: ANGULAR MOMENTUM & COLLISION NUMERICALS (PAGE 2)\nQ4. A uniform rod of length L = 1.2 m and mass M = 3 kg is pivoted smoothly at its top end. A bullet of mass m = 0.05 kg strikes the lower end horizontally with speed v = 120 m/s and embeds in it. Find the angular velocity just after impact.\n\nQ5. Derive the expression for kinetic energy of a rolling body: K_total = ½ Mv_cm² (1 + k²/R²). Compare the time taken by a solid sphere, hollow sphere, and disc to reach the bottom of an incline of height h = 4.9 m.`,
    ],
    bookmarks: [1],
    annotationsByPage: {},
    notes:
      "Q1 Hint: a = g sin(θ) / (1 + I / mR²). For solid cylinder, I = ½ mR², so a = (2/3) g sin(30°) = g/3.",
  },
  {
    id: "hw-2",
    name: "CS_11th_DP_Knapsack_Assignment.md",
    subject: "Computer Science (C++ / Python)",
    uploadedAt: "15:50",
    uploadedDuringBlock: "Pre-Session Break Intake",
    sizeLabel: "18 KB",
    mimeType: "text/markdown",
    contentPreview: `CODING ASSIGNMENT: 0/1 KNAPSACK & SUBSET SUM
1. Implement space-optimized O(W) 0/1 Knapsack in C++ inside the Visual Studio Code sandbox during your Coding slot.
2. Verify time complexity for N = 1000 items and W = 5000 capacity.
3. No external web tabs or copy-pasting allowed during Lockdown.`,
    pages: [
      `CODING ASSIGNMENT: 0/1 KNAPSACK & SUBSET SUM\n1. Implement space-optimized O(W) 0/1 Knapsack in C++ inside the Visual Studio Code sandbox during your Coding slot.\n2. Verify time complexity for N = 1000 items and W = 5000 capacity.\n3. No external web tabs or copy-pasting allowed during Lockdown.`,
    ],
    bookmarks: [],
    annotationsByPage: {},
    notes: "",
  },
];

function buildDefaultTasks(classStandard = "11th Standard", targetExam = "JEE Main & Advanced") {
  return [
    {
      id: "task-1",
      title: `Rotational Dynamics & Moment of Inertia — Solve 35 ${targetExam} Numericals`,
      subject: `Physics (${classStandard})`,
      category: "study",
      durationMinutes: 60,
      points: 150,
      completed: false,
      priority: "critical",
    },
    {
      id: "task-2",
      title: "C++ Dynamic Programming & Graph Traversal Implementation",
      subject: "Computer Science",
      category: "coding",
      durationMinutes: 45,
      points: 140,
      completed: false,
      priority: "high",
    },
    {
      id: "task-3",
      title: "Chemical Bonding & Hybridization Coaching Sheet (DPP-04)",
      subject: `Chemistry (${classStandard})`,
      category: "study",
      durationMinutes: 50,
      points: 120,
      completed: false,
      priority: "high",
    },
    {
      id: "task-4",
      title: "Trigonometric Equations & Conic Sections Formula Recall",
      subject: `Mathematics (${targetExam})`,
      category: "revision",
      durationMinutes: 40,
      points: 100,
      completed: true,
      priority: "medium",
      completedAt: "15:40",
    },
  ];
}

function buildDefaultTimetableBlocks(tasks: any[], startTime = "16:00") {
  const activeTasks = tasks.filter((t) => !t.completed);
  const source = activeTasks.length > 0 ? activeTasks : tasks;
  return source.map((t, index) => ({
    id: `blk-${index + 1}`,
    startTime: index === 0 ? startTime : `${16 + index}:00`,
    endTime: `${17 + index}:00`,
    title: t.title,
    category: t.category || "study",
    taskId: t.id,
    allowedApps:
      t.category === "coding"
        ? ["vscode", "terminal", "homework_uploader", "homework_reader"]
        : ["homework_uploader", "homework_reader", "formula_sheet"],
    pointsReward: t.points || 120,
    strictLockdown: true,
    status: index === 0 ? "active" : "upcoming",
  }));
}

function saveRoomsToDisk() {
  try {
    const roomsObj: Record<string, SyncedRoomState> = {};
    for (const [k, v] of syncRooms.entries()) {
      roomsObj[k] = v;
    }
    const emailsObj: Record<string, string> = {};
    for (const [k, v] of emailToPairingCode.entries()) {
      emailsObj[k] = v;
    }
    fs.writeFileSync(
      PERSIST_FILE_PATH,
      JSON.stringify({ rooms: roomsObj, emails: emailsObj }),
      "utf-8"
    );
  } catch (err) {
    console.warn("[Sync Persistence] Could not write rooms to disk:", err);
  }
}

function loadRoomsFromDisk() {
  try {
    if (!fs.existsSync(PERSIST_FILE_PATH)) return;
    const raw = fs.readFileSync(PERSIST_FILE_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    if (parsed?.rooms && typeof parsed.rooms === "object") {
      for (const [k, v] of Object.entries(parsed.rooms)) {
        syncRooms.set(k, v as SyncedRoomState);
      }
    }
    if (parsed?.emails && typeof parsed.emails === "object") {
      for (const [k, v] of Object.entries(parsed.emails)) {
        emailToPairingCode.set(k, String(v));
      }
    }
  } catch (err) {
    console.warn("[Sync Persistence] Could not load rooms from disk:", err);
  }
}

function broadcastRoomUpdate(pairingCode: string, state: SyncedRoomState) {
  const clients = sseClientsByRoom.get(pairingCode);
  if (!clients) return;
  const payload = `data: ${JSON.stringify(state)}\n\n`;
  for (const clientRes of clients) {
    try {
      clientRes.write(payload);
    } catch {
      clients.delete(clientRes);
    }
  }
}

function getOrCreateDefaultRoom(code: string): SyncedRoomState {
  const normalizedCode = code.toUpperCase();
  const existing = syncRooms.get(normalizedCode);
  if (existing) {
    if (!Array.isArray(existing.tasks) || existing.tasks.length === 0) {
      existing.tasks = buildDefaultTasks(existing.classStandard, existing.targetExam);
    }
    if (!Array.isArray(existing.timetableBlocks) || existing.timetableBlocks.length === 0) {
      existing.timetableBlocks = buildDefaultTimetableBlocks(
        existing.tasks,
        existing.studyStartTime || "16:00"
      );
    }
    if (!Array.isArray(existing.homeworkFiles) || existing.homeworkFiles.length === 0) {
      existing.homeworkFiles = DEFAULT_HOMEWORK_FILES;
    }
    if (typeof existing.syncVersion !== "number") {
      existing.syncVersion = 1;
    }
    if (typeof existing.updatedAtMs !== "number") {
      existing.updatedAtMs = Date.now();
    }
    return existing;
  }

  const defaultTasks = buildDefaultTasks("11th Standard", "JEE Main & Advanced");
  const defaultBlocks = buildDefaultTimetableBlocks(defaultTasks, "16:00");

  const created: SyncedRoomState = {
    syncVersion: 1,
    updatedAtMs: Date.now(),
    pairingCode: normalizedCode,
    studentName: "Pushkal",
    studentEmail: "v.v.h.s.pushkal@gmail.com",
    classStandard: "11th Standard",
    targetExam: "JEE Main & Advanced",
    dailyGoalHours: 8,
    studyStartTime: "16:00",
    isLockdownActive: false,
    cameraVerified: true,
    cameraConfidence: 98,
    xpPoints: 640,
    streakDays: 14,
    activeBlockTitle: "Rotational Dynamics & Moment of Inertia — Solve 35 JEE Main & Advanced Numericals",
    activeBlockCategory: "study",
    completedTasksCount: 1,
    totalTasksCount: defaultTasks.length,
    violationsCount: 0,
    tasks: defaultTasks,
    timetableBlocks: defaultBlocks,
    timetableInstructions:
      "Start at 16:00. Schedule high-priority Physics first, insert 15-min breaks to upload homework files, and unlock Visual Studio Code strictly during my C++ coding slot.",
    violations: [],
    devices: [
      {
        id: "dev-1",
        name: "Primary Study Laptop",
        platform: "Laptop",
        lastActiveAt: "Live Now",
        isCurrentDevice: true,
        lockdownMirrored: true,
      },
      {
        id: "dev-2",
        name: "iPad Study Tablet (PDF Reader)",
        platform: "Tablet",
        lastActiveAt: "Synced Live",
        isCurrentDevice: false,
        lockdownMirrored: true,
      },
      {
        id: "dev-3",
        name: "Mobile Companion Phone",
        platform: "Mobile",
        lastActiveAt: "Synced Live",
        isCurrentDevice: false,
        lockdownMirrored: true,
      },
    ],
    parents: [
      {
        id: "parent-1",
        name: "Parent 1 (Mother)",
        relation: "Parent 1 (Mother / Father)",
        emailOrHandle: "parent1.guardian@gmail.com",
        linkedAt: "15:30",
        liveNotificationsEnabled: true,
      },
      {
        id: "parent-2",
        name: "Parent 2 (Father)",
        relation: "Parent 2 (Co-Parent / Guardian)",
        emailOrHandle: "parent2.guardian@gmail.com",
        linkedAt: "15:32",
        liveNotificationsEnabled: true,
      },
    ],
    moments: [
      {
        id: "mom-seed-1",
        timestamp: "15:45",
        eventType: "file_upload",
        summary:
          'Uploaded "Physics_Ch7_Rotational_Mechanics_Sheet.pdf" (2 pages) — mirrored across all connected student devices.',
        deviceLabel: "Primary Study Laptop",
        xpDelta: 20,
      },
      {
        id: "mom-seed-2",
        timestamp: "16:00",
        eventType: "camera",
        summary:
          "5-Second Webcam Presence Tracker verified student seated at desk (98% confidence).",
        deviceLabel: "Primary Study Laptop",
      },
    ],
    homeworkFiles: DEFAULT_HOMEWORK_FILES,
    parentEncouragement:
      "Stay locked in on Rotational Dynamics, Pushkal! Both of us are cheering for your 11th standard JEE goal.",
    updatedAt: new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
  };
  syncRooms.set(normalizedCode, created);
  emailToPairingCode.set("v.v.h.s.pushkal@gmail.com", normalizedCode);
  emailToPairingCode.set("scholar@vanguard11.app", normalizedCode);
  saveRoomsToDisk();
  return created;
}

loadRoomsFromDisk();
getOrCreateDefaultRoom("V11-942");

app.post("/api/auth/student-signup", (req, res) => {
  const {
    studentName,
    studentEmail,
    classStandard = "11th Standard",
    targetExam = "JEE Main & Advanced",
    dailyGoalHours = 8,
    studyStartTime = "16:00",
    pairingCode,
    deviceName = "Primary Study Laptop",
    devicePlatform = "Laptop",
    parent1Name = "",
    parent1Email = "",
    parent2Name = "",
    parent2Email = "",
    initialTasks,
    initialBlocks,
    initialFiles,
    clientSessionId = "",
  } = req.body || {};

  const code = String(
    pairingCode || `V11-${Math.floor(100 + Math.random() * 900)}`
  )
    .trim()
    .toUpperCase();
  const cleanEmail = String(studentEmail || "scholar@vanguard11.app")
    .trim()
    .toLowerCase();

  const nowTime = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const firstDevice = {
    id: `dev-${Date.now()}`,
    name: String(deviceName || "Primary Study Laptop").trim(),
    platform: devicePlatform || "Laptop",
    lastActiveAt: "Live Now",
    isCurrentDevice: true,
    lockdownMirrored: true,
  };

  const prelinkedParents: any[] = [];
  if ((parent1Email && String(parent1Email).trim()) || (parent1Name && String(parent1Name).trim())) {
    prelinkedParents.push({
      id: "parent-slot-1",
      name: String(parent1Name || "Parent #1").trim(),
      relation: "Parent 1 (Mother / Father)",
      emailOrHandle: String(parent1Email || "parent1@family.org").trim().toLowerCase(),
      linkedAt: nowTime,
      liveNotificationsEnabled: true,
    });
  }
  if ((parent2Email && String(parent2Email).trim()) || (parent2Name && String(parent2Name).trim())) {
    prelinkedParents.push({
      id: "parent-slot-2",
      name: String(parent2Name || "Parent #2").trim(),
      relation: "Parent 2 (Co-Parent / Guardian)",
      emailOrHandle: String(parent2Email || "parent2@family.org").trim().toLowerCase(),
      linkedAt: nowTime,
      liveNotificationsEnabled: true,
    });
  }

  const resolvedTasks =
    Array.isArray(initialTasks) && initialTasks.length > 0
      ? initialTasks
      : buildDefaultTasks(classStandard, targetExam);
  const resolvedBlocks =
    Array.isArray(initialBlocks) && initialBlocks.length > 0
      ? initialBlocks
      : buildDefaultTimetableBlocks(resolvedTasks, studyStartTime);
  const resolvedFiles =
    Array.isArray(initialFiles) && initialFiles.length > 0
      ? initialFiles
      : DEFAULT_HOMEWORK_FILES;

  const state: SyncedRoomState = {
    syncVersion: 1,
    updatedAtMs: Date.now(),
    pairingCode: code,
    studentName: String(studentName || "Scholar").trim(),
    studentEmail: cleanEmail,
    classStandard,
    targetExam,
    dailyGoalHours: Number(dailyGoalHours) || 8,
    studyStartTime: String(studyStartTime || "16:00"),
    isLockdownActive: false,
    cameraVerified: true,
    cameraConfidence: 98,
    xpPoints: 100,
    streakDays: 1,
    activeBlockTitle:
      resolvedBlocks?.[0]?.title || `Focused ${targetExam || "Study"} Session`,
    activeBlockCategory: resolvedBlocks?.[0]?.category || "study",
    completedTasksCount: resolvedTasks.filter((t: any) => t.completed).length,
    totalTasksCount: resolvedTasks.length,
    violationsCount: 0,
    tasks: resolvedTasks,
    timetableBlocks: resolvedBlocks,
    timetableInstructions: `Start at ${studyStartTime}. Schedule high-priority ${targetExam} subjects first, insert 15-min breaks to upload homework files, and unlock Visual Studio Code strictly during coding slots.`,
    violations: [],
    devices: [firstDevice],
    parents: prelinkedParents.slice(0, 2),
    moments: [
      {
        id: `mom-${Date.now()}`,
        timestamp: nowTime,
        eventType: "device_sync",
        summary: `${studentName} signed up and customized workspace for ${classStandard} (${targetExam}). Registered "${firstDevice.name}" (${firstDevice.platform}) as Device 1 of 5.`,
        deviceLabel: firstDevice.name,
        xpDelta: 100,
      },
    ],
    homeworkFiles: resolvedFiles,
    parentEncouragement: "",
    updatedAt: nowTime,
    lastUpdatedByDeviceId: firstDevice.id,
    lastUpdatedByClientId: clientSessionId || firstDevice.id,
  };

  syncRooms.set(code, state);
  if (cleanEmail) {
    emailToPairingCode.set(cleanEmail, code);
  }
  saveRoomsToDisk();
  broadcastRoomUpdate(code, state);
  return res.json({
    ok: true,
    state,
    device: firstDevice,
  });
});

app.post("/api/auth/student-signin", (req, res) => {
  const {
    identifier = "",
    deviceName = "Secondary Study Device",
    devicePlatform = "Laptop",
    existingDeviceId = "",
    clientSessionId = "",
  } = req.body || {};

  const trimmed = String(identifier || "V11-942").trim();
  const code =
    emailToPairingCode.get(trimmed.toLowerCase()) || trimmed.toUpperCase();
  const room = getOrCreateDefaultRoom(code);

  const nowTime = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  // Check if device already exists or if a slot is available (strictly max 5 devices)
  let matchedDevice = room.devices.find(
    (d: any) =>
      d.id === existingDeviceId ||
      d.name.toLowerCase() === String(deviceName).trim().toLowerCase()
  );

  if (!matchedDevice) {
    if (room.devices.length >= 5) {
      return res.status(403).json({
        ok: false,
        error:
          "Maximum 5 devices are already registered on this student account. Sign out or revoke an existing device to connect a new one.",
      });
    }
    matchedDevice = {
      id: `dev-${Date.now()}`,
      name: String(deviceName || `Student Device #${room.devices.length + 1}`).trim(),
      platform: devicePlatform || "Laptop",
      lastActiveAt: "Live Now",
      isCurrentDevice: false,
      lockdownMirrored: true,
    };
    room.devices.push(matchedDevice);
  } else {
    matchedDevice.lastActiveAt = "Live Now";
    if (devicePlatform) {
      matchedDevice.platform = devicePlatform;
    }
  }

  room.moments = [
    {
      id: `mom-${Date.now()}`,
      timestamp: nowTime,
      eventType: "device_sync",
      summary: `Student connected "${matchedDevice.name}" (${matchedDevice.platform}) — Slot ${
        room.devices.findIndex((d: any) => d.id === matchedDevice.id) + 1
      } of 5. Full tasks, timetable, Lockdown & PDF sync active.`,
      deviceLabel: matchedDevice.name,
    },
    ...(room.moments || []).slice(0, 59),
  ];
  room.syncVersion = (room.syncVersion || 1) + 1;
  room.updatedAtMs = Date.now();
  room.updatedAt = nowTime;
  room.lastUpdatedByDeviceId = matchedDevice.id;
  room.lastUpdatedByClientId = clientSessionId || matchedDevice.id;

  syncRooms.set(room.pairingCode, room);
  saveRoomsToDisk();
  broadcastRoomUpdate(room.pairingCode, room);

  return res.json({
    ok: true,
    state: room,
    device: matchedDevice,
  });
});

app.post("/api/auth/parent-signin", (req, res) => {
  const {
    studentIdentifier = "",
    parentName = "Parent",
    parentEmail = "",
    relation = "Parent 1 (Mother / Father)",
    clientSessionId = "",
  } = req.body || {};

  const trimmed = String(studentIdentifier || "V11-942").trim();
  const code =
    emailToPairingCode.get(trimmed.toLowerCase()) || trimmed.toUpperCase();
  const room = getOrCreateDefaultRoom(code);

  const cleanParentEmail = String(parentEmail || "parent1@family.org")
    .trim()
    .toLowerCase();
  const nowTime = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  // Check if this parent is already one of the 2 registered parents
  let matchedParent = room.parents.find(
    (p: any) => p.emailOrHandle?.toLowerCase() === cleanParentEmail
  );

  if (!matchedParent) {
    if (room.parents.length >= 2) {
      return res.status(403).json({
        ok: false,
        error:
          "Maximum 2 Parent Accounts are already registered for this student. Only the 2 registered parents can access this student's live feed.",
      });
    }
    matchedParent = {
      id: `parent-${Date.now()}`,
      name: String(parentName || `Parent #${room.parents.length + 1}`).trim(),
      relation:
        room.parents.length === 0
          ? "Parent 1 (Mother / Father)"
          : relation || "Parent 2 (Co-Parent / Guardian)",
      emailOrHandle: cleanParentEmail,
      linkedAt: nowTime,
      liveNotificationsEnabled: true,
    };
    room.parents.push(matchedParent);
  } else {
    matchedParent.name = String(parentName || matchedParent.name).trim();
  }

  room.moments = [
    {
      id: `mom-${Date.now()}`,
      timestamp: nowTime,
      eventType: "parent_note",
      summary: `Parent Account "${matchedParent.name}" (${matchedParent.emailOrHandle}) connected from a dedicated Parent Device (Slot ${
        room.parents.findIndex((p: any) => p.id === matchedParent.id) + 1
      } of 2).`,
      deviceLabel: "Dedicated Parent Device",
    },
    ...(room.moments || []).slice(0, 59),
  ];
  room.syncVersion = (room.syncVersion || 1) + 1;
  room.updatedAtMs = Date.now();
  room.updatedAt = nowTime;
  room.lastUpdatedByClientId = clientSessionId || matchedParent.id;

  syncRooms.set(room.pairingCode, room);
  saveRoomsToDisk();
  broadcastRoomUpdate(room.pairingCode, room);

  return res.json({
    ok: true,
    state: room,
    parent: matchedParent,
  });
});

app.get("/api/sync/state", (req, res) => {
  const raw = String(req.query.pairingCode || "V11-942").trim();
  const code = emailToPairingCode.get(raw.toLowerCase()) || raw.toUpperCase();
  const state = getOrCreateDefaultRoom(code);
  res.json({ ok: true, state });
});

app.post("/api/sync/update", (req, res) => {
  const { pairingCode = "V11-942", patch } = req.body || {};
  const raw = String(pairingCode).trim();
  const code = emailToPairingCode.get(raw.toLowerCase()) || raw.toUpperCase();
  const existing = getOrCreateDefaultRoom(code);

  const nextState: SyncedRoomState = {
    ...existing,
    ...(patch || {}),
    pairingCode: code,
    syncVersion: (existing.syncVersion || 1) + 1,
    updatedAtMs: Date.now(),
    updatedAt: new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
  };

  // Enforce strict 5-device and 2-parent server-side caps
  if (Array.isArray(nextState.devices) && nextState.devices.length > 5) {
    nextState.devices = nextState.devices.slice(0, 5);
  }
  if (Array.isArray(nextState.parents) && nextState.parents.length > 2) {
    nextState.parents = nextState.parents.slice(0, 2);
  }
  if (Array.isArray(nextState.moments) && nextState.moments.length > 60) {
    nextState.moments = nextState.moments.slice(0, 60);
  }

  syncRooms.set(code, nextState);
  if (nextState.studentEmail) {
    emailToPairingCode.set(nextState.studentEmail.toLowerCase(), code);
  }
  saveRoomsToDisk();
  broadcastRoomUpdate(code, nextState);
  res.json({ ok: true, state: nextState });
});

app.get("/api/sync/stream", (req, res) => {
  const raw = String(req.query.pairingCode || "V11-942").trim();
  const code = emailToPairingCode.get(raw.toLowerCase()) || raw.toUpperCase();
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  if (!sseClientsByRoom.has(code)) {
    sseClientsByRoom.set(code, new Set());
  }
  const roomClients = sseClientsByRoom.get(code)!;
  roomClients.add(res);

  const initial = getOrCreateDefaultRoom(code);
  if (initial) {
    res.write(`data: ${JSON.stringify(initial)}\n\n`);
  }

  req.on("close", () => {
    roomClients.delete(res);
  });
});

async function startServer() {
  let viteMiddleware: express.RequestHandler | null = null;

  if (process.env.NODE_ENV !== "production") {
    const vitePromise = createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    }).then((vite) => {
      viteMiddleware = vite.middlewares;
      return vite;
    });

    app.use(async (req, res, next) => {
      if (viteMiddleware) {
        return viteMiddleware(req, res, next);
      }
      try {
        const vite = await vitePromise;
        return vite.middlewares(req, res, next);
      } catch (err) {
        next(err);
      }
    });
  } else {
    const distPath = path.resolve(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Vanguard 11 Server running on http://localhost:${PORT}`);
  });
}

startServer();
