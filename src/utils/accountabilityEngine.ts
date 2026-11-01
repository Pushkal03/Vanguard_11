export type TaskCategory = 'study' | 'coding' | 'revision' | 'break';

export type AppIdentifier =
  | 'vscode'
  | 'terminal'
  | 'homework_reader'
  | 'homework_uploader'
  | 'formula_sheet'
  | 'browser_tabs'
  | 'social_media'
  | 'games';

export interface StudyTask {
  id: string;
  title: string;
  subject: string;
  category: Exclude<TaskCategory, 'break'>;
  durationMinutes: number;
  points: number;
  completed: boolean;
  priority: 'high' | 'medium' | 'critical';
  completedAt?: string;
}

export interface TimetableBlock {
  id: string;
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
  title: string;
  category: TaskCategory;
  taskId?: string;
  allowedApps: AppIdentifier[];
  pointsReward: number;
  strictLockdown: boolean;
  status: 'upcoming' | 'active' | 'completed' | 'missed';
}

export interface AnnotationStroke {
  tool: 'highlighter' | 'pen';
  color: string;
  points: Array<{ x: number; y: number }>;
}

export interface HomeworkFile {
  id: string;
  name: string;
  subject: string;
  uploadedAt: string;
  uploadedDuringBlock: string;
  sizeLabel: string;
  mimeType?: string;
  fileDataUrl?: string;
  contentPreview: string;
  pages?: string[];
  pageImages?: string[];
  bookmarks?: number[];
  annotationsByPage?: Record<number, AnnotationStroke[]>;
  notes: string;
}

export interface FocusViolation {
  id: string;
  timestamp: string;
  type: 'tab_switch' | 'camera_absent' | 'unauthorized_app' | 'fullscreen_exit';
  description: string;
  pointsDeducted: number;
}

export interface AppCatalogItem {
  id: AppIdentifier;
  name: string;
  categoryLabel: string;
  requiredBlockCategory: TaskCategory[];
  description: string;
}

export interface FramePresenceMetrics {
  avgBrightness: number;          // 0 - 255
  centerSkinToneRatio: number;    // 0 - 1 (proportion of face/skin-like or subject pixels in center zone)
  centerContrastVariance: number; // 0 - 100 (edge/feature detail in center zone vs flat wall)
  motionDelta: number;            // 0 - 100 (frame-to-frame pixel difference in subject region)
  faceDetected?: boolean;         // true if browser FaceDetector or centroid tracker locked a face
  centroidX?: number;             // 0 - 1 normalized X position of subject
  centroidY?: number;             // 0 - 1 normalized Y position of subject
}

export interface CameraCalibrationBaseline {
  avgBrightness: number;
  centerSkinToneRatio: number;
  centerContrastVariance: number;
}

export interface PresenceCheckResult {
  present: boolean;
  confidence: number;
  reason: string;
  faceLocked: boolean;
  trackingBox: {
    x: number; // percentage 0-100
    y: number; // percentage 0-100
    w: number; // percentage 0-100
    h: number; // percentage 0-100
  };
}

export const APP_CATALOG: AppCatalogItem[] = [
  {
    id: 'vscode',
    name: 'Visual Studio Code',
    categoryLabel: 'IDE & Compiler',
    requiredBlockCategory: ['coding'],
    description: 'Unlocked strictly during scheduled Coding blocks. Blocked during Physics/Math theory or breaks.',
  },
  {
    id: 'terminal',
    name: 'Integrated Build Terminal',
    categoryLabel: 'Developer Tool',
    requiredBlockCategory: ['coding'],
    description: 'Available exclusively alongside Visual Studio Code during Coding blocks.',
  },
  {
    id: 'homework_uploader',
    name: 'Always-Open Homework File Acceptor',
    categoryLabel: 'Always Unlocked',
    requiredBlockCategory: ['study', 'coding', 'revision', 'break'],
    description: 'Permanently open across all blocks and Lockdown Mode so you can drop and access PDF & homework files anytime.',
  },
  {
    id: 'homework_reader',
    name: 'Universal PDF & File Opener Studio',
    categoryLabel: 'PDF & Document Studio',
    requiredBlockCategory: ['study', 'revision', 'coding', 'break'],
    description: 'Visual PDF viewer with zoom, pages, bookmarks, highlight/drawing tools, formula overlay, and side-by-side scratchpad.',
  },
  {
    id: 'formula_sheet',
    name: '11th Std Formula & Concept Deck',
    categoryLabel: 'Reference',
    requiredBlockCategory: ['study', 'revision'],
    description: 'Offline JEE/11th standard Physics, Chemistry, and Calculus reference constants.',
  },
  {
    id: 'browser_tabs',
    name: 'External Browser Tabs & YouTube',
    categoryLabel: 'Distraction Blocked',
    requiredBlockCategory: [],
    description: 'Permanently locked by Vanguard Device Lockdown during active study days.',
  },
];

/**
 * Splits a document's text or preview into multi-page segments for the PDF Opener Studio.
 */
export function paginateDocumentContent(content: string, fileName = 'Document'): string[] {
  const trimmed = (content || '').trim();
  if (!trimmed) {
    return [`Page 1 — ${fileName}\nNo text preview extracted. Use the visual PDF/File canvas and annotation tools.`];
  }

  // Split by explicit "--- PAGE" markers or roughly every 650 characters along line breaks
  if (/---+\s*PAGE/i.test(trimmed)) {
    return trimmed
      .split(/---+\s*PAGE[^\n]*\n?/i)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  const lines = trimmed.split('\n');
  const pages: string[] = [];
  let current = '';

  for (const line of lines) {
    if (current.length + line.length > 650 && current.length > 180) {
      pages.push(current.trim());
      current = line + '\n';
    } else {
      current += line + '\n';
    }
  }
  if (current.trim()) {
    pages.push(current.trim());
  }

  if (pages.length === 1) {
    pages.push(
      `Supplementary Practice & Derivation Sheet — ${fileName} (Page 2)\n` +
        `• Write full Free-Body Diagrams / State Transitions before substituting numerical values.\n` +
        `• Verify dimensional consistency and boundary conditions for every derived expression.\n` +
        `• Use the Highlighter and Pen tools in the toolbar above to mark key steps directly on this page.`
    );
  }

  return pages;
}

/**
 * Pure helper to add minutes to "HH:MM" 24-hour string.
 */
export function addMinutesToTime(timeStr: string, minutesToAdd: number): string {
  const [hStr, mStr] = timeStr.split(':');
  const hours = parseInt(hStr || '8', 10);
  const mins = parseInt(mStr || '0', 10);
  const totalMinutes = (hours * 60 + mins + minutesToAdd) % (24 * 60);
  const nextH = Math.floor(totalMinutes / 60);
  const nextM = totalMinutes % 60;
  return `${String(nextH).padStart(2, '0')}:${String(nextM).padStart(2, '0')}`;
}

/**
 * Determines which apps are allowed for a given block category.
 * Note: 'homework_uploader' and 'homework_reader' are ALWAYS kept open in every block.
 */
export function getAllowedAppsForCategory(category: TaskCategory): AppIdentifier[] {
  switch (category) {
    case 'coding':
      return ['vscode', 'terminal', 'homework_uploader', 'homework_reader'];
    case 'study':
      return ['homework_uploader', 'homework_reader', 'formula_sheet'];
    case 'revision':
      return ['homework_uploader', 'homework_reader', 'formula_sheet'];
    case 'break':
      return ['homework_uploader', 'homework_reader'];
  }
}

/**
 * Evaluates whether a specific app can be opened during the current active block.
 * Homework File Acceptor ('homework_uploader') and Universal PDF Opener ('homework_reader') are ALWAYS open.
 */
export function evaluateAppAccess(
  appId: AppIdentifier,
  activeBlock: TimetableBlock | null
): { allowed: boolean; reason: string; penaltyPoints: number } {
  if (appId === 'browser_tabs' || appId === 'social_media' || appId === 'games') {
    return {
      allowed: false,
      reason: 'External tabs and entertainment apps are strictly banned by your 2-Year Sacrifice Pact.',
      penaltyPoints: 25,
    };
  }

  if (appId === 'homework_uploader' || appId === 'homework_reader') {
    return {
      allowed: true,
      reason: 'Universal PDF Opener & Homework File Acceptor is permanently unlocked.',
      penaltyPoints: 0,
    };
  }

  if (!activeBlock) {
    return {
      allowed: false,
      reason: `Start a scheduled block first. ${appId === 'vscode' ? 'Visual Studio Code requires an active Coding block.' : 'App requires an active timetable block.'}`,
      penaltyPoints: 10,
    };
  }

  const isAllowed = activeBlock.allowedApps.includes(appId);
  if (isAllowed) {
    return {
      allowed: true,
      reason: `Authorized for active ${activeBlock.category.toUpperCase()} block ("${activeBlock.title}").`,
      penaltyPoints: 0,
    };
  }

  if (appId === 'vscode' && activeBlock.category !== 'coding') {
    return {
      allowed: false,
      reason: `ACCESS DENIED: Visual Studio Code is locked during "${activeBlock.title}" (${activeBlock.category.toUpperCase()}). It will unlock automatically during your scheduled Coding time.`,
      penaltyPoints: 20,
    };
  }

  return {
    allowed: false,
    reason: `ACCESS DENIED: This application is not permitted during "${activeBlock.title}". Stay focused on your current block.`,
    penaltyPoints: 15,
  };
}

/**
 * Pure human-presence & face-tracking evaluator for 5-second automated camera monitoring.
 * Supports configurable sensitivityThreshold (25-85) and optional calibrated desk baseline.
 */
export function evaluateHumanPresenceFromMetrics(
  metrics: FramePresenceMetrics,
  options?: {
    sensitivityThreshold?: number;
    baseline?: CameraCalibrationBaseline | null;
  }
): PresenceCheckResult {
  const {
    avgBrightness,
    centerSkinToneRatio,
    centerContrastVariance,
    motionDelta,
    faceDetected = false,
    centroidX = 0.5,
    centroidY = 0.48,
  } = metrics;

  const threshold = options?.sensitivityThreshold ?? 55;
  const baseline = options?.baseline ?? null;

  const boxW = 36;
  const boxH = 54;
  const clampedX = Math.max(12, Math.min(88 - boxW, Math.round(centroidX * 100 - boxW / 2)));
  const clampedY = Math.max(10, Math.min(86 - boxH, Math.round(centroidY * 100 - boxH / 2)));
  const trackingBox = { x: clampedX, y: clampedY, w: boxW, h: boxH };

  // 1. Covered lens or pitch black room (allow lower brightness if user calibrated in a dim room)
  const minBrightness = baseline ? Math.max(5, baseline.avgBrightness * 0.25) : 10;
  if (avgBrightness < minBrightness && !faceDetected) {
    return {
      present: false,
      confidence: 12,
      faceLocked: false,
      trackingBox,
      reason: 'Camera lens covered or room too dark — human presence not detected.',
    };
  }

  // 2. Washed-out / obstructed white frame with zero detail
  if (avgBrightness > 250 && centerContrastVariance < 3 && !faceDetected) {
    return {
      present: false,
      confidence: 16,
      faceLocked: false,
      trackingBox,
      reason: 'Camera frame obstructed or overexposed — no student silhouette in frame.',
    };
  }

  // 3. Compute composite confidence score
  let rawScore = 38;

  if (faceDetected) {
    rawScore += 42;
  }

  if (baseline) {
    // Compare similarity to the user's calibrated seated desk state
    const contrastRatio =
      centerContrastVariance / Math.max(4, baseline.centerContrastVariance);
    const skinSimilarity =
      baseline.centerSkinToneRatio > 0.02
        ? Math.min(1.3, centerSkinToneRatio / baseline.centerSkinToneRatio)
        : centerSkinToneRatio > 0.02
        ? 1.0
        : 0.7;

    if (contrastRatio >= 0.55) {
      rawScore += Math.min(35, Math.round(contrastRatio * 28));
    }
    rawScore += Math.min(22, Math.round(skinSimilarity * 18));
  } else {
    rawScore += Math.min(28, Math.round(centerSkinToneRatio * 135));
    rawScore += Math.min(22, Math.round(centerContrastVariance * 0.75));
  }

  rawScore += Math.min(12, Math.round(motionDelta * 2.2));

  // If flat empty wall/chair (very low skin tone, low contrast variance, no motion, no face)
  if (
    !faceDetected &&
    centerSkinToneRatio < 0.025 &&
    centerContrastVariance < 7.5 &&
    motionDelta < 0.7
  ) {
    rawScore = Math.min(rawScore, 28);
  }

  const confidence = Math.max(8, Math.min(99, rawScore));
  const present = confidence >= threshold;
  const faceLocked = present && (faceDetected || centerSkinToneRatio >= 0.04 || centerContrastVariance >= 12);

  return {
    present,
    confidence,
    faceLocked,
    trackingBox,
    reason: present
      ? `Human presence & face lock verified (${confidence}% confidence vs ${threshold}% threshold).`
      : `Empty desk / human absent (${confidence}% confidence is below ${threshold}% threshold).`,
  };
}

/**
 * Deterministically builds a structured timetable from the user's tasks and custom instructions.
 */
export function buildDeterministicTimetable(
  tasks: StudyTask[],
  instructions: string,
  defaultStartTime = '16:00'
): TimetableBlock[] {
  const timeMatch = instructions.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  let cursor = timeMatch ? `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}` : defaultStartTime;

  const wantsBreakFirst = /\b(break|upload homework)\s+first\b|start with break/i.test(instructions);
  const codingFirst = /\b(coding|vscode|cs)\s+first\b/i.test(instructions);

  const pendingTasks = tasks.filter((t) => !t.completed);
  const orderedTasks = [...pendingTasks].sort((a, b) => {
    if (codingFirst) {
      if (a.category === 'coding' && b.category !== 'coding') return -1;
      if (b.category === 'coding' && a.category !== 'coding') return 1;
    }
    const priorityRank = { critical: 0, high: 1, medium: 2 };
    return priorityRank[a.priority] - priorityRank[b.priority];
  });

  const blocks: TimetableBlock[] = [];

  if (wantsBreakFirst) {
    const end = addMinutesToTime(cursor, 15);
    blocks.push({
      id: `blk-break-init`,
      startTime: cursor,
      endTime: end,
      title: 'Recovery Break & Stretch',
      category: 'break',
      allowedApps: getAllowedAppsForCategory('break'),
      pointsReward: 30,
      strictLockdown: false,
      status: 'upcoming',
    });
    cursor = end;
  }

  orderedTasks.forEach((task, idx) => {
    const end = addMinutesToTime(cursor, task.durationMinutes);
    blocks.push({
      id: `blk-task-${task.id}`,
      startTime: cursor,
      endTime: end,
      title: task.title,
      category: task.category,
      taskId: task.id,
      allowedApps: getAllowedAppsForCategory(task.category),
      pointsReward: task.points,
      strictLockdown: true,
      status: idx === 0 && !wantsBreakFirst ? 'active' : 'upcoming',
    });
    cursor = end;

    if (idx < orderedTasks.length - 1) {
      const breakEnd = addMinutesToTime(cursor, 15);
      blocks.push({
        id: `blk-break-${idx + 1}`,
        startTime: cursor,
        endTime: breakEnd,
        title: 'Recovery Break & Review',
        category: 'break',
        allowedApps: getAllowedAppsForCategory('break'),
        pointsReward: 25,
        strictLockdown: false,
        status: 'upcoming',
      });
      cursor = breakEnd;
    }
  });

  if (blocks.length > 0 && !blocks.some((b) => b.status === 'active')) {
    blocks[0].status = 'active';
  }

  return blocks;
}

/**
 * Calculates net XP points earned for completing a task/block, factoring in camera presence
 * and any lockdown violations.
 */
export function calculateTaskCompletionPoints(params: {
  basePoints: number;
  cameraVerified: boolean;
  lockdownActive: boolean;
  violationCount: number;
}): {
  netPoints: number;
  bonusPoints: number;
  penaltyPoints: number;
  gradeLabel: string;
} {
  const { basePoints, cameraVerified, lockdownActive, violationCount } = params;
  let bonusPoints = 0;
  if (cameraVerified) bonusPoints += Math.round(basePoints * 0.2);
  if (lockdownActive) bonusPoints += Math.round(basePoints * 0.15);

  const penaltyPoints = violationCount * 15;
  const netPoints = Math.max(10, basePoints + bonusPoints - penaltyPoints);

  let gradeLabel = 'Standard Completion';
  if (cameraVerified && lockdownActive && violationCount === 0) {
    gradeLabel = 'Relentless Vanguard (Zero Distractions)';
  } else if (violationCount >= 2) {
    gradeLabel = 'Compromised Focus (Penalty Applied)';
  } else if (cameraVerified) {
    gradeLabel = 'Camera-Verified Discipline';
  }

  return {
    netPoints,
    bonusPoints,
    penaltyPoints,
    gradeLabel,
  };
}

export type ClassStandard =
  | '10th Standard'
  | '11th Standard'
  | '12th Standard'
  | 'Dropper / Gap Year';

export type TargetExam =
  | 'JEE Main & Advanced'
  | 'NEET UG'
  | 'BITSAT & Olympiads'
  | 'Computer Science & SAT'
  | 'Board Exams Excellence';

export const MAX_DEVICES_PER_ACCOUNT = 5;
export const MAX_PARENTS_PER_ACCOUNT = 2;

export interface StudentProfile {
  uid: string;
  studentName: string;
  email: string;
  classStandard: ClassStandard;
  targetExam: TargetExam;
  dailyGoalHours: number;
  pairingCode: string;
  onboarded: boolean;
}

export interface RegisteredDevice {
  id: string;
  name: string;
  platform: 'Laptop' | 'Desktop' | 'Tablet' | 'Mobile' | 'Workstation';
  lastActiveAt: string;
  isCurrentDevice?: boolean;
  lockdownMirrored: boolean;
}

export interface LinkedParentAccount {
  id: string;
  name: string;
  relation: 'Parent 1 (Mother / Father)' | 'Parent 2 (Co-Parent / Guardian)';
  emailOrHandle: string;
  linkedAt: string;
  liveNotificationsEnabled: boolean;
}

export interface StudentActivityMoment {
  id: string;
  timestamp: string;
  eventType:
    | 'lockdown'
    | 'camera'
    | 'file_upload'
    | 'task_complete'
    | 'violation'
    | 'device_sync'
    | 'parent_note';
  summary: string;
  deviceLabel: string;
  xpDelta?: number;
  isAlert?: boolean;
}

/**
 * Enforces the strict 5-device limit per student account.
 */
export function evaluateDeviceRegistration(
  existingDevices: RegisteredDevice[],
  incomingDevice: RegisteredDevice
): {
  allowed: boolean;
  devices: RegisteredDevice[];
  reason: string;
} {
  const existingIdx = existingDevices.findIndex((d) => d.id === incomingDevice.id);
  if (existingIdx !== -1) {
    const updated = existingDevices.map((d, i) =>
      i === existingIdx
        ? {
            ...d,
            ...incomingDevice,
            lockdownMirrored: true,
          }
        : d
    );
    return {
      allowed: true,
      devices: updated,
      reason: `Device "${incomingDevice.name}" synchronized (Slot ${existingIdx + 1} of ${MAX_DEVICES_PER_ACCOUNT}).`,
    };
  }

  if (existingDevices.length >= MAX_DEVICES_PER_ACCOUNT) {
    return {
      allowed: false,
      devices: existingDevices,
      reason: `Device limit reached (${MAX_DEVICES_PER_ACCOUNT}/${MAX_DEVICES_PER_ACCOUNT} devices active). Remove an existing device before registering "${incomingDevice.name}".`,
    };
  }

  const nextDevices = [...existingDevices, { ...incomingDevice, lockdownMirrored: true }];
  return {
    allowed: true,
    devices: nextDevices,
    reason: `Registered "${incomingDevice.name}" in Device Slot ${nextDevices.length} of ${MAX_DEVICES_PER_ACCOUNT}. Lockdown & file sync active across all devices.`,
  };
}

/**
 * Enforces the strict 2-parent account limit per student account.
 */
export function evaluateParentRegistration(
  existingParents: LinkedParentAccount[],
  incomingParent: LinkedParentAccount
): {
  allowed: boolean;
  parents: LinkedParentAccount[];
  reason: string;
} {
  const existingIdx = existingParents.findIndex(
    (p) =>
      p.id === incomingParent.id ||
      p.emailOrHandle.toLowerCase() === incomingParent.emailOrHandle.toLowerCase()
  );

  if (existingIdx !== -1) {
    const updated = existingParents.map((p, i) =>
      i === existingIdx ? { ...p, ...incomingParent } : p
    );
    return {
      allowed: true,
      parents: updated,
      reason: `Updated Parent Account "${incomingParent.name}" (Slot ${existingIdx + 1} of ${MAX_PARENTS_PER_ACCOUNT}).`,
    };
  }

  if (existingParents.length >= MAX_PARENTS_PER_ACCOUNT) {
    return {
      allowed: false,
      parents: existingParents,
      reason: `Maximum ${MAX_PARENTS_PER_ACCOUNT} parent accounts are already registered for this student. Remove one to register "${incomingParent.name}".`,
    };
  }

  const nextParents = [...existingParents, incomingParent];
  return {
    allowed: true,
    parents: nextParents,
    reason: `Registered "${incomingParent.name}" as Parent Account ${nextParents.length} of ${MAX_PARENTS_PER_ACCOUNT}. All live student study moments are now streaming to this parent account.`,
  };
}

/**
 * Builds customized subjects, tasks, and coaching directives tailored to the student's Class and Target Exam.
 */
export function buildCustomizedCurriculum(
  classStandard: ClassStandard,
  targetExam: TargetExam,
  studentName = 'Scholar'
): {
  subjects: string[];
  tasks: StudyTask[];
  partnerHeadline: string;
} {
  if (targetExam === 'NEET UG') {
    const subjects = [
      `Physics (${classStandard} NEET)`,
      `Biology — Botany & Zoology (${classStandard})`,
      `Chemistry — Organic & Physical (${classStandard})`,
      'Coding & Bioinformatics',
    ];
    return {
      subjects,
      tasks: [
        {
          id: 'task-neet-1',
          title: 'NCERT Line-by-Line Human Physiology & Cell Cycle — 60 MCQs',
          subject: subjects[1],
          category: 'study',
          durationMinutes: 60,
          points: 160,
          completed: false,
          priority: 'critical',
        },
        {
          id: 'task-neet-2',
          title: 'Rotational Mechanics & Thermodynamics PYQ Sprint (45 Numericals)',
          subject: subjects[0],
          category: 'study',
          durationMinutes: 50,
          points: 145,
          completed: false,
          priority: 'high',
        },
        {
          id: 'task-neet-3',
          title: 'Chemical Bonding, Equilibrium & GOC Reaction Mechanisms',
          subject: subjects[2],
          category: 'revision',
          durationMinutes: 45,
          points: 130,
          completed: false,
          priority: 'high',
        },
        {
          id: 'task-neet-4',
          title: 'Python Data Analysis & Lab Simulation Script',
          subject: subjects[3],
          category: 'coding',
          durationMinutes: 35,
          points: 110,
          completed: false,
          priority: 'medium',
        },
      ],
      partnerHeadline: `${studentName}, you are in ${classStandard} targeting ${targetExam}. Every NCERT diagram and Physics numerical counts—I have synced your Lockdown state across all your devices and connected your Parent Live Feed.`,
    };
  }

  if (targetExam === 'Computer Science & SAT') {
    const subjects = [
      `Algorithms & C++/Python (${classStandard})`,
      `SAT / AP Calculus & Linear Algebra`,
      `AP Physics C: Mechanics & E&M`,
      `System Design & Competitive Coding`,
    ];
    return {
      subjects,
      tasks: [
        {
          id: 'task-cs-1',
          title: 'Dynamic Programming & Graph Shortest Paths in VS Code Sandbox',
          subject: subjects[0],
          category: 'coding',
          durationMinutes: 60,
          points: 165,
          completed: false,
          priority: 'critical',
        },
        {
          id: 'task-cs-2',
          title: 'Multivariable Calculus & Differential Equations Problem Set',
          subject: subjects[1],
          category: 'study',
          durationMinutes: 50,
          points: 140,
          completed: false,
          priority: 'high',
        },
        {
          id: 'task-cs-3',
          title: 'AP Physics C Rotational Dynamics & Conservation Laws',
          subject: subjects[2],
          category: 'study',
          durationMinutes: 45,
          points: 130,
          completed: false,
          priority: 'high',
        },
      ],
      partnerHeadline: `${studentName}, your ${classStandard} workspace is customized for ${targetExam}. All ${MAX_DEVICES_PER_ACCOUNT} device slots and ${MAX_PARENTS_PER_ACCOUNT} parent telemetry streams are locked in.`,
    };
  }

  // Default: JEE Main & Advanced / BITSAT / Board Exams
  const subjects = [
    `Physics (${classStandard})`,
    `Mathematics (${targetExam})`,
    `Chemistry (${classStandard})`,
    'Computer Science',
  ];

  return {
    subjects,
    tasks: [
      {
        id: 'task-1',
        title: `Rotational Dynamics & Moment of Inertia — Solve 35 ${targetExam} Numericals`,
        subject: subjects[0],
        category: 'study',
        durationMinutes: 60,
        points: 150,
        completed: false,
        priority: 'critical',
      },
      {
        id: 'task-2',
        title: 'C++ Dynamic Programming & Graph Traversal Implementation',
        subject: subjects[3],
        category: 'coding',
        durationMinutes: 45,
        points: 140,
        completed: false,
        priority: 'high',
      },
      {
        id: 'task-3',
        title: 'Chemical Bonding & Hybridization Coaching Sheet (DPP-04)',
        subject: subjects[2],
        category: 'study',
        durationMinutes: 50,
        points: 120,
        completed: false,
        priority: 'high',
      },
      {
        id: 'task-4',
        title: 'Trigonometric Equations & Conic Sections Formula Recall',
        subject: subjects[1],
        category: 'revision',
        durationMinutes: 40,
        points: 100,
        completed: true,
        priority: 'medium',
        completedAt: '15:40',
      },
    ],
    partnerHeadline: `${studentName}, you are in ${classStandard} preparing for ${targetExam}. When Lockdown Mode or a PDF upload triggers on one device, all ${MAX_DEVICES_PER_ACCOUNT} connected devices mirror it immediately, and your ${MAX_PARENTS_PER_ACCOUNT} Parent Accounts receive every live update.`,
  };
}

