import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  Unsubscribe,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import {
  ClassStandard,
  HomeworkFile,
  LinkedParentAccount,
  RegisteredDevice,
  StudentActivityMoment,
  TargetExam,
} from '../utils/accountabilityEngine';

export interface FirestoreWorkspacePayload {
  ownerId: string;
  studentName: string;
  classStandard: ClassStandard;
  targetExam: TargetExam;
  pairingCode: string;
  parentIds: string[];
  deviceIds: string[];
  deviceNames: string[];
  isLockdownActive: boolean;
  cameraVerified: boolean;
  cameraConfidence: number;
  xpPoints: number;
  streakDays: number;
  activeBlockTitle: string;
  activeBlockCategory: 'study' | 'coding' | 'break' | 'revision';
  completedTasksCount: number;
  totalTasksCount: number;
  violationsCount: number;
  latestFileTitle: string;
  latestFileSubject: string;
  latestFileContent: string;
  latestMomentText: string;
  parentEncouragement: string;
}

function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128);
  return cleaned || 'default-id';
}

function clampString(val: string, minLen: number, maxLen: number, fallback: string): string {
  const trimmed = (val || '').trim();
  if (trimmed.length < minLen) return fallback.slice(0, maxLen);
  return trimmed.slice(0, maxLen);
}

/**
 * Creates or updates the student's authoritative workspace document in Firestore
 * while strictly adhering to firebase-blueprint.json volumetric constraints.
 */
export async function syncStudentWorkspaceToFirestore(params: {
  workspaceId: string;
  studentName: string;
  classStandard: ClassStandard;
  targetExam: TargetExam;
  pairingCode: string;
  parents: LinkedParentAccount[];
  devices: RegisteredDevice[];
  isLockdownActive: boolean;
  cameraVerified: boolean;
  cameraConfidence: number;
  xpPoints: number;
  streakDays: number;
  activeBlockTitle: string;
  activeBlockCategory: 'study' | 'coding' | 'break' | 'revision';
  completedTasksCount: number;
  totalTasksCount: number;
  violationsCount: number;
  latestFile?: HomeworkFile;
  latestMoment?: StudentActivityMoment;
  parentEncouragement: string;
}): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified) {
    return;
  }

  const safeWorkspaceId = sanitizeId(params.workspaceId);
  if (safeWorkspaceId !== currentUser.uid) {
    return;
  }

  const path = `workspaces/${safeWorkspaceId}`;
  const docRef = doc(db, 'workspaces', safeWorkspaceId);

  const parentIds = params.parents
    .slice(0, 2)
    .map((p) => sanitizeId(p.id));
  const deviceIds = params.devices
    .slice(0, 5)
    .map((d) => sanitizeId(d.id));
  const deviceNames = params.devices
    .slice(0, 5)
    .map((d) => clampString(d.name, 1, 80, 'Student Device'));

  const basePayload: FirestoreWorkspacePayload = {
    ownerId: currentUser.uid,
    studentName: clampString(params.studentName, 1, 80, 'Scholar'),
    classStandard: params.classStandard,
    targetExam: params.targetExam,
    pairingCode: sanitizeId(params.pairingCode).slice(0, 16) || 'V11-SYNC',
    parentIds,
    deviceIds,
    deviceNames,
    isLockdownActive: Boolean(params.isLockdownActive),
    cameraVerified: Boolean(params.cameraVerified),
    cameraConfidence: Math.min(100, Math.max(0, Math.round(params.cameraConfidence))),
    xpPoints: Math.min(1000000, Math.max(0, Math.round(params.xpPoints))),
    streakDays: Math.min(3650, Math.max(0, Math.round(params.streakDays))),
    activeBlockTitle: clampString(params.activeBlockTitle, 1, 160, 'Focused Study Block'),
    activeBlockCategory: params.activeBlockCategory || 'study',
    completedTasksCount: Math.min(500, Math.max(0, params.completedTasksCount)),
    totalTasksCount: Math.min(500, Math.max(0, params.totalTasksCount)),
    violationsCount: Math.min(10000, Math.max(0, params.violationsCount)),
    latestFileTitle: clampString(
      params.latestFile?.name || 'Physics_Ch7_Rotational_Mechanics_Sheet.pdf',
      1,
      160,
      'Study_Sheet.pdf'
    ),
    latestFileSubject: clampString(
      params.latestFile?.subject || 'Physics (11th Std)',
      1,
      80,
      'Physics'
    ),
    latestFileContent: clampString(
      params.latestFile?.contentPreview || 'Study worksheet synced across all 5 devices.',
      1,
      8000,
      'Study worksheet content.'
    ),
    latestMomentText: clampString(
      params.latestMoment?.summary || 'Workspace initialized and synced across devices.',
      1,
      300,
      'Workspace active.'
    ),
    parentEncouragement: (params.parentEncouragement || '').slice(0, 300),
  };

  try {
    const existingSnap = await getDoc(docRef);
    if (!existingSnap.exists()) {
      await setDoc(docRef, {
        ...basePayload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const { ownerId: _omitOwner, ...updateFields } = basePayload;
      await updateDoc(docRef, {
        ...updateFields,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Records an individual student moment in /workspaces/{workspaceId}/moments/{momentId}
 */
export async function recordStudentMomentToFirestore(
  workspaceId: string,
  moment: StudentActivityMoment
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified) {
    return;
  }

  const safeWorkspaceId = sanitizeId(workspaceId);
  const safeMomentId = sanitizeId(moment.id);
  const path = `workspaces/${safeWorkspaceId}/moments/${safeMomentId}`;

  try {
    await setDoc(doc(db, 'workspaces', safeWorkspaceId, 'moments', safeMomentId), {
      workspaceId: safeWorkspaceId,
      authorId: currentUser.uid,
      eventType: moment.eventType,
      summary: clampString(moment.summary, 1, 300, 'Student activity recorded.'),
      deviceLabel: clampString(moment.deviceLabel, 1, 80, 'Primary Laptop'),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Records an uploaded PDF or homework file to /workspaces/{workspaceId}/files/{fileId}
 */
export async function syncHomeworkFileToFirestore(
  workspaceId: string,
  file: HomeworkFile
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified) {
    return;
  }

  const safeWorkspaceId = sanitizeId(workspaceId);
  const safeFileId = sanitizeId(file.id);
  const path = `workspaces/${safeWorkspaceId}/files/${safeFileId}`;

  try {
    await setDoc(doc(db, 'workspaces', safeWorkspaceId, 'files', safeFileId), {
      workspaceId: safeWorkspaceId,
      ownerId: currentUser.uid,
      name: clampString(file.name, 1, 160, 'Homework.pdf'),
      subject: clampString(file.subject, 1, 80, 'Physics'),
      sizeLabel: clampString(file.sizeLabel, 1, 40, '100 KB'),
      contentPreview: clampString(file.contentPreview, 1, 9000, 'Uploaded study document.'),
      notes: (file.notes || '').slice(0, 4000),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Subscribes to real-time updates on /workspaces/{workspaceId}
 */
export function subscribeToStudentWorkspace(
  workspaceId: string,
  onUpdate: (data: FirestoreWorkspacePayload) => void
): Unsubscribe | null {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified) {
    return null;
  }

  const safeWorkspaceId = sanitizeId(workspaceId);
  const path = `workspaces/${safeWorkspaceId}`;

  return onSnapshot(
    doc(db, 'workspaces', safeWorkspaceId),
    (snapshot) => {
      if (snapshot.exists()) {
        onUpdate(snapshot.data() as FirestoreWorkspacePayload);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}
