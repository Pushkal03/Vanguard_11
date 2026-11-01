import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addMinutesToTime,
  evaluateAppAccess,
  evaluateHumanPresenceFromMetrics,
  paginateDocumentContent,
  buildDeterministicTimetable,
  calculateTaskCompletionPoints,
  evaluateDeviceRegistration,
  evaluateParentRegistration,
  buildCustomizedCurriculum,
  RegisteredDevice,
  LinkedParentAccount,
  StudyTask,
  TimetableBlock,
} from './accountabilityEngine';

const sampleTasks: StudyTask[] = [
  {
    id: 't1',
    title: 'Rotational Mechanics - 35 Problems',
    subject: 'Physics (11th Std)',
    category: 'study',
    durationMinutes: 60,
    points: 150,
    completed: false,
    priority: 'critical',
  },
  {
    id: 't2',
    title: 'C++ Dynamic Programming & STL Practice',
    subject: 'Computer Science',
    category: 'coding',
    durationMinutes: 45,
    points: 120,
    completed: false,
    priority: 'high',
  },
];

test('addMinutesToTime computes 24-hour rollovers accurately', () => {
  assert.equal(addMinutesToTime('16:00', 45), '16:45');
  assert.equal(addMinutesToTime('16:45', 30), '17:15');
  assert.equal(addMinutesToTime('23:30', 45), '00:15');
});

test('paginateDocumentContent splits multi-page documents and provides practice page', () => {
  const pages = paginateDocumentContent(
    '--- PAGE 1 ---\nProblem 1\n--- PAGE 2 ---\nProblem 2\n--- PAGE 3 ---\nProblem 3'
  );
  assert.equal(pages.length, 3);
  assert.ok(pages[0].includes('Problem 1'));
  assert.ok(pages[2].includes('Problem 3'));
});

test('evaluateAppAccess strictly locks Visual Studio Code outside coding blocks while keeping PDF opener & file acceptor open', () => {
  const studyBlock: TimetableBlock = {
    id: 'b1',
    startTime: '16:00',
    endTime: '17:00',
    title: 'Rotational Mechanics',
    category: 'study',
    allowedApps: ['homework_uploader', 'homework_reader', 'formula_sheet'],
    pointsReward: 150,
    strictLockdown: true,
    status: 'active',
  };

  const vsCodeDuringStudy = evaluateAppAccess('vscode', studyBlock);
  assert.equal(vsCodeDuringStudy.allowed, false);

  const pdfOpenerDuringStudy = evaluateAppAccess('homework_reader', studyBlock);
  assert.equal(pdfOpenerDuringStudy.allowed, true);

  const uploaderDuringStudy = evaluateAppAccess('homework_uploader', studyBlock);
  assert.equal(uploaderDuringStudy.allowed, true);
});

test('evaluateHumanPresenceFromMetrics respects sensitivity slider and calibrated baseline', () => {
  const covered = evaluateHumanPresenceFromMetrics({
    avgBrightness: 4,
    centerSkinToneRatio: 0,
    centerContrastVariance: 1,
    motionDelta: 0,
  });
  assert.equal(covered.present, false);

  const dimRoomSeated = evaluateHumanPresenceFromMetrics(
    {
      avgBrightness: 35,
      centerSkinToneRatio: 0.04,
      centerContrastVariance: 14,
      motionDelta: 0.5,
      centroidX: 0.52,
      centroidY: 0.48,
    },
    {
      sensitivityThreshold: 45,
      baseline: {
        avgBrightness: 36,
        centerSkinToneRatio: 0.04,
        centerContrastVariance: 15,
      },
    }
  );
  assert.equal(dimRoomSeated.present, true);
  assert.equal(dimRoomSeated.faceLocked, true);
  assert.ok(dimRoomSeated.confidence >= 45);
});

test('buildDeterministicTimetable and calculateTaskCompletionPoints work accurately', () => {
  const blocks = buildDeterministicTimetable(
    sampleTasks,
    'Start at 18:00 and put coding first',
    '16:00'
  );
  assert.equal(blocks.length, 3);
  assert.equal(blocks[0].category, 'coding');

  const perfect = calculateTaskCompletionPoints({
    basePoints: 100,
    cameraVerified: true,
    lockdownActive: true,
    violationCount: 0,
  });
  assert.equal(perfect.netPoints, 135);
});

test('evaluateDeviceRegistration enforces max 5 devices per student account', () => {
  let devices: RegisteredDevice[] = [];
  for (let i = 1; i <= 5; i++) {
    const res = evaluateDeviceRegistration(devices, {
      id: `dev-${i}`,
      name: `Device ${i}`,
      platform: 'Laptop',
      lastActiveAt: '16:00',
      lockdownMirrored: true,
    });
    assert.equal(res.allowed, true);
    devices = res.devices;
  }
  assert.equal(devices.length, 5);

  // 6th device should be blocked
  const sixth = evaluateDeviceRegistration(devices, {
    id: 'dev-6',
    name: 'Unauthorized 6th Device',
    platform: 'Mobile',
    lastActiveAt: '16:05',
    lockdownMirrored: true,
  });
  assert.equal(sixth.allowed, false);
  assert.equal(sixth.devices.length, 5);
});

test('evaluateParentRegistration enforces max 2 parent accounts per student account', () => {
  let parents: LinkedParentAccount[] = [];
  const p1 = evaluateParentRegistration(parents, {
    id: 'parent-1',
    name: 'Parent 1 (Mother)',
    relation: 'Parent 1 (Mother / Father)',
    emailOrHandle: 'mom@example.com',
    linkedAt: '16:00',
    liveNotificationsEnabled: true,
  });
  assert.equal(p1.allowed, true);
  parents = p1.parents;

  const p2 = evaluateParentRegistration(parents, {
    id: 'parent-2',
    name: 'Parent 2 (Father)',
    relation: 'Parent 2 (Co-Parent / Guardian)',
    emailOrHandle: 'dad@example.com',
    linkedAt: '16:02',
    liveNotificationsEnabled: true,
  });
  assert.equal(p2.allowed, true);
  parents = p2.parents;
  assert.equal(parents.length, 2);

  // 3rd parent should be blocked
  const p3 = evaluateParentRegistration(parents, {
    id: 'parent-3',
    name: 'Third Account',
    relation: 'Parent 2 (Co-Parent / Guardian)',
    emailOrHandle: 'third@example.com',
    linkedAt: '16:05',
    liveNotificationsEnabled: true,
  });
  assert.equal(p3.allowed, false);
  assert.equal(p3.parents.length, 2);
});

test('buildCustomizedCurriculum tailors subjects and tasks to Class and Target Exam', () => {
  const neet = buildCustomizedCurriculum('12th Standard', 'NEET UG', 'Aarav');
  assert.ok(neet.subjects.some((s) => s.includes('Biology')));
  assert.ok(neet.partnerHeadline.includes('NEET UG'));

  const jee = buildCustomizedCurriculum('11th Standard', 'JEE Main & Advanced', 'Pushkal');
  assert.ok(jee.subjects.some((s) => s.includes('Mathematics')));
  assert.ok(jee.partnerHeadline.includes('JEE Main & Advanced'));
});
