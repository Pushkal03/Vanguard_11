/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Lock,
  Unlock,
  Plus,
  Sparkles,
  Play,
  Code2,
  FileText,
  BookOpen,
  Shield,
  Trash2,
  LogOut,
  Laptop,
  Smartphone,
  RefreshCw,
  MessageSquare,
} from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import {
  AppIdentifier,
  buildCustomizedCurriculum,
  buildDeterministicTimetable,
  calculateTaskCompletionPoints,
  evaluateAppAccess,
  evaluateDeviceRegistration,
  evaluateParentRegistration,
  FocusViolation,
  HomeworkFile,
  LinkedParentAccount,
  MAX_DEVICES_PER_ACCOUNT,
  MAX_PARENTS_PER_ACCOUNT,
  RegisteredDevice,
  StudentActivityMoment,
  StudentProfile,
  StudyTask,
  TaskCategory,
  TimetableBlock,
} from './utils/accountabilityEngine';
import {
  recordStudentMomentToFirestore,
  subscribeToStudentWorkspace,
  syncHomeworkFileToFirestore,
  syncStudentWorkspaceToFirestore,
} from './services/firestoreSyncService';
import { IntegratedAppsModal } from './components/IntegratedAppsModal';
import { HomeworkVaultView } from './components/HomeworkVaultView';
import { LockdownSessionView } from './components/LockdownSessionView';
import { PartnerCoachView, PartnerMessage } from './components/PartnerCoachView';
import {
  AuthGatewayScreen,
  AuthenticatedParentPayload,
  AuthenticatedStudentPayload,
  DeviceViewMode,
} from './components/AuthGatewayScreen';
import { StudentDevicesView } from './components/StudentDevicesView';
import { ParentDedicatedScreen } from './components/ParentDedicatedScreen';

type ActiveTab = 'command' | 'lockdown' | 'vault' | 'devices_parents' | 'partner';

const INITIAL_PROFILE: StudentProfile = {
  uid: 'student-vanguard-11',
  studentName: 'Pushkal',
  email: 'v.v.h.s.pushkal@gmail.com',
  classStandard: '11th Standard',
  targetExam: 'JEE Main & Advanced',
  dailyGoalHours: 8,
  pairingCode: 'V11-942',
  onboarded: true,
};

const INITIAL_DEVICES: RegisteredDevice[] = [
  {
    id: 'dev-1',
    name: 'Primary Study Laptop',
    platform: 'Laptop',
    lastActiveAt: 'Live Now',
    isCurrentDevice: true,
    lockdownMirrored: true,
  },
  {
    id: 'dev-2',
    name: 'iPad Study Tablet (PDF Reader)',
    platform: 'Tablet',
    lastActiveAt: 'Synced 1m ago',
    isCurrentDevice: false,
    lockdownMirrored: true,
  },
  {
    id: 'dev-3',
    name: 'Mobile Companion Phone',
    platform: 'Mobile',
    lastActiveAt: 'Synced 1m ago',
    isCurrentDevice: false,
    lockdownMirrored: true,
  },
];

const INITIAL_PARENTS: LinkedParentAccount[] = [
  {
    id: 'parent-1',
    name: 'Parent 1 (Mother)',
    relation: 'Parent 1 (Mother / Father)',
    emailOrHandle: 'parent1.guardian@gmail.com',
    linkedAt: '15:30',
    liveNotificationsEnabled: true,
  },
  {
    id: 'parent-2',
    name: 'Parent 2 (Father)',
    relation: 'Parent 2 (Co-Parent / Guardian)',
    emailOrHandle: 'parent2.guardian@gmail.com',
    linkedAt: '15:32',
    liveNotificationsEnabled: true,
  },
];

const INITIAL_MOMENTS: StudentActivityMoment[] = [
  {
    id: 'mom-init-1',
    timestamp: '15:40',
    eventType: 'task_complete',
    summary:
      'Completed "Trigonometric Equations & Conic Sections Formula Recall" under Camera Verification (+100 XP).',
    deviceLabel: 'Primary Study Laptop',
    xpDelta: 100,
  },
  {
    id: 'mom-init-2',
    timestamp: '15:45',
    eventType: 'file_upload',
    summary:
      'Uploaded "Physics_Ch7_Rotational_Mechanics_Sheet.pdf" (2 pages) — automatically mirrored to all 3 registered devices.',
    deviceLabel: 'iPad Study Tablet (PDF Reader)',
    xpDelta: 20,
  },
  {
    id: 'mom-init-3',
    timestamp: '16:00',
    eventType: 'camera',
    summary:
      '5-Second Webcam Presence Tracker verified student seated at desk (98% confidence). Active slot: Rotational Dynamics.',
    deviceLabel: 'Primary Study Laptop',
  },
];

const INITIAL_TASKS: StudyTask[] = [
  {
    id: 'task-1',
    title: 'Rotational Dynamics & Moment of Inertia — Solve 35 Numericals',
    subject: 'Physics (11th Std)',
    category: 'study',
    durationMinutes: 60,
    points: 150,
    completed: false,
    priority: 'critical',
  },
  {
    id: 'task-2',
    title: 'C++ Dynamic Programming & Graph Traversal Implementation',
    subject: 'Computer Science',
    category: 'coding',
    durationMinutes: 45,
    points: 140,
    completed: false,
    priority: 'high',
  },
  {
    id: 'task-3',
    title: 'Chemical Bonding & Hybridization Coaching Sheet (DPP-04)',
    subject: 'Chemistry (11th Std)',
    category: 'study',
    durationMinutes: 50,
    points: 120,
    completed: false,
    priority: 'high',
  },
  {
    id: 'task-4',
    title: 'Trigonometric Equations & Conic Sections Formula Recall',
    subject: 'Mathematics (11th Std)',
    category: 'revision',
    durationMinutes: 40,
    points: 100,
    completed: true,
    priority: 'medium',
    completedAt: '15:40',
  },
];

const INITIAL_HOMEWORK: HomeworkFile[] = [
  {
    id: 'hw-1',
    name: 'Physics_Ch7_Rotational_Mechanics_Sheet.pdf',
    subject: 'Physics (11th Std)',
    uploadedAt: '15:45',
    uploadedDuringBlock: 'Pre-Session Break Intake',
    sizeLabel: '420 KB',
    mimeType: 'application/pdf',
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
      'Q1 Hint: a = g sin(θ) / (1 + I / mR²). For solid cylinder, I = ½ mR², so a = (2/3) g sin(30°) = g/3.',
  },
  {
    id: 'hw-2',
    name: 'CS_11th_DP_Knapsack_Assignment.md',
    subject: 'Computer Science (C++ / Python)',
    uploadedAt: '15:50',
    uploadedDuringBlock: 'Pre-Session Break Intake',
    sizeLabel: '18 KB',
    mimeType: 'text/markdown',
    contentPreview: `CODING ASSIGNMENT: 0/1 KNAPSACK & SUBSET SUM
1. Implement space-optimized O(W) 0/1 Knapsack in C++ inside the Visual Studio Code sandbox during your Coding slot.
2. Verify time complexity for N = 1000 items and W = 5000 capacity.
3. No external web tabs or copy-pasting allowed during Lockdown.`,
    pages: [
      `CODING ASSIGNMENT: 0/1 KNAPSACK & SUBSET SUM\n1. Implement space-optimized O(W) 0/1 Knapsack in C++ inside the Visual Studio Code sandbox during your Coding slot.\n2. Verify time complexity for N = 1000 items and W = 5000 capacity.\n3. No external web tabs or copy-pasting allowed during Lockdown.`,
    ],
    bookmarks: [],
    annotationsByPage: {},
    notes: '',
  },
];

export default function App() {
  // First Screen is ALWAYS the Multi-User Auth Gateway (sessionRole === null)
  const [sessionRole, setSessionRole] = useState<'student' | 'parent' | null>(null);
  const [activeParentSession, setActiveParentSession] =
    useState<LinkedParentAccount | null>(null);

  // Dedicated Mobile Mode vs Laptop / Tab Mode State
  const [deviceViewMode, setDeviceViewMode] = useState<DeviceViewMode>(() =>
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'mobile' : 'laptop_tab'
  );
  const [manualViewModeLocked, setManualViewModeLocked] = useState<boolean>(false);
  const [mobileCommandSubTab, setMobileCommandSubTab] = useState<'both' | 'todo' | 'timetable'>(
    'todo'
  );

  // Sync Telemetry across all 5 devices
  const [syncVersion, setSyncVersion] = useState<number>(1);
  const [lastSyncedAt, setLastSyncedAt] = useState<string>(() =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );
  const syncVersionRef = useRef<number>(0);
  const clientSessionIdRef = useRef<string>(
    `client-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  );

  const [activeTab, setActiveTab] = useState<ActiveTab>('command');
  const [profile, setProfile] = useState<StudentProfile>(INITIAL_PROFILE);
  const [activeRole, setActiveRole] = useState<'student' | 'parent_1' | 'parent_2'>('student');
  const [studyStartTime, setStudyStartTime] = useState<string>('16:00');

  // Auto-detect viewport width changes unless manually overridden by the user
  useEffect(() => {
    if (manualViewModeLocked || typeof window === 'undefined') return;
    const handleResize = () => {
      setDeviceViewMode(window.innerWidth < 768 ? 'mobile' : 'laptop_tab');
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [manualViewModeLocked]);

  const handleSelectDeviceViewMode = useCallback((mode: DeviceViewMode) => {
    setManualViewModeLocked(true);
    setDeviceViewMode(mode);
  }, []);

  // 5-Device & 2-Parent Account State
  const [devices, setDevices] = useState<RegisteredDevice[]>(INITIAL_DEVICES);
  const [currentDeviceId, setCurrentDeviceId] = useState<string>('dev-1');
  const [parents, setParents] = useState<LinkedParentAccount[]>(INITIAL_PARENTS);
  const [moments, setMoments] = useState<StudentActivityMoment[]>(INITIAL_MOMENTS);
  const [parentEncouragement, setParentEncouragement] = useState<string>(
    'Stay locked in on Rotational Dynamics, Pushkal! Both of us are cheering for your 11th standard JEE goal.'
  );

  const [availableSubjects, setAvailableSubjects] = useState<string[]>([
    'Physics (11th Std)',
    'Mathematics (JEE Main & Advanced)',
    'Chemistry (11th Std)',
    'Computer Science',
  ]);
  const [tasks, setTasks] = useState<StudyTask[]>(INITIAL_TASKS);
  const [timetableInstructions, setTimetableInstructions] = useState<string>(
    'Start at 16:00. Schedule high-priority Physics first, insert 15-min breaks to upload homework files, and unlock Visual Studio Code strictly during my C++ coding slot.'
  );
  const [timetableBlocks, setTimetableBlocks] = useState<TimetableBlock[]>(() =>
    buildDeterministicTimetable(
      INITIAL_TASKS,
      'Start at 16:00. Schedule high-priority Physics first, insert 15-min breaks to upload homework files, and unlock Visual Studio Code strictly during my C++ coding slot.',
      '16:00'
    )
  );
  const [partnerHeadlineNote, setPartnerHeadlineNote] = useState<string>(
    "You're in 11th standard targeting JEE Main & Advanced. When Lockdown Mode or a PDF upload triggers on one device, all 5 connected devices mirror it immediately, and your 2 registered Parent Accounts receive every live update."
  );

  // New Task Form State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskSubject, setNewTaskSubject] = useState('Physics (11th Std)');
  const [newTaskCategory, setNewTaskCategory] =
    useState<Exclude<TaskCategory, 'break'>>('study');
  const [newTaskDuration, setNewTaskDuration] = useState<number>(45);
  const [newTaskPriority, setNewTaskPriority] =
    useState<'critical' | 'high' | 'medium'>('high');
  const [taskFormError, setTaskFormError] = useState<string | null>(null);

  // Gamification & Accountability State
  const [xpPoints, setXpPoints] = useState<number>(640);
  const [streakDays] = useState<number>(14);
  const [isLockdownActive, setIsLockdownActive] = useState<boolean>(false);
  const [cameraVerified, setCameraVerified] = useState<boolean>(true);
  const [violations, setViolations] = useState<FocusViolation[]>([]);
  const [statusBanner, setStatusBanner] = useState<{
    tone: 'emerald' | 'amber' | 'rose';
    text: string;
  } | null>(null);

  // Integrated Apps & Homework Vault State
  const [homeworkFiles, setHomeworkFiles] = useState<HomeworkFile[]>(INITIAL_HOMEWORK);
  const [selectedHomeworkId, setSelectedHomeworkId] = useState<string | null>(
    INITIAL_HOMEWORK[0].id
  );
  const [openAppModal, setOpenAppModal] = useState<AppIdentifier | null>(null);
  const [isGeneratingSchedule, setIsGeneratingSchedule] = useState<boolean>(false);

  // Partner Chat State
  const [partnerMessages, setPartnerMessages] = useState<PartnerMessage[]>([
    {
      id: 'm-1',
      sender: 'kai',
      text: "Hey! Remember our pact: you have massive dreams for these two years of 11th and 12th standard, and my job is to never let your laziness win. Your timetable is locked in—Rotational Dynamics is active right now, all 5 of your device slots are synchronized, and both Parent Accounts are receiving live study updates!",
      timestamp: '16:00',
    },
  ]);
  const [isSendingChat, setIsSendingChat] = useState<boolean>(false);

  const isApplyingRemoteSyncRef = useRef<boolean>(false);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  const activeBlock =
    timetableBlocks.find((b) => b.status === 'active') || timetableBlocks[0] || null;
  const currentDevice =
    devices.find((d) => d.id === currentDeviceId) || devices[0];

  // Helper to push a live moment and broadcast across all 5 devices + 2 parent accounts
  const recordStudentMoment = useCallback(
    (
      eventType: StudentActivityMoment['eventType'],
      summary: string,
      xpDelta?: number,
      isAlert?: boolean
    ) => {
      const now = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      const newMoment: StudentActivityMoment = {
        id: `mom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: now,
        eventType,
        summary,
        deviceLabel: currentDevice?.name || 'Primary Study Laptop',
        xpDelta,
        isAlert,
      };
      setMoments((prev) => [newMoment, ...prev.slice(0, 59)]);
      recordStudentMomentToFirestore(profile.uid, newMoment).catch(() => {});
      return newMoment;
    },
    [currentDevice?.name, profile.uid]
  );

  // Broadcast complete state changes to Server-Authoritative Room + BroadcastChannel + Firestore
  const pushCrossDeviceStateSync = useCallback(
    (patch: Record<string, any>) => {
      if (isApplyingRemoteSyncRef.current) return;

      const resolvedTasks: StudyTask[] = patch.tasks ?? tasks;
      const resolvedBlocks: TimetableBlock[] = patch.timetableBlocks ?? timetableBlocks;
      const resolvedFiles: HomeworkFile[] = patch.homeworkFiles ?? homeworkFiles;
      const resolvedDevices: RegisteredDevice[] = patch.devices ?? devices;
      const resolvedParents: LinkedParentAccount[] = patch.parents ?? parents;
      const resolvedMoments: StudentActivityMoment[] = (patch.moments ?? moments).slice(0, 45);
      const resolvedViolations: FocusViolation[] = patch.violations ?? violations;
      const nextSyncVer = syncVersionRef.current + 1;
      syncVersionRef.current = nextSyncVer;
      setSyncVersion(nextSyncVer);
      const nowStamp = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setLastSyncedAt(nowStamp);

      const payload = {
        syncVersion: nextSyncVer,
        updatedAtMs: Date.now(),
        pairingCode: profile.pairingCode,
        studentName: profile.studentName,
        studentEmail: profile.email,
        classStandard: profile.classStandard,
        targetExam: profile.targetExam,
        dailyGoalHours: profile.dailyGoalHours,
        studyStartTime,
        isLockdownActive,
        cameraVerified,
        cameraConfidence: cameraVerified ? 98 : 22,
        xpPoints,
        streakDays,
        activeBlockTitle: activeBlock?.title || 'Study Session',
        activeBlockCategory: activeBlock?.category || 'study',
        completedTasksCount: resolvedTasks.filter((t) => t.completed).length,
        totalTasksCount: resolvedTasks.length,
        violationsCount: resolvedViolations.length,
        tasks: resolvedTasks,
        timetableBlocks: resolvedBlocks,
        timetableInstructions: patch.timetableInstructions ?? timetableInstructions,
        violations: resolvedViolations,
        devices: resolvedDevices,
        parents: resolvedParents,
        moments: resolvedMoments,
        homeworkFiles: resolvedFiles.map((f) => ({
          id: f.id,
          name: f.name,
          subject: f.subject,
          uploadedAt: f.uploadedAt,
          uploadedDuringBlock: f.uploadedDuringBlock,
          sizeLabel: f.sizeLabel,
          mimeType: f.mimeType,
          contentPreview: f.contentPreview,
          pages: f.pages,
          bookmarks: f.bookmarks,
          annotationsByPage: f.annotationsByPage,
          notes: f.notes,
        })),
        parentEncouragement,
        lastUpdatedByDeviceId: currentDeviceId,
        lastUpdatedByClientId: clientSessionIdRef.current,
        ...patch,
      };

      // 1. BroadcastChannel for instant same-browser multi-tab / multi-device preview
      try {
        broadcastChannelRef.current?.postMessage(payload);
      } catch {
        // Ignore
      }

      // 2. Server-Authoritative SSE Room Sync (persisted across all 5 devices + 2 parent accounts)
      fetch('/api/sync/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pairingCode: profile.pairingCode,
          patch: payload,
        }),
      })
        .then((r) => r.json())
        .then((resData) => {
          if (resData?.state?.syncVersion) {
            syncVersionRef.current = Math.max(syncVersionRef.current, resData.state.syncVersion);
            setSyncVersion(syncVersionRef.current);
          }
          if (resData?.state?.updatedAt) {
            setLastSyncedAt(resData.state.updatedAt);
          }
        })
        .catch(() => {});

      // 3. Firestore Authoritative Document Sync
      syncStudentWorkspaceToFirestore({
        workspaceId: profile.uid,
        studentName: payload.studentName,
        classStandard: payload.classStandard,
        targetExam: payload.targetExam,
        pairingCode: payload.pairingCode,
        parents: payload.parents,
        devices: payload.devices,
        isLockdownActive: payload.isLockdownActive,
        cameraVerified: payload.cameraVerified,
        cameraConfidence: payload.cameraConfidence,
        xpPoints: payload.xpPoints,
        streakDays: payload.streakDays,
        activeBlockTitle: payload.activeBlockTitle,
        activeBlockCategory: payload.activeBlockCategory,
        completedTasksCount: payload.completedTasksCount,
        totalTasksCount: payload.totalTasksCount,
        violationsCount: payload.violationsCount,
        latestFile: resolvedFiles[0],
        latestMoment: payload.moments?.[0],
        parentEncouragement: payload.parentEncouragement,
      }).catch(() => {});
    },
    [
      activeBlock?.category,
      activeBlock?.title,
      cameraVerified,
      currentDeviceId,
      devices,
      homeworkFiles,
      isLockdownActive,
      moments,
      parentEncouragement,
      parents,
      profile.classStandard,
      profile.dailyGoalHours,
      profile.email,
      profile.pairingCode,
      profile.studentName,
      profile.targetExam,
      profile.uid,
      streakDays,
      studyStartTime,
      tasks,
      timetableBlocks,
      timetableInstructions,
      violations,
      xpPoints,
    ]
  );

  // Authoritative state applier for all 5 Student Devices & 2 Parent Accounts
  const applyRemoteRoomState = useCallback(
    (remote: any, forceHydrate = false) => {
      if (!remote) return;
      if (
        !forceHydrate &&
        remote.lastUpdatedByClientId &&
        remote.lastUpdatedByClientId === clientSessionIdRef.current
      ) {
        return;
      }

      if (
        !forceHydrate &&
        typeof remote.syncVersion === 'number' &&
        remote.syncVersion < syncVersionRef.current
      ) {
        return;
      }

      isApplyingRemoteSyncRef.current = true;

      if (typeof remote.syncVersion === 'number') {
        syncVersionRef.current = Math.max(syncVersionRef.current, remote.syncVersion);
        setSyncVersion(syncVersionRef.current);
      }
      if (typeof remote.updatedAt === 'string' && remote.updatedAt) {
        setLastSyncedAt(remote.updatedAt);
      }

      if (typeof remote.isLockdownActive === 'boolean') {
        setIsLockdownActive((prevLock) => {
          if (remote.isLockdownActive && !prevLock && activeRole === 'student') {
            setActiveTab('lockdown');
            setStatusBanner({
              tone: 'emerald',
              text: 'Cross-Device Lockdown Triggered: Another device on your account entered Lockdown Mode — all 5 devices are now locked.',
            });
          }
          return remote.isLockdownActive;
        });
      }

      if (typeof remote.cameraVerified === 'boolean') {
        setCameraVerified(remote.cameraVerified);
      }

      if (typeof remote.xpPoints === 'number') {
        setXpPoints(remote.xpPoints);
      }

      if (Array.isArray(remote.tasks) && remote.tasks.length > 0) {
        setTasks(remote.tasks);
      }

      if (Array.isArray(remote.timetableBlocks) && remote.timetableBlocks.length > 0) {
        setTimetableBlocks(remote.timetableBlocks);
      }

      if (typeof remote.timetableInstructions === 'string' && remote.timetableInstructions) {
        setTimetableInstructions(remote.timetableInstructions);
      }

      if (Array.isArray(remote.homeworkFiles) && remote.homeworkFiles.length > 0) {
        setHomeworkFiles((prevFiles) => {
          return remote.homeworkFiles.map((rf: HomeworkFile) => {
            const existingFile = prevFiles.find((pf) => pf.id === rf.id);
            return {
              ...existingFile,
              ...rf,
              pageImages: rf.pageImages || existingFile?.pageImages,
              fileDataUrl: rf.fileDataUrl || existingFile?.fileDataUrl,
            };
          });
        });
      }

      if (Array.isArray(remote.devices) && remote.devices.length > 0) {
        setDevices(remote.devices);
      }

      if (Array.isArray(remote.parents) && remote.parents.length > 0) {
        setParents(remote.parents);
      }

      if (Array.isArray(remote.violations)) {
        setViolations(remote.violations);
      }

      if (Array.isArray(remote.moments) && remote.moments.length > 0) {
        setMoments(remote.moments);
      }

      if (typeof remote.parentEncouragement === 'string') {
        setParentEncouragement(remote.parentEncouragement);
      }

      setTimeout(() => {
        isApplyingRemoteSyncRef.current = false;
      }, 60);
    },
    [activeRole]
  );

  const handleForceSyncNow = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/sync/state?pairingCode=${encodeURIComponent(profile.pairingCode)}`
      );
      const data = await res.json();
      if (data?.state) {
        applyRemoteRoomState(data.state, true);
        setStatusBanner({
          tone: 'emerald',
          text: `All ${
            data.state.devices?.length || devices.length
          } devices and ${
            data.state.parents?.length || parents.length
          } parent accounts synchronized (Sync v${data.state.syncVersion || syncVersion}).`,
        });
      }
    } catch {
      pushCrossDeviceStateSync({});
    }
  }, [applyRemoteRoomState, devices.length, parents.length, profile.pairingCode, pushCrossDeviceStateSync, syncVersion]);

  // Firebase Auth listener + Firestore Workspace subscription
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setProfile((prev) => ({
          ...prev,
          uid: user.uid,
          studentName: user.displayName || prev.studentName,
          email: user.email || prev.email,
        }));
      }
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    const unsubFirestore = subscribeToStudentWorkspace(profile.uid, (remoteDoc) => {
      isApplyingRemoteSyncRef.current = true;
      if (typeof remoteDoc.isLockdownActive === 'boolean') {
        setIsLockdownActive(remoteDoc.isLockdownActive);
        if (remoteDoc.isLockdownActive && activeRole === 'student') {
          setActiveTab('lockdown');
        }
      }
      if (typeof remoteDoc.cameraVerified === 'boolean') {
        setCameraVerified(remoteDoc.cameraVerified);
      }
      if (typeof remoteDoc.xpPoints === 'number') {
        setXpPoints(remoteDoc.xpPoints);
      }
      if (typeof remoteDoc.parentEncouragement === 'string') {
        setParentEncouragement(remoteDoc.parentEncouragement);
      }
      setTimeout(() => {
        isApplyingRemoteSyncRef.current = false;
      }, 60);
    });
    return () => {
      if (unsubFirestore) unsubFirestore();
    };
  }, [activeRole, profile.uid]);

  // Subscribe to Server-Sent Events (/api/sync/stream) + BroadcastChannel + 2.5s Polling Heartbeat for guaranteed 5-Device Sync
  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel('vanguard_11_multi_device_sync');
      broadcastChannelRef.current = channel;
      channel.onmessage = (ev) => applyRemoteRoomState(ev.data, false);
    }

    let eventSource: EventSource | null = null;
    let isFirstStreamMsg = true;
    if (typeof EventSource !== 'undefined') {
      eventSource = new EventSource(
        `/api/sync/stream?pairingCode=${encodeURIComponent(profile.pairingCode)}`
      );
      eventSource.onmessage = (ev) => {
        try {
          const parsed = JSON.parse(ev.data);
          applyRemoteRoomState(parsed, isFirstStreamMsg);
          isFirstStreamMsg = false;
        } catch {
          // Ignore malformed event
        }
      };
    }

    // 2.5-second Heartbeat Poll to guarantee sync across mobile networks & proxies
    const pollInterval = setInterval(async () => {
      if (isApplyingRemoteSyncRef.current) return;
      try {
        const res = await fetch(
          `/api/sync/state?pairingCode=${encodeURIComponent(profile.pairingCode)}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (
          data?.state &&
          typeof data.state.syncVersion === 'number' &&
          data.state.syncVersion > syncVersionRef.current
        ) {
          applyRemoteRoomState(data.state, true);
        }
      } catch {
        // Ignore transient poll errors
      }
    }, 2500);

    return () => {
      channel?.close();
      eventSource?.close();
      clearInterval(pollInterval);
    };
  }, [applyRemoteRoomState, profile.pairingCode]);

  // Toggle Lockdown across ALL 5 registered devices simultaneously
  const handleToggleLockdownAllDevices = useCallback(
    (nextLockdown: boolean) => {
      setIsLockdownActive(nextLockdown);
      if (nextLockdown && activeRole === 'student') {
        setActiveTab('lockdown');
      }
      const newMom = recordStudentMoment(
        'lockdown',
        nextLockdown
          ? `Entered Full-Device Lockdown Mode — synchronized across all ${devices.length}/${MAX_DEVICES_PER_ACCOUNT} student devices.`
          : `Unlocked Focus Lockdown Mode across all ${devices.length} connected devices.`
      );
      pushCrossDeviceStateSync({
        isLockdownActive: nextLockdown,
        moments: [newMom, ...moments.slice(0, 34)],
      });
    },
    [activeRole, devices.length, moments, pushCrossDeviceStateSync, recordStudentMoment]
  );

  // Camera presence verification handler that streams updates to Parent Portal
  const handleCameraVerifiedChange = useCallback(
    (verified: boolean) => {
      setCameraVerified((prev) => {
        if (prev !== verified) {
          const mom = recordStudentMoment(
            'camera',
            verified
              ? 'Webcam Presence Monitor confirmed student back at desk (5s auto-scan).'
              : 'ALERT: 5s Camera Presence Monitor detected student stepped away from desk!',
            undefined,
            !verified
          );
          pushCrossDeviceStateSync({
            cameraVerified: verified,
            moments: [mom, ...moments.slice(0, 34)],
          });
        }
        return verified;
      });
    },
    [moments, pushCrossDeviceStateSync, recordStudentMoment]
  );

  const logViolation = useCallback(
    (
      description: string,
      pointsDeducted: number,
      type: FocusViolation['type'] = 'unauthorized_app'
    ) => {
      const now = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      const newViolation: FocusViolation = {
        id: `v-${Date.now()}`,
        timestamp: now,
        type,
        description,
        pointsDeducted,
      };
      setViolations((prev) => [newViolation, ...prev]);
      const nextXp = Math.max(0, xpPoints - pointsDeducted);
      setXpPoints(nextXp);
      setStatusBanner({
        tone: 'rose',
        text: `Accountability Alert (-${pointsDeducted} XP): ${description} (Reported to Parent Live Feed)`,
      });

      const mom = recordStudentMoment(
        'violation',
        `Violation Alert (-${pointsDeducted} XP): ${description}`,
        -pointsDeducted,
        true
      );
      pushCrossDeviceStateSync({
        xpPoints: nextXp,
        violationsCount: violations.length + 1,
        moments: [mom, ...moments.slice(0, 34)],
      });
    },
    [moments, pushCrossDeviceStateSync, recordStudentMoment, violations.length, xpPoints]
  );

  // Handle Student Sign Up / Sign In from AuthGatewayScreen (Student Device)
  const handleAuthenticatedStudent = (payload: AuthenticatedStudentPayload) => {
    const room = payload.roomState || {};
    setProfile(payload.profile);
    setActiveRole('student');
    setSessionRole('student');
    setActiveTab('command');
    const startTime = payload.studyStartTime || room.studyStartTime || '16:00';
    setStudyStartTime(startTime);

    const activeDev = payload.devices.find((d) => d.id === payload.currentDeviceId);
    if (payload.preferredViewMode) {
      handleSelectDeviceViewMode(payload.preferredViewMode);
    } else if (activeDev?.platform === 'Mobile') {
      handleSelectDeviceViewMode('mobile');
    }

    const customized = buildCustomizedCurriculum(
      payload.profile.classStandard,
      payload.profile.targetExam,
      payload.profile.studentName
    );
    setAvailableSubjects(customized.subjects);
    setNewTaskSubject(customized.subjects[0]);

    // Hydrate from authoritative room state if present (so 2nd-5th devices never overwrite existing tasks/files!)
    const syncedTasks: StudyTask[] =
      Array.isArray(room.tasks) && room.tasks.length > 0 ? room.tasks : customized.tasks;
    setTasks(syncedTasks);

    const customInstructions =
      room.timetableInstructions ||
      `Start at ${startTime}. Schedule high-priority ${payload.profile.targetExam} subjects first, insert 15-min breaks to upload homework files, and unlock Visual Studio Code strictly during coding slots.`;
    setTimetableInstructions(customInstructions);

    const syncedBlocks: TimetableBlock[] =
      Array.isArray(room.timetableBlocks) && room.timetableBlocks.length > 0
        ? room.timetableBlocks
        : buildDeterministicTimetable(syncedTasks, customInstructions, startTime);
    setTimetableBlocks(syncedBlocks);
    setPartnerHeadlineNote(customized.partnerHeadline);

    setDevices(payload.devices);
    setCurrentDeviceId(payload.currentDeviceId);
    setParents(payload.parents);

    if (Array.isArray(room.homeworkFiles) && room.homeworkFiles.length > 0) {
      setHomeworkFiles(room.homeworkFiles);
      setSelectedHomeworkId(room.homeworkFiles[0].id);
    }
    if (Array.isArray(payload.moments) && payload.moments.length > 0) {
      setMoments(payload.moments);
    }
    if (Array.isArray(room.violations)) {
      setViolations(room.violations);
    }
    if (typeof room.xpPoints === 'number') {
      setXpPoints(room.xpPoints);
    }
    if (typeof room.cameraVerified === 'boolean') {
      setCameraVerified(room.cameraVerified);
    }
    if (typeof room.parentEncouragement === 'string') {
      setParentEncouragement(room.parentEncouragement);
    }
    if (typeof room.syncVersion === 'number') {
      syncVersionRef.current = room.syncVersion;
      setSyncVersion(room.syncVersion);
    }
    if (typeof room.updatedAt === 'string' && room.updatedAt) {
      setLastSyncedAt(room.updatedAt);
    }
    if (typeof room.isLockdownActive === 'boolean') {
      setIsLockdownActive(room.isLockdownActive);
      if (room.isLockdownActive) {
        setActiveTab('lockdown');
      }
    }

    setPartnerMessages([
      {
        id: `m-${Date.now()}`,
        sender: 'kai',
        text: `Welcome, ${payload.profile.studentName}! Your ${payload.profile.classStandard} workspace is customized for ${payload.profile.targetExam}. Device slot "${
          activeDev?.name || 'Primary Device'
        }" is live-synced (${payload.devices.length}/${MAX_DEVICES_PER_ACCOUNT} devices connected · Sync v${
          room.syncVersion || 1
        }), and your Parent Pairing Code is ${payload.profile.pairingCode}.`,
        timestamp: startTime,
      },
    ]);

    setStatusBanner({
      tone: 'emerald',
      text: `Signed in & synced on "${activeDev?.name || 'Student Device'}" (${
        payload.devices.length
      }/${MAX_DEVICES_PER_ACCOUNT} devices active · Pairing Code: ${
        payload.profile.pairingCode
      }).`,
    });
  };

  // Handle Parent Sign In from AuthGatewayScreen (Separate Parent Device)
  const handleAuthenticatedParent = (payload: AuthenticatedParentPayload) => {
    const room = payload.roomState || {};
    setActiveParentSession(payload.parentAccount);
    setActiveRole(
      payload.parentAccount.relation.startsWith('Parent 1') ? 'parent_1' : 'parent_2'
    );
    setSessionRole('parent');
    if (payload.preferredViewMode) {
      handleSelectDeviceViewMode(payload.preferredViewMode);
    }

    const studentClass = room.classStandard || profile.classStandard;
    const studentExam = room.targetExam || profile.targetExam;
    const studentName = room.studentName || profile.studentName;

    setProfile({
      uid: `student-${payload.pairingCode.toLowerCase()}`,
      studentName,
      email: room.studentEmail || profile.email,
      classStandard: studentClass,
      targetExam: studentExam,
      dailyGoalHours: room.dailyGoalHours || 8,
      pairingCode: payload.pairingCode,
      onboarded: true,
    });

    const customized = buildCustomizedCurriculum(studentClass, studentExam, studentName);
    const syncedTasks =
      Array.isArray(room.tasks) && room.tasks.length > 0 ? room.tasks : customized.tasks;
    setTasks(syncedTasks);
    const syncedBlocks =
      Array.isArray(room.timetableBlocks) && room.timetableBlocks.length > 0
        ? room.timetableBlocks
        : buildDeterministicTimetable(
            syncedTasks,
            room.timetableInstructions || timetableInstructions,
            room.studyStartTime || '16:00'
          );
    setTimetableBlocks(syncedBlocks);

    if (Array.isArray(room.homeworkFiles) && room.homeworkFiles.length > 0) {
      setHomeworkFiles(room.homeworkFiles);
      setSelectedHomeworkId(room.homeworkFiles[0].id);
    }
    if (Array.isArray(room.devices) && room.devices.length > 0) {
      setDevices(room.devices);
    }
    if (Array.isArray(room.parents) && room.parents.length > 0) {
      setParents(room.parents);
    }
    if (Array.isArray(room.moments) && room.moments.length > 0) {
      setMoments(room.moments);
    }
    if (Array.isArray(room.violations)) {
      setViolations(room.violations);
    }
    if (typeof room.isLockdownActive === 'boolean') {
      setIsLockdownActive(room.isLockdownActive);
    }
    if (typeof room.cameraVerified === 'boolean') {
      setCameraVerified(room.cameraVerified);
    }
    if (typeof room.xpPoints === 'number') {
      setXpPoints(room.xpPoints);
    }
    if (typeof room.parentEncouragement === 'string' && room.parentEncouragement) {
      setParentEncouragement(room.parentEncouragement);
    }
    if (typeof room.syncVersion === 'number') {
      syncVersionRef.current = room.syncVersion;
      setSyncVersion(room.syncVersion);
    }
    if (typeof room.updatedAt === 'string' && room.updatedAt) {
      setLastSyncedAt(room.updatedAt);
    }
  };

  const handleSignOut = () => {
    setSessionRole(null);
    setActiveParentSession(null);
    setOpenAppModal(null);
    setStatusBanner(null);
  };

  // Add Device (enforces 5-device limit)
  const handleAddDevice = (name: string, platform: RegisteredDevice['platform']) => {
    const newDev: RegisteredDevice = {
      id: `dev-${Date.now()}`,
      name,
      platform,
      lastActiveAt: 'Just Synced',
      isCurrentDevice: false,
      lockdownMirrored: true,
    };
    const check = evaluateDeviceRegistration(devices, newDev);
    if (!check.allowed) {
      setStatusBanner({
        tone: 'rose',
        text: check.reason,
      });
      return;
    }
    setDevices(check.devices);
    const mom = recordStudentMoment(
      'device_sync',
      `Registered new device "${name}" (${platform}) — Slot ${check.devices.length} of ${MAX_DEVICES_PER_ACCOUNT}. Lockdown & PDF files mirrored automatically.`
    );
    setStatusBanner({
      tone: 'emerald',
      text: check.reason,
    });
    pushCrossDeviceStateSync({
      devices: check.devices,
      moments: [mom, ...moments.slice(0, 34)],
    });
  };

  const handleRemoveDevice = (deviceId: string) => {
    if (devices.length <= 1) return;
    const target = devices.find((d) => d.id === deviceId);
    const next = devices.filter((d) => d.id !== deviceId);
    setDevices(next);
    if (currentDeviceId === deviceId) {
      setCurrentDeviceId(next[0].id);
    }
    const mom = recordStudentMoment(
      'device_sync',
      `Removed device "${target?.name || deviceId}". ${next.length}/${MAX_DEVICES_PER_ACCOUNT} device slots active.`
    );
    pushCrossDeviceStateSync({
      devices: next,
      moments: [mom, ...moments.slice(0, 34)],
    });
  };

  // Add Parent (enforces 2-parent limit)
  const handleAddParent = (
    name: string,
    relation: LinkedParentAccount['relation'],
    emailOrHandle: string
  ) => {
    const incoming: LinkedParentAccount = {
      id: `parent-${Date.now()}`,
      name,
      relation,
      emailOrHandle,
      linkedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      liveNotificationsEnabled: true,
    };
    const check = evaluateParentRegistration(parents, incoming);
    if (!check.allowed) {
      setStatusBanner({
        tone: 'rose',
        text: check.reason,
      });
      return;
    }
    setParents(check.parents);
    const mom = recordStudentMoment(
      'parent_note',
      `Linked Parent Account "${name}" (${emailOrHandle}) — Slot ${check.parents.length} of ${MAX_PARENTS_PER_ACCOUNT}.`
    );
    setStatusBanner({
      tone: 'emerald',
      text: check.reason,
    });
    pushCrossDeviceStateSync({
      parents: check.parents,
      moments: [mom, ...moments.slice(0, 34)],
    });
  };

  const handleRemoveParent = (parentId: string) => {
    if (parents.length <= 1) return;
    const next = parents.filter((p) => p.id !== parentId);
    setParents(next);
    pushCrossDeviceStateSync({ parents: next });
  };

  const handleSendParentNote = (parentLabel: string, noteText: string) => {
    const formatted = `${parentLabel}: ${noteText}`;
    setParentEncouragement(formatted);
    const mom = recordStudentMoment(
      'parent_note',
      `Live Parent Message from ${parentLabel}: "${noteText}"`
    );
    setStatusBanner({
      tone: 'emerald',
      text: `Live Parent Message delivered to ${profile.studentName}'s screen across all ${devices.length} devices!`,
    });
    pushCrossDeviceStateSync({
      parentEncouragement: formatted,
      moments: [mom, ...moments.slice(0, 34)],
    });
  };

  // Add Homework / PDF File and immediately mirror across all 5 devices + 2 parent accounts
  const handleAddSyncedHomeworkFile = (
    newFile: Omit<HomeworkFile, 'id' | 'uploadedAt' | 'uploadedDuringBlock'>,
    openImmediately?: boolean
  ) => {
    const created: HomeworkFile = {
      ...newFile,
      id: `hw-${Date.now()}`,
      uploadedAt: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      uploadedDuringBlock: activeBlock ? activeBlock.title : 'Cross-Device Sync Intake',
    };
    const nextFiles = [created, ...homeworkFiles];
    setHomeworkFiles(nextFiles);
    setSelectedHomeworkId(created.id);
    const nextXp = xpPoints + 20;
    setXpPoints(nextXp);

    if (openImmediately) {
      setOpenAppModal('homework_reader');
    }

    const mom = recordStudentMoment(
      'file_upload',
      `Uploaded "${created.name}" (${created.pages?.length || 1} pages · ${created.subject}) — synced across all ${devices.length} devices (+20 XP).`,
      20
    );

    syncHomeworkFileToFirestore(profile.uid, created).catch(() => {});
    pushCrossDeviceStateSync({
      xpPoints: nextXp,
      homeworkFiles: nextFiles,
      moments: [mom, ...moments.slice(0, 34)],
    });
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) {
      setTaskFormError('Enter a clear, specific task title before adding to today’s mission.');
      return;
    }
    setTaskFormError(null);

    const calculatedPoints = Math.round(
      newTaskDuration *
        (newTaskPriority === 'critical' ? 2.5 : newTaskPriority === 'high' ? 2.2 : 1.8)
    );

    const created: StudyTask = {
      id: `task-${Date.now()}`,
      title: newTaskTitle.trim(),
      subject: newTaskSubject,
      category: newTaskCategory,
      durationMinutes: Number(newTaskDuration) || 45,
      points: calculatedPoints,
      completed: false,
      priority: newTaskPriority,
    };

    const nextTasks = [created, ...tasks];
    const nextBlocks = buildDeterministicTimetable(nextTasks, timetableInstructions, studyStartTime);
    setTasks(nextTasks);
    setTimetableBlocks(nextBlocks);
    setNewTaskTitle('');
    const mom = recordStudentMoment(
      'device_sync',
      `Added new ${created.subject} task: "${created.title}" (${created.durationMinutes} min · +${created.points} XP).`
    );
    setStatusBanner({
      tone: 'emerald',
      text: `Added "${created.title}" (${created.points} XP) and synchronized across all ${devices.length} devices & Parent Portal.`,
    });
    pushCrossDeviceStateSync({
      tasks: nextTasks,
      timetableBlocks: nextBlocks,
      totalTasksCount: nextTasks.length,
      moments: [mom, ...moments.slice(0, 34)],
    });
  };

  const handleToggleTaskComplete = (taskId: string) => {
    const target = tasks.find((t) => t.id === taskId);
    if (!target) return;

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let nextXp = xpPoints;
    let earnedDelta = 0;

    if (!target.completed) {
      const score = calculateTaskCompletionPoints({
        basePoints: target.points,
        cameraVerified,
        lockdownActive: isLockdownActive,
        violationCount: violations.length,
      });
      earnedDelta = score.netPoints;
      nextXp = xpPoints + score.netPoints;
      setXpPoints(nextXp);
      setStatusBanner({
        tone: 'emerald',
        text: `Completed "${target.title}"! Earned +${score.netPoints} XP (${score.gradeLabel}). Synced across all ${devices.length} devices & Parent Accounts!`,
      });
    } else {
      earnedDelta = -target.points;
      nextXp = Math.max(0, xpPoints - target.points);
      setXpPoints(nextXp);
    }

    const updatedTasks = tasks.map((t) =>
      t.id === taskId
        ? { ...t, completed: !t.completed, completedAt: !t.completed ? nowTime : undefined }
        : t
    );
    setTasks(updatedTasks);

    const nextBlocks = timetableBlocks.map((blk) =>
      blk.taskId === taskId
        ? {
            ...blk,
            status: (!target.completed
              ? 'completed'
              : 'upcoming') as TimetableBlock['status'],
          }
        : blk
    );
    if (!nextBlocks.some((b) => b.status === 'active')) {
      const firstUpcoming = nextBlocks.find((b) => b.status === 'upcoming');
      if (firstUpcoming) firstUpcoming.status = 'active';
    }
    setTimetableBlocks(nextBlocks);

    const mom = recordStudentMoment(
      'task_complete',
      !target.completed
        ? `Completed "${target.title}" (${target.subject}) under ${
            cameraVerified ? 'Camera-Verified' : 'Standard'
          } supervision (+${earnedDelta} XP).`
        : `Reopened task "${target.title}".`,
      earnedDelta
    );

    pushCrossDeviceStateSync({
      tasks: updatedTasks,
      timetableBlocks: nextBlocks,
      xpPoints: nextXp,
      completedTasksCount: updatedTasks.filter((t) => t.completed).length,
      totalTasksCount: updatedTasks.length,
      moments: [mom, ...moments.slice(0, 34)],
    });
  };

  const handleDeleteTask = (taskId: string) => {
    const target = tasks.find((t) => t.id === taskId);
    const nextTasks = tasks.filter((t) => t.id !== taskId);
    const nextBlocks = buildDeterministicTimetable(nextTasks, timetableInstructions, studyStartTime);
    setTasks(nextTasks);
    setTimetableBlocks(nextBlocks);
    const mom = recordStudentMoment(
      'device_sync',
      `Removed task "${target?.title || taskId}" — synced across all ${devices.length} devices.`
    );
    pushCrossDeviceStateSync({
      tasks: nextTasks,
      timetableBlocks: nextBlocks,
      completedTasksCount: nextTasks.filter((t) => t.completed).length,
      totalTasksCount: nextTasks.length,
      moments: [mom, ...moments.slice(0, 34)],
    });
  };

  const handleGenerateTimetable = async () => {
    setIsGeneratingSchedule(true);
    try {
      const localBlocks = buildDeterministicTimetable(tasks, timetableInstructions, '16:00');
      setTimetableBlocks(localBlocks);

      const response = await fetch('/api/timetable/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks: tasks.filter((t) => !t.completed),
          instructions: timetableInstructions,
          startTime: '16:00',
        }),
      });
      const data = await response.json();
      if (data.partnerNote) {
        setPartnerHeadlineNote(data.partnerNote);
      }
      let finalBlocks = localBlocks;
      if (Array.isArray(data.blocks) && data.blocks.length > 0) {
        const normalized: TimetableBlock[] = data.blocks.map((b: any, index: number) => ({
          id: b.id || `ai-blk-${index}`,
          startTime: b.startTime || '16:00',
          endTime: b.endTime || '17:00',
          title: b.title || 'Focused Study Session',
          category: (['study', 'coding', 'break', 'revision'].includes(b.category)
            ? b.category
            : 'study') as TaskCategory,
          taskId: b.taskId || undefined,
          allowedApps:
            b.category === 'coding'
              ? ['vscode', 'terminal', 'homework_uploader', 'homework_reader']
              : b.category === 'break'
              ? ['homework_uploader', 'homework_reader']
              : ['homework_uploader', 'homework_reader', 'formula_sheet'],
          pointsReward: Number(b.pointsReward) || 120,
          strictLockdown: Boolean(b.strictLockdown ?? b.category !== 'break'),
          status: index === 0 ? 'active' : 'upcoming',
        }));
        finalBlocks = normalized;
        setTimetableBlocks(normalized);
      }
      const mom = recordStudentMoment(
        'device_sync',
        `Generated custom timetable under instructions: "${timetableInstructions.slice(0, 80)}..."`
      );
      pushCrossDeviceStateSync({
        timetableBlocks: finalBlocks,
        timetableInstructions,
        moments: [mom, ...moments.slice(0, 34)],
      });
      setStatusBanner({
        tone: 'emerald',
        text: 'Timetable rebuilt and synchronized across all 5 devices and Parent Accounts.',
      });
    } catch {
      setStatusBanner({
        tone: 'amber',
        text: 'Timetable synchronized with strict app permissions.',
      });
    } finally {
      setIsGeneratingSchedule(false);
    }
  };

  const handleActivateBlock = (blockId: string) => {
    const nextBlocks = timetableBlocks.map((b) => {
      if (b.id === blockId) return { ...b, status: 'active' as const };
      if (b.status === 'active') return { ...b, status: 'upcoming' as const };
      return b;
    });
    setTimetableBlocks(nextBlocks);
    const target = timetableBlocks.find((b) => b.id === blockId);
    if (target) {
      const mom = recordStudentMoment(
        'device_sync',
        `Switched active timetable slot to "${target.title}" (${target.category.toUpperCase()}).`
      );
      pushCrossDeviceStateSync({
        timetableBlocks: nextBlocks,
        activeBlockTitle: target.title,
        activeBlockCategory: target.category,
        moments: [mom, ...moments.slice(0, 34)],
      });
      setStatusBanner({
        tone: 'emerald',
        text: `Switched active block to "${target.title}" (${target.category.toUpperCase()}). ${
          target.category === 'coding'
            ? 'Visual Studio Code is now UNLOCKED.'
            : 'Visual Studio Code is LOCKED; PDF Opener & Formula Deck are UNLOCKED.'
        }`,
      });
    }
  };

  const handleAttemptOpenApp = (appId: AppIdentifier) => {
    const check = evaluateAppAccess(appId, activeBlock);
    if (!check.allowed) {
      logViolation(check.reason, check.penaltyPoints, 'unauthorized_app');
      return;
    }
    if (appId === 'homework_uploader') {
      setActiveTab('vault');
      return;
    }
    setOpenAppModal(appId);
  };

  const handleCompleteActiveBlock = () => {
    if (!activeBlock) return;
    if (activeBlock.taskId) {
      handleToggleTaskComplete(activeBlock.taskId);
    } else {
      const nextXp = xpPoints + activeBlock.pointsReward;
      setXpPoints(nextXp);
      const mom = recordStudentMoment(
        'task_complete',
        `Completed block "${activeBlock.title}" (+${activeBlock.pointsReward} XP).`,
        activeBlock.pointsReward
      );
      pushCrossDeviceStateSync({
        xpPoints: nextXp,
        moments: [mom, ...moments.slice(0, 34)],
      });
      setStatusBanner({
        tone: 'emerald',
        text: `Completed "${activeBlock.title}" (+${activeBlock.pointsReward} XP). Moving to next block!`,
      });
      setTimetableBlocks((prev) => {
        const idx = prev.findIndex((b) => b.id === activeBlock.id);
        return prev.map((b, i) => {
          if (i === idx) return { ...b, status: 'completed' };
          if (i === idx + 1) return { ...b, status: 'active' };
          return b;
        });
      });
    }
  };

  const handleSendMessageToPartner = async (text: string) => {
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: PartnerMessage = {
      id: `u-${Date.now()}`,
      sender: 'student',
      text,
      timestamp: now,
    };
    setPartnerMessages((prev) => [...prev, userMsg]);
    setIsSendingChat(true);

    try {
      const response = await fetch('/api/partner/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          context: {
            studentName: profile.studentName,
            classStandard: profile.classStandard,
            targetExam: profile.targetExam,
            xpPoints,
            completedTasks: tasks.filter((t) => t.completed).length,
            totalTasks: tasks.length,
            activeBlock: activeBlock?.title,
            activeCategory: activeBlock?.category,
            violationsCount: violations.length,
            cameraVerified,
            connectedDevices: devices.length,
          },
        }),
      });
      const data = await response.json();
      setPartnerMessages((prev) => [
        ...prev,
        {
          id: `k-${Date.now()}`,
          sender: 'kai',
          text:
            data.reply ||
            'No excuses. You promised yourself two years of sacrifice—get back to your active block right now.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch {
      setPartnerMessages((prev) => [
        ...prev,
        {
          id: `k-${Date.now()}`,
          sender: 'kai',
          text: "I hear you, best friend—but I won't let you slack off. Lock your screen, keep your camera on, and finish the next 20 minutes of problems before we talk again.",
          timestamp: now,
        },
      ]);
    } finally {
      setIsSendingChat(false);
    }
  };

  const completedTasksCount = tasks.filter((t) => t.completed).length;
  const isMobileMode = deviceViewMode === 'mobile';

  // 1. FIRST SCREEN: Multi-User Sign Up / Sign In Gateway (Student or Parent)
  if (sessionRole === null) {
    return (
      <AuthGatewayScreen
        onAuthenticatedStudent={handleAuthenticatedStudent}
        onAuthenticatedParent={handleAuthenticatedParent}
        deviceViewMode={deviceViewMode}
        onChangeDeviceViewMode={handleSelectDeviceViewMode}
      />
    );
  }

  // 2. DEDICATED PARENT SCREEN (Strictly isolated on Parent Devices)
  if (sessionRole === 'parent' && activeParentSession) {
    return (
      <>
        <ParentDedicatedScreen
          parentAccount={activeParentSession}
          profile={profile}
          devices={devices}
          parents={parents}
          isLockdownActive={isLockdownActive}
          onParentTriggerLockdown={handleToggleLockdownAllDevices}
          cameraVerified={cameraVerified}
          xpPoints={xpPoints}
          streakDays={streakDays}
          activeBlock={activeBlock}
          tasks={tasks}
          homeworkFiles={homeworkFiles}
          violations={violations}
          moments={moments}
          parentEncouragement={parentEncouragement}
          onSendParentNote={handleSendParentNote}
          onInspectHomeworkPdf={(homeworkId) => {
            setSelectedHomeworkId(homeworkId);
            setOpenAppModal('homework_reader');
          }}
          onSignOut={handleSignOut}
          deviceViewMode={deviceViewMode}
          onChangeDeviceViewMode={handleSelectDeviceViewMode}
          syncVersion={syncVersion}
          lastSyncedAt={lastSyncedAt}
          onForceSyncNow={handleForceSyncNow}
        />

        <IntegratedAppsModal
          openApp={openAppModal}
          onClose={() => setOpenAppModal(null)}
          activeBlock={activeBlock}
          homeworkFiles={homeworkFiles}
          selectedHomeworkId={selectedHomeworkId}
          onSelectHomework={setSelectedHomeworkId}
          onSaveHomeworkNotes={(id, notes) => {
            const nextFiles = homeworkFiles.map((f) => (f.id === id ? { ...f, notes } : f));
            setHomeworkFiles(nextFiles);
            pushCrossDeviceStateSync({ homeworkFiles: nextFiles });
          }}
          onUpdateHomeworkFile={(id, patch) => {
            const nextFiles = homeworkFiles.map((f) => (f.id === id ? { ...f, ...patch } : f));
            setHomeworkFiles(nextFiles);
            pushCrossDeviceStateSync({ homeworkFiles: nextFiles });
          }}
          onAddHomeworkFile={handleAddSyncedHomeworkFile}
          onAwardBonusPoints={() => {}}
        />
      </>
    );
  }

  // 3. DEDICATED STUDENT WORKSPACE (Student Devices Only — Cannot Access Parent Screen)
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Bar with Dedicated Mobile vs Laptop/Tab Mode Switcher + 5-Device Live Sync Badge */}
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-slate-800 bg-slate-950/95 px-4 sm:px-6 py-3 sticky top-0 z-30 backdrop-blur-xs">
        {/* Zone 1: Brand + Active Device & Pairing Code */}
        <div className="flex items-center gap-3">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('command');
            }}
            className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0"
          >
            Vanguard 11
          </a>
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-950/30 px-2 py-0.5 font-mono text-[11px] font-semibold text-emerald-300">
            Code: {profile.pairingCode} · {devices.length}/5 Devs
          </span>
        </div>

        {/* Zone 2: Primary Desktop/Tab Navigation (hidden in Mobile Mode where Bottom Dock is used) */}
        {!isMobileMode && (
          <nav
            aria-label="Primary Workspace Navigation"
            className="order-3 w-full xl:order-2 xl:w-auto flex items-center justify-between sm:justify-start gap-4 md:gap-6 text-xs sm:text-sm font-medium text-slate-400 overflow-x-auto border-t border-slate-800/80 pt-2.5 xl:border-t-0 xl:pt-0"
          >
            <button
              type="button"
              onClick={() => setActiveTab('command')}
              className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
                activeTab === 'command'
                  ? 'text-white underline underline-offset-8 decoration-amber-400 decoration-2'
                  : 'hover:text-slate-200'
              }`}
            >
              To-Do & Timetable
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('lockdown')}
              className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
                activeTab === 'lockdown'
                  ? 'text-white underline underline-offset-8 decoration-amber-400 decoration-2'
                  : 'hover:text-slate-200'
              }`}
            >
              Focus Lockdown
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('vault')}
              className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
                activeTab === 'vault'
                  ? 'text-white underline underline-offset-8 decoration-amber-400 decoration-2'
                  : 'hover:text-slate-200'
              }`}
            >
              Homework Vault ({homeworkFiles.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('devices_parents')}
              className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
                activeTab === 'devices_parents'
                  ? 'text-white underline underline-offset-8 decoration-amber-400 decoration-2'
                  : 'hover:text-slate-200'
              }`}
            >
              My 5 Synced Devices ({devices.length}/5)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('partner')}
              className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
                activeTab === 'partner'
                  ? 'text-white underline underline-offset-8 decoration-amber-400 decoration-2'
                  : 'hover:text-slate-200'
              }`}
            >
              Partner Kai
            </button>
          </nav>
        )}

        {/* Zone 3: Dedicated Mode Switcher (Laptop/Tab vs Mobile) + Force Sync + Lockdown + Sign Out */}
        <div className="order-2 xl:order-3 flex flex-wrap items-center gap-2 shrink-0">
          {/* Dedicated Mobile vs Laptop/Tab Mode Switcher */}
          <div
            role="group"
            aria-label="Switch Device Display Mode"
            className="flex items-center rounded-lg border border-slate-800 bg-slate-900 p-0.5"
          >
            <button
              type="button"
              onClick={() => handleSelectDeviceViewMode('laptop_tab')}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                deviceViewMode === 'laptop_tab'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Laptop className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Laptop / Tab Mode</span>
              <span className="sm:hidden">Laptop/Tab</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectDeviceViewMode('mobile')}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                deviceViewMode === 'mobile'
                  ? 'bg-sky-500 text-slate-950'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>Mobile Mode</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleForceSyncNow}
            title={`Last synced at ${lastSyncedAt}`}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-950/30 px-2.5 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-900/40 transition-colors whitespace-nowrap shrink-0"
          >
            <RefreshCw className="h-3.5 w-3.5 text-emerald-400" />
            <span className="font-mono">Sync v{syncVersion}</span>
          </button>

          {!isMobileMode && (
            <button
              type="button"
              onClick={() => {
                handleToggleLockdownAllDevices(true);
                try {
                  if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
                    document.documentElement.requestFullscreen().catch(() => {});
                  }
                } catch {
                  // Ignore in restricted frames
                }
              }}
              className="rounded-lg bg-amber-500 px-3.5 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-400 transition-colors whitespace-nowrap shrink-0"
            >
              Enter Focus Lockdown
            </button>
          )}

          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            <LogOut className="h-3.5 w-3.5 text-slate-400" />
            <span className="hidden sm:inline">Sign Out ({profile.studentName})</span>
          </button>
        </div>
      </header>

      {/* Main Content Container: Dedicated Mobile Mode (max-w-[480px] Phone Frame) vs Laptop/Tab Mode (max-w-[1360px] Wide Split) */}
      <main
        className={`mx-auto w-full flex-1 transition-all ${
          isMobileMode
            ? 'max-w-[480px] px-3.5 py-4 pb-28 space-y-5 border-x border-slate-800/80 bg-slate-950 shadow-2xl'
            : 'max-w-[1360px] px-6 py-8 space-y-8'
        }`}
      >
        {/* Active Mode & 5-Device Live Sync Status Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800/90 bg-slate-900/70 px-3.5 py-2 text-xs">
          <div className="flex flex-wrap items-center gap-2 text-slate-300">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
            <span className="font-semibold text-white">
              {isMobileMode ? 'Mobile Handheld Layout' : 'Laptop / Tablet Multi-Column Layout'}
            </span>
            <span className="text-slate-500">·</span>
            <span>
              Device:{' '}
              <strong className="text-amber-300">
                {currentDevice?.name} ({currentDevice?.platform})
              </strong>
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
            <span>
              {devices.length}/{MAX_DEVICES_PER_ACCOUNT} Devs Synced
            </span>
            <span>·</span>
            <span className="text-emerald-400">Updated {lastSyncedAt}</span>
          </div>
        </div>

        {/* Global Status Feedback Banner */}
        {statusBanner && (
          <div
            role="status"
            className={`flex items-center justify-between rounded-xl border px-4 py-3 text-xs ${
              statusBanner.tone === 'emerald'
                ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-200'
                : statusBanner.tone === 'rose'
                ? 'border-rose-500/40 bg-rose-950/40 text-rose-200'
                : 'border-amber-500/40 bg-amber-950/30 text-amber-200'
            }`}
          >
            <span>{statusBanner.text}</span>
            <button
              type="button"
              onClick={() => setStatusBanner(null)}
              className="ml-4 underline whitespace-nowrap shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Top KPI Strip (Adapts to 2x2 compact grid in Mobile Mode, 4-col in Laptop/Tab Mode) */}
        <section
          aria-label="Accountability Telemetry Summary"
          className={`grid grid-cols-2 gap-3 rounded-xl border border-slate-800 bg-slate-900/50 ${
            isMobileMode ? 'p-3.5' : 'p-5 lg:grid-cols-4 gap-4'
          }`}
        >
          <div className="space-y-0.5">
            <span className="text-[11px] sm:text-xs text-slate-400">Earned Discipline XP</span>
            <div
              className={`font-mono font-bold text-amber-400 tabular-nums ${
                isMobileMode ? 'text-lg' : 'text-2xl'
              }`}
            >
              {xpPoints.toLocaleString()} XP
            </div>
            <p className="text-[11px] text-slate-500 truncate">
              {profile.studentName} · {profile.classStandard}
            </p>
          </div>

          <div className="space-y-0.5">
            <span className="text-[11px] sm:text-xs text-slate-400">Daily Task Execution</span>
            <div
              className={`font-mono font-bold text-white tabular-nums ${
                isMobileMode ? 'text-lg' : 'text-2xl'
              }`}
            >
              {completedTasksCount} / {tasks.length} Done
            </div>
            <p className="text-[11px] text-slate-500 truncate">
              {tasks.reduce((acc, t) => acc + (t.completed ? 0 : t.points), 0)} XP in queue
            </p>
          </div>

          <div className="space-y-0.5">
            <span className="text-[11px] sm:text-xs text-slate-400">5-Device Lockdown Sync</span>
            <div className="font-display text-sm sm:text-base font-bold text-emerald-400 truncate">
              {devices.length}/{MAX_DEVICES_PER_ACCOUNT} Devs ·{' '}
              {isLockdownActive ? 'LOCKED' : 'Synced'}
            </div>
            <p className="text-[11px] text-slate-500 truncate">
              {homeworkFiles.length} PDFs Mirrored Live
            </p>
          </div>

          <div className="space-y-0.5">
            <span className="text-[11px] sm:text-xs text-slate-400">2-Parent Live Telemetry</span>
            <div
              className={`font-mono font-bold text-slate-100 tabular-nums ${
                isMobileMode ? 'text-lg' : 'text-2xl'
              }`}
            >
              {parents.length}/{MAX_PARENTS_PER_ACCOUNT} Parents
            </div>
            <p className="text-[11px] text-slate-500 truncate">
              {moments.length} moments · {violations.length} alerts
            </p>
          </div>
        </section>

        {activeTab === 'command' && (
          <div className={isMobileMode ? 'space-y-5' : 'space-y-8'}>
            {/* Accountability Partner Directive Strip */}
            <div
              className={`rounded-xl border border-slate-800 bg-slate-900/70 ${
                isMobileMode
                  ? 'p-4 space-y-3'
                  : 'p-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'
              }`}
            >
              <div className="space-y-1.5 max-w-4xl">
                <div className="flex flex-wrap items-center gap-2 text-xs text-amber-400 font-medium">
                  <span>Kai’s Live Directive</span>
                  <span>·</span>
                  <span>{profile.classStandard}</span>
                  <span>·</span>
                  <span>Target: {profile.targetExam}</span>
                  <span>·</span>
                  <span className="text-emerald-400">
                    {devices.length}/5 Devices & {parents.length}/2 Parents Synced
                  </span>
                </div>
                <p className="text-xs sm:text-sm leading-relaxed text-slate-200">
                  {partnerHeadlineNote}
                </p>
                {parentEncouragement && (
                  <p className="text-xs text-emerald-300 pt-1">
                    Live Parent Feed Note: “{parentEncouragement}”
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleAttemptOpenApp('vscode')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    activeBlock?.category === 'coding'
                      ? 'bg-sky-500 text-slate-950 hover:bg-sky-400'
                      : 'border border-slate-800 bg-slate-950 text-slate-400 hover:border-rose-500/40 hover:text-rose-300'
                  }`}
                >
                  <Code2 className="h-3.5 w-3.5" />
                  {activeBlock?.category === 'coding'
                    ? 'Open VS Code'
                    : 'VS Code (Locked)'}
                </button>

                <button
                  type="button"
                  onClick={() => handleAttemptOpenApp('homework_reader')}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 whitespace-nowrap shrink-0"
                >
                  <FileText className="h-3.5 w-3.5 text-amber-400" />
                  PDF Opener ({homeworkFiles.length})
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('devices_parents')}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-sky-300 hover:bg-slate-800 whitespace-nowrap shrink-0"
                >
                  <BookOpen className="h-3.5 w-3.5 text-sky-400" />
                  5 Devices ({devices.length}/5)
                </button>
              </div>
            </div>

            {/* Mobile Mode Sub-Tab Selector (Allows single-thumb switching between To-Do List, Timetable, or Stacked in Mobile Mode) */}
            {isMobileMode && (
              <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-slate-800 bg-slate-900 p-1">
                <button
                  type="button"
                  onClick={() => setMobileCommandSubTab('todo')}
                  className={`rounded-lg py-2 text-xs font-semibold transition-colors ${
                    mobileCommandSubTab === 'todo'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  To-Do ({completedTasksCount}/{tasks.length})
                </button>
                <button
                  type="button"
                  onClick={() => setMobileCommandSubTab('timetable')}
                  className={`rounded-lg py-2 text-xs font-semibold transition-colors ${
                    mobileCommandSubTab === 'timetable'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Timetable ({timetableBlocks.length})
                </button>
                <button
                  type="button"
                  onClick={() => setMobileCommandSubTab('both')}
                  className={`rounded-lg py-2 text-xs font-semibold transition-colors ${
                    mobileCommandSubTab === 'both'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Show Both
                </button>
              </div>
            )}

            {/* Laptop/Tab Mode = 12-Col Side-by-Side Split | Mobile Mode = Single-Column Focused View */}
            <div
              className={
                isMobileMode
                  ? 'grid grid-cols-1 gap-5 items-start'
                  : 'grid grid-cols-1 gap-8 lg:grid-cols-12 items-start'
              }
            >
              {/* Left 6 Cols: Daily To-Do List & Task Creator */}
              {(!isMobileMode ||
                mobileCommandSubTab === 'todo' ||
                mobileCommandSubTab === 'both') && (
                <div className={isMobileMode ? 'space-y-4' : 'lg:col-span-6 space-y-6'}>
                  <div
                    className={`rounded-xl border border-slate-800 bg-slate-900/70 space-y-5 ${
                      isMobileMode ? 'p-4' : 'p-6'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="font-display text-base sm:text-lg font-bold text-white">
                          01. Daily To-Do List ({profile.targetExam})
                        </h2>
                        <p className="text-xs text-slate-400">
                          Synced live across all {devices.length} devices and {parents.length}{' '}
                          registered Parent Accounts.
                        </p>
                      </div>
                    </div>

                    {/* Add Task Form */}
                    <form
                      onSubmit={handleAddTask}
                      className="space-y-3 border-b border-slate-800 pb-5"
                    >
                      {taskFormError && (
                        <p role="alert" className="text-xs text-rose-400">
                          {taskFormError}
                        </p>
                      )}
                      <div>
                        <label
                          htmlFor="new-task-title"
                          className="block text-xs font-medium text-slate-300 mb-1"
                        >
                          Task / Chapter Target
                        </label>
                        <input
                          id="new-task-title"
                          type="text"
                          value={newTaskTitle}
                          onChange={(e) => setNewTaskTitle(e.target.value)}
                          placeholder="e.g., Solve 40 Electrostatics HC Verma Problems"
                          className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
                        />
                      </div>

                      <div
                        className={`grid grid-cols-2 gap-3 ${
                          isMobileMode ? '' : 'sm:grid-cols-4'
                        }`}
                      >
                        <div>
                          <label
                            htmlFor="new-task-subject"
                            className="block text-xs text-slate-400 mb-1"
                          >
                            Subject
                          </label>
                          <select
                            id="new-task-subject"
                            value={newTaskSubject}
                            onChange={(e) => setNewTaskSubject(e.target.value)}
                            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-2 text-xs text-slate-100"
                          >
                            {availableSubjects.map((subj) => (
                              <option key={subj} value={subj}>
                                {subj}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label
                            htmlFor="new-task-category"
                            className="block text-xs text-slate-400 mb-1"
                          >
                            Block Mode
                          </label>
                          <select
                            id="new-task-category"
                            value={newTaskCategory}
                            onChange={(e) =>
                              setNewTaskCategory(e.target.value as Exclude<TaskCategory, 'break'>)
                            }
                            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-2 text-xs text-slate-100"
                          >
                            <option value="study">Study (PDF Opener)</option>
                            <option value="coding">Coding (Unlocks VS Code)</option>
                            <option value="revision">Revision (Formula Deck)</option>
                          </select>
                        </div>

                        <div>
                          <label
                            htmlFor="new-task-duration"
                            className="block text-xs text-slate-400 mb-1"
                          >
                            Duration (mins)
                          </label>
                          <input
                            id="new-task-duration"
                            type="number"
                            min={15}
                            max={180}
                            step={5}
                            value={newTaskDuration}
                            onChange={(e) => setNewTaskDuration(Number(e.target.value))}
                            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-2 font-mono text-xs text-slate-100 tabular-nums"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="new-task-priority"
                            className="block text-xs text-slate-400 mb-1"
                          >
                            Priority
                          </label>
                          <select
                            id="new-task-priority"
                            value={newTaskPriority}
                            onChange={(e) =>
                              setNewTaskPriority(e.target.value as 'critical' | 'high' | 'medium')
                            }
                            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-2 text-xs text-slate-100"
                          >
                            <option value="critical">Critical</option>
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                          </select>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-950 hover:bg-white transition-colors whitespace-nowrap shrink-0"
                      >
                        <Plus className="h-4 w-4" />
                        Add Task & Sync Across 5 Devices
                      </button>
                    </form>

                    {/* Task List Rows */}
                    <div className="divide-y divide-slate-800/80">
                      {tasks.map((task) => (
                        <div
                          key={task.id}
                          className="py-3.5 flex items-start justify-between gap-3 group"
                        >
                          <div className="flex items-start gap-3">
                            <button
                              type="button"
                              aria-label={`Mark "${task.title}" as ${
                                task.completed ? 'incomplete' : 'complete'
                              }`}
                              onClick={() => handleToggleTaskComplete(task.id)}
                              className="mt-0.5 text-slate-400 hover:text-emerald-400 transition-colors"
                            >
                              {task.completed ? (
                                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                              ) : (
                                <Circle className="h-5 w-5" />
                              )}
                            </button>
                            <div className="space-y-1">
                              <p
                                className={`text-sm font-medium ${
                                  task.completed ? 'line-through text-slate-500' : 'text-slate-100'
                                }`}
                              >
                                {task.title}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                                <span>{task.subject}</span>
                                <span>·</span>
                                <span className="font-mono tabular-nums">
                                  {task.durationMinutes} min
                                </span>
                                <span>·</span>
                                <span>
                                  {task.category === 'coding'
                                    ? 'Unlocks VS Code'
                                    : 'PDF Opener Only'}
                                </span>
                                <span>·</span>
                                <span className="font-mono font-semibold text-amber-400 tabular-nums">
                                  +{task.points} XP
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {!task.completed && (
                              <button
                                type="button"
                                aria-label={`Complete "${task.title}"`}
                                onClick={() => handleToggleTaskComplete(task.id)}
                                className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-950/50 whitespace-nowrap shrink-0"
                              >
                                Complete
                              </button>
                            )}
                            <button
                              type="button"
                              aria-label={`Delete "${task.title}"`}
                              onClick={() => handleDeleteTask(task.id)}
                              className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Right 6 Cols: Instruction-Driven AI Timetable & App Permissions */}
              {(!isMobileMode ||
                mobileCommandSubTab === 'timetable' ||
                mobileCommandSubTab === 'both') && (
                <div className={isMobileMode ? 'space-y-4' : 'lg:col-span-6 space-y-6'}>
                  <div
                    className={`rounded-xl border border-slate-800 bg-slate-900/70 space-y-5 ${
                      isMobileMode ? 'p-4' : 'p-6'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="font-display text-base sm:text-lg font-bold text-white">
                          02. Instruction-Driven Timetable & 5-Device App Locks
                        </h2>
                        <p className="text-xs text-slate-400">
                          Tell Kai how to structure your day. Activating Lockdown locks all{' '}
                          {devices.length} registered devices simultaneously.
                        </p>
                      </div>
                    </div>

                    {/* Custom Instructions Box */}
                    <div className="space-y-3 border-b border-slate-800 pb-5">
                      <label
                        htmlFor="timetable-instructions"
                        className="block text-xs font-medium text-slate-300"
                      >
                        Your Timetable Instructions for Kai
                      </label>
                      <textarea
                        id="timetable-instructions"
                        rows={2}
                        value={timetableInstructions}
                        onChange={(e) => setTimetableInstructions(e.target.value)}
                        className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        disabled={isGeneratingSchedule}
                        onClick={handleGenerateTimetable}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-xs font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
                      >
                        <Sparkles className="h-4 w-4" />
                        {isGeneratingSchedule
                          ? 'Building Strict Timetable...'
                          : 'Generate & Sync Timetable Across 5 Devices'}
                      </button>
                    </div>

                    {/* Timetable Schedule Rows */}
                    <div className="space-y-3">
                      {timetableBlocks.map((blk) => {
                        const isActive = blk.status === 'active';
                        const isDone = blk.status === 'completed';
                        const vsCodeUnlocked = blk.allowedApps.includes('vscode');

                        return (
                          <div
                            key={blk.id}
                            className={`rounded-xl border p-4 transition-colors ${
                              isActive
                                ? 'border-amber-500/50 bg-slate-950'
                                : isDone
                                ? 'border-slate-800/60 bg-slate-950/40 opacity-65'
                                : 'border-slate-800 bg-slate-950/70'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="font-mono font-semibold text-amber-400 tabular-nums">
                                    {blk.startTime} – {blk.endTime}
                                  </span>
                                  <span className="text-slate-600">·</span>
                                  <span className="font-medium text-slate-300">
                                    {blk.category.toUpperCase()}
                                  </span>
                                  <span className="text-slate-600">·</span>
                                  <span className="font-mono text-emerald-400 tabular-nums">
                                    +{blk.pointsReward} XP
                                  </span>
                                </div>

                                <h3 className="font-display text-sm font-semibold text-white">
                                  {blk.title}
                                </h3>

                                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 pt-1">
                                  <span className="flex items-center gap-1">
                                    {vsCodeUnlocked ? (
                                      <Unlock className="h-3 w-3 text-sky-400" />
                                    ) : (
                                      <Lock className="h-3 w-3 text-slate-500" />
                                    )}
                                    {vsCodeUnlocked ? 'VS Code Unlocked' : 'VS Code Locked'}
                                  </span>
                                  <span>·</span>
                                  <span className="text-emerald-400">
                                    Mirrored Across All {devices.length} Devices
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {!isActive && !isDone && (
                                  <button
                                    type="button"
                                    aria-label={`Start slot: ${blk.title}`}
                                    onClick={() => handleActivateBlock(blk.id)}
                                    className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 whitespace-nowrap shrink-0"
                                  >
                                    <Play className="h-3 w-3" />
                                    Start Slot Now
                                  </button>
                                )}
                                {isActive && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleToggleLockdownAllDevices(true);
                                      try {
                                        if (
                                          !document.fullscreenElement &&
                                          document.documentElement.requestFullscreen
                                        ) {
                                          document.documentElement
                                            .requestFullscreen()
                                            .catch(() => {});
                                        }
                                      } catch {
                                        // Ignore
                                      }
                                    }}
                                    className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 whitespace-nowrap shrink-0"
                                  >
                                    <Shield className="h-3.5 w-3.5" />
                                    Lock All {devices.length} Devices (5s Cam)
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'lockdown' && (
          <LockdownSessionView
            activeBlock={activeBlock}
            allBlocks={timetableBlocks}
            onActivateBlock={handleActivateBlock}
            isLockdownActive={isLockdownActive}
            onToggleLockdown={handleToggleLockdownAllDevices}
            cameraVerified={cameraVerified}
            onCameraVerifiedChange={handleCameraVerifiedChange}
            violations={violations}
            onLogViolation={logViolation}
            onLaunchAllowedApp={handleAttemptOpenApp}
            onCompleteActiveBlock={handleCompleteActiveBlock}
            homeworkFiles={homeworkFiles}
            onAddHomeworkFile={handleAddSyncedHomeworkFile}
            onOpenHomeworkInReader={(homeworkId) => {
              setSelectedHomeworkId(homeworkId);
              setOpenAppModal('homework_reader');
            }}
          />
        )}

        {activeTab === 'vault' && (
          <HomeworkVaultView
            homeworkFiles={homeworkFiles}
            activeBlock={activeBlock}
            onAddHomeworkFile={handleAddSyncedHomeworkFile}
            onOpenInReader={(homeworkId) => {
              setSelectedHomeworkId(homeworkId);
              setOpenAppModal('homework_reader');
            }}
            onLogViolation={(desc, pts) => logViolation(desc, pts, 'unauthorized_app')}
          />
        )}

        {activeTab === 'devices_parents' && (
          <StudentDevicesView
            profile={profile}
            devices={devices}
            currentDeviceId={currentDeviceId}
            onSwitchActiveDevice={(id) => {
              setCurrentDeviceId(id);
              const dev = devices.find((d) => d.id === id);
              if (dev) {
                const nextMode: DeviceViewMode =
                  dev.platform === 'Mobile' ? 'mobile' : 'laptop_tab';
                handleSelectDeviceViewMode(nextMode);
                setStatusBanner({
                  tone: 'emerald',
                  text: `Switched active device to "${dev.name}" (${
                    nextMode === 'mobile' ? 'Mobile Mode' : 'Laptop / Tab Mode'
                  }). Lockdown (${isLockdownActive ? 'LOCKED' : 'STANDBY'}), ${
                    tasks.length
                  } Tasks, and ${homeworkFiles.length} PDFs are synced.`,
                });
              }
            }}
            onAddDevice={handleAddDevice}
            onRemoveDevice={handleRemoveDevice}
            parents={parents}
            isLockdownActive={isLockdownActive}
            onToggleGlobalLockdown={handleToggleLockdownAllDevices}
            homeworkFiles={homeworkFiles}
            parentEncouragement={parentEncouragement}
            onOpenHomeworkInReader={(homeworkId) => {
              setSelectedHomeworkId(homeworkId);
              setOpenAppModal('homework_reader');
            }}
            deviceViewMode={deviceViewMode}
            onChangeDeviceViewMode={handleSelectDeviceViewMode}
            syncVersion={syncVersion}
            lastSyncedAt={lastSyncedAt}
            onForceSyncNow={handleForceSyncNow}
          />
        )}

        {activeTab === 'partner' && (
          <PartnerCoachView
            messages={partnerMessages}
            onSendMessage={handleSendMessageToPartner}
            tasks={tasks}
            activeBlock={activeBlock}
            xpPoints={xpPoints}
            violations={violations}
            isSending={isSendingChat}
          />
        )}
      </main>

      {/* Dedicated Mobile Mode Bottom Navigation Bar */}
      {isMobileMode && (
        <nav
          aria-label="Mobile Bottom Navigation"
          className="fixed bottom-0 left-0 right-0 z-40 mx-auto max-w-[480px] border-t border-slate-800 bg-slate-950/95 px-2 py-2 backdrop-blur-md shadow-2xl"
        >
          <div className="grid grid-cols-5 gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('command')}
              className={`flex flex-col items-center justify-center rounded-lg py-1.5 text-[11px] font-semibold transition-colors ${
                activeTab === 'command'
                  ? 'bg-amber-500/15 text-amber-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CheckCircle2 className="h-4 w-4 mb-0.5" />
              <span>To-Do</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('lockdown')}
              className={`flex flex-col items-center justify-center rounded-lg py-1.5 text-[11px] font-semibold transition-colors ${
                activeTab === 'lockdown'
                  ? 'bg-amber-500/15 text-amber-400'
                  : isLockdownActive
                  ? 'text-rose-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Shield className="h-4 w-4 mb-0.5" />
              <span>{isLockdownActive ? 'Locked' : 'Lockdown'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('vault')}
              className={`flex flex-col items-center justify-center rounded-lg py-1.5 text-[11px] font-semibold transition-colors ${
                activeTab === 'vault'
                  ? 'bg-amber-500/15 text-amber-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="h-4 w-4 mb-0.5" />
              <span>PDFs ({homeworkFiles.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('devices_parents')}
              className={`flex flex-col items-center justify-center rounded-lg py-1.5 text-[11px] font-semibold transition-colors ${
                activeTab === 'devices_parents'
                  ? 'bg-amber-500/15 text-amber-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Smartphone className="h-4 w-4 mb-0.5" />
              <span>{devices.length}/5 Devs</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('partner')}
              className={`flex flex-col items-center justify-center rounded-lg py-1.5 text-[11px] font-semibold transition-colors ${
                activeTab === 'partner'
                  ? 'bg-amber-500/15 text-amber-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MessageSquare className="h-4 w-4 mb-0.5" />
              <span>Kai</span>
            </button>
          </div>
        </nav>
      )}

      {/* Integrated Apps Modal (Sandboxed VS Code, PDF Opener Studio, Formula Deck) */}
      <IntegratedAppsModal
        openApp={openAppModal}
        onClose={() => setOpenAppModal(null)}
        activeBlock={activeBlock}
        homeworkFiles={homeworkFiles}
        selectedHomeworkId={selectedHomeworkId}
        onSelectHomework={setSelectedHomeworkId}
        onSaveHomeworkNotes={(id, notes) => {
          const nextFiles = homeworkFiles.map((f) => (f.id === id ? { ...f, notes } : f));
          setHomeworkFiles(nextFiles);
          pushCrossDeviceStateSync({ homeworkFiles: nextFiles });
        }}
        onUpdateHomeworkFile={(id, patch) => {
          const nextFiles = homeworkFiles.map((f) => (f.id === id ? { ...f, ...patch } : f));
          setHomeworkFiles(nextFiles);
          pushCrossDeviceStateSync({ homeworkFiles: nextFiles });
        }}
        onAddHomeworkFile={handleAddSyncedHomeworkFile}
        onAwardBonusPoints={(pts, reason) => {
          const nextXp = xpPoints + pts;
          setXpPoints(nextXp);
          const mom = recordStudentMoment('task_complete', `Bonus XP (+${pts}): ${reason}`, pts);
          pushCrossDeviceStateSync({
            xpPoints: nextXp,
            moments: [mom, ...moments.slice(0, 34)],
          });
          setStatusBanner({
            tone: 'emerald',
            text: `+${pts} XP Bonus: ${reason}`,
          });
        }}
      />
    </div>
  );
}
