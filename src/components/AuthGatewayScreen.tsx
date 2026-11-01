import React, { useState } from 'react';
import {
  Shield,
  GraduationCap,
  Users,
  Laptop,
  Smartphone,
  LogIn,
  UserPlus,
  CheckCircle2,
  Lock,
  Camera,
  FileText,
  Sparkles,
} from 'lucide-react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import {
  buildCustomizedCurriculum,
  buildDeterministicTimetable,
  ClassStandard,
  LinkedParentAccount,
  MAX_DEVICES_PER_ACCOUNT,
  MAX_PARENTS_PER_ACCOUNT,
  RegisteredDevice,
  StudentActivityMoment,
  StudentProfile,
  TargetExam,
} from '../utils/accountabilityEngine';

export type DeviceViewMode = 'mobile' | 'laptop_tab';

export interface AuthenticatedStudentPayload {
  role: 'student';
  profile: StudentProfile;
  studyStartTime: string;
  currentDeviceId: string;
  devices: RegisteredDevice[];
  parents: LinkedParentAccount[];
  moments?: StudentActivityMoment[];
  roomState?: any;
  preferredViewMode?: DeviceViewMode;
}

export interface AuthenticatedParentPayload {
  role: 'parent';
  parentAccount: LinkedParentAccount;
  pairingCode: string;
  roomState: any;
  preferredViewMode?: DeviceViewMode;
}

interface AuthGatewayScreenProps {
  onAuthenticatedStudent: (payload: AuthenticatedStudentPayload) => void;
  onAuthenticatedParent: (payload: AuthenticatedParentPayload) => void;
  deviceViewMode: DeviceViewMode;
  onChangeDeviceViewMode: (mode: DeviceViewMode) => void;
}

const CLASS_OPTIONS: ClassStandard[] = [
  '10th Standard',
  '11th Standard',
  '12th Standard',
  'Dropper / Gap Year',
];

const EXAM_OPTIONS: TargetExam[] = [
  'JEE Main & Advanced',
  'NEET UG',
  'BITSAT & Olympiads',
  'Computer Science & SAT',
  'Board Exams Excellence',
];

const PLATFORM_OPTIONS: RegisteredDevice['platform'][] = [
  'Laptop',
  'Desktop',
  'Tablet',
  'Mobile',
  'Workstation',
];

export const AuthGatewayScreen: React.FC<AuthGatewayScreenProps> = ({
  onAuthenticatedStudent,
  onAuthenticatedParent,
  deviceViewMode,
  onChangeDeviceViewMode,
}) => {
  // Top-level portal role: Student Device vs Parent Device
  const [portalRole, setPortalRole] = useState<'student' | 'parent'>('student');
  // Student sub-mode: 'signup' (New Student Account Setup) vs 'signin' (Returning Student / 2nd-5th Device)
  const [studentMode, setStudentMode] = useState<'signup' | 'signin'>('signup');

  // Student Sign Up State
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [classStandard, setClassStandard] = useState<ClassStandard>('11th Standard');
  const [targetExam, setTargetExam] = useState<TargetExam>('JEE Main & Advanced');
  const [dailyGoalHours, setDailyGoalHours] = useState<number>(8);
  const [studyStartTime, setStudyStartTime] = useState<string>('16:00');
  const [deviceName, setDeviceName] = useState('Primary Study Laptop');
  const [devicePlatform, setDevicePlatform] = useState<RegisteredDevice['platform']>('Laptop');
  const [parent1Name, setParent1Name] = useState('');
  const [parent1Email, setParent1Email] = useState('');
  const [parent2Name, setParent2Name] = useState('');
  const [parent2Email, setParent2Email] = useState('');

  // Student Sign In (Existing Account / Multi-Device Slot 2..5)
  const [signInIdentifier, setSignInIdentifier] = useState('');
  const [signInDeviceName, setSignInDeviceName] = useState('Study Tablet / 2nd Device');
  const [signInDevicePlatform, setSignInDevicePlatform] =
    useState<RegisteredDevice['platform']>('Tablet');

  // Parent Sign In State (Separate Parent Device)
  const [parentFullName, setParentFullName] = useState('');
  const [parentLoginEmail, setParentLoginEmail] = useState('');
  const [parentRelation, setParentRelation] = useState<LinkedParentAccount['relation']>(
    'Parent 1 (Mother / Father)'
  );
  const [studentCodeOrEmail, setStudentCodeOrEmail] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGoogleFill = async () => {
    setErrorMessage(null);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const user = cred.user;
      if (portalRole === 'student') {
        if (studentMode === 'signup') {
          if (user.displayName) setStudentName(user.displayName);
          if (user.email) setStudentEmail(user.email);
        } else {
          if (user.email) setSignInIdentifier(user.email);
        }
      } else {
        if (user.displayName) setParentFullName(user.displayName);
        if (user.email) setParentLoginEmail(user.email);
      }
    } catch {
      setErrorMessage(
        'Google popup could not complete inside the embedded frame. Please enter your details directly below.'
      );
    }
  };

  const handleStudentSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!studentName.trim()) {
      setErrorMessage('Please enter your Full Name to customize your student workspace.');
      return;
    }
    if (!studentEmail.trim()) {
      setErrorMessage('Please enter your Student Email address.');
      return;
    }

    setIsSubmitting(true);
    const customized = buildCustomizedCurriculum(
      classStandard,
      targetExam,
      studentName.trim()
    );
    const start = studyStartTime || '16:00';
    const customInstructions = `Start at ${start}. Schedule high-priority ${targetExam} subjects first, insert 15-min breaks to upload homework files, and unlock Visual Studio Code strictly during coding slots.`;
    const initialBlocks = buildDeterministicTimetable(
      customized.tasks,
      customInstructions,
      start
    );
    const preferredMode: DeviceViewMode =
      devicePlatform === 'Mobile' ? 'mobile' : deviceViewMode;

    try {
      const res = await fetch('/api/auth/student-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: studentName.trim(),
          studentEmail: studentEmail.trim(),
          email: studentEmail.trim(),
          classStandard,
          targetExam,
          dailyGoalHours: Number(dailyGoalHours) || 8,
          studyStartTime: start,
          deviceName: deviceName.trim() || (devicePlatform === 'Mobile' ? 'Student Mobile Phone' : 'Primary Study Laptop'),
          devicePlatform,
          parent1Name: parent1Name.trim(),
          parent1Email: parent1Email.trim(),
          parent2Name: parent2Name.trim(),
          parent2Email: parent2Email.trim(),
          initialTasks: customized.tasks,
          initialBlocks,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErrorMessage(data.error || 'Unable to create student account.');
        return;
      }

      const room = data.state || data.room;
      onAuthenticatedStudent({
        role: 'student',
        profile: {
          uid: `student-${room.pairingCode.toLowerCase()}`,
          studentName: room.studentName,
          email: room.studentEmail,
          classStandard: room.classStandard,
          targetExam: room.targetExam,
          dailyGoalHours: room.dailyGoalHours,
          pairingCode: room.pairingCode,
          onboarded: true,
        },
        studyStartTime: room.studyStartTime || '16:00',
        currentDeviceId: data.device.id,
        devices: room.devices,
        parents: room.parents || [],
        moments: room.moments || [],
        roomState: room,
        preferredViewMode: preferredMode,
      });
    } catch {
      // Fallback local creation if offline
      const generatedCode = `V11-${Math.floor(100 + Math.random() * 899)}`;
      const fallbackDevice: RegisteredDevice = {
        id: `dev-${Date.now()}`,
        name: deviceName.trim() || 'Primary Study Laptop',
        platform: devicePlatform,
        lastActiveAt: 'Live Now',
        isCurrentDevice: true,
        lockdownMirrored: true,
      };
      const fallbackParents: LinkedParentAccount[] = [];
      if (parent1Name.trim() || parent1Email.trim()) {
        fallbackParents.push({
          id: 'parent-1',
          name: parent1Name.trim() || 'Parent 1 (Mother / Father)',
          relation: 'Parent 1 (Mother / Father)',
          emailOrHandle: parent1Email.trim() || 'parent1@family.org',
          linkedAt: 'Authorized',
          liveNotificationsEnabled: true,
        });
      }
      if (parent2Name.trim() || parent2Email.trim()) {
        fallbackParents.push({
          id: 'parent-2',
          name: parent2Name.trim() || 'Parent 2 (Co-Parent / Guardian)',
          relation: 'Parent 2 (Co-Parent / Guardian)',
          emailOrHandle: parent2Email.trim() || 'parent2@family.org',
          linkedAt: 'Authorized',
          liveNotificationsEnabled: true,
        });
      }
      onAuthenticatedStudent({
        role: 'student',
        profile: {
          uid: `student-${generatedCode.toLowerCase()}`,
          studentName: studentName.trim(),
          email: studentEmail.trim(),
          classStandard,
          targetExam,
          dailyGoalHours: Number(dailyGoalHours) || 8,
          pairingCode: generatedCode,
          onboarded: true,
        },
        studyStartTime: studyStartTime || '16:00',
        currentDeviceId: fallbackDevice.id,
        devices: [fallbackDevice],
        parents: fallbackParents,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStudentSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!signInIdentifier.trim()) {
      setErrorMessage('Enter your registered Student Email or Account Pairing Code (e.g., V11-942).');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/student-signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: signInIdentifier.trim(),
          deviceName: signInDeviceName.trim() || 'Secondary Study Device',
          devicePlatform: signInDevicePlatform,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErrorMessage(
          data.error ||
            'Could not sign in to student account. Check your email/code or 5-device limit.'
        );
        return;
      }

      const room = data.state || data.room;
      const preferredMode: DeviceViewMode =
        signInDevicePlatform === 'Mobile' ? 'mobile' : deviceViewMode;
      onAuthenticatedStudent({
        role: 'student',
        profile: {
          uid: `student-${room.pairingCode.toLowerCase()}`,
          studentName: room.studentName,
          email: room.studentEmail,
          classStandard: room.classStandard,
          targetExam: room.targetExam,
          dailyGoalHours: room.dailyGoalHours || 8,
          pairingCode: room.pairingCode,
          onboarded: true,
        },
        studyStartTime: room.studyStartTime || '16:00',
        currentDeviceId: data.device.id,
        devices: room.devices,
        parents: room.parents || [],
        moments: room.moments || [],
        roomState: room,
        preferredViewMode: preferredMode,
      });
    } catch {
      setErrorMessage('Unable to reach authentication server. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleParentSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!parentFullName.trim() || !parentLoginEmail.trim()) {
      setErrorMessage('Please enter your Parent Name and Parent Email.');
      return;
    }
    if (!studentCodeOrEmail.trim()) {
      setErrorMessage(
        "Please enter your child's Student Pairing Code (e.g., V11-942) or registered Student Email."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/parent-signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentIdentifier: studentCodeOrEmail.trim(),
          parentName: parentFullName.trim(),
          parentEmail: parentLoginEmail.trim(),
          relation: parentRelation,
        }),
      });
      const data = await res.json();
      const room = data.state || data.room;
      const parentAccount = data.parent || data.parentAccount;
      if (!res.ok || !data.ok || !room || !parentAccount) {
        setErrorMessage(
          data.error ||
            'Unable to link Parent Account. Verify the Student Pairing Code or 2-Parent limit.'
        );
        return;
      }

      onAuthenticatedParent({
        role: 'parent',
        parentAccount,
        pairingCode: room.pairingCode,
        roomState: room,
        preferredViewMode: deviceViewMode,
      });
    } catch {
      setErrorMessage('Unable to connect to Parent Telemetry Gateway. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Top Bar with Dedicated Mobile vs Laptop/Tab Mode Switcher */}
      <header className="border-b border-slate-800 bg-slate-950/90 px-4 sm:px-6 py-3.5 sticky top-0 z-30 backdrop-blur-xs">
        <div className="mx-auto max-w-[1360px] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="font-display text-lg font-bold tracking-tight text-white">
              Vanguard 11
            </span>
            <span className="hidden sm:inline text-slate-600">·</span>
            <span className="hidden sm:inline text-xs text-slate-400">
              5-Device Real-Time Sync & 2-Parent Live Telemetry
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Explicit Mobile Mode vs Laptop/Tab Mode Switcher */}
            <div
              role="group"
              aria-label="Select Device Layout Mode"
              className="flex items-center rounded-lg border border-slate-800 bg-slate-900 p-1 text-xs"
            >
              <button
                type="button"
                onClick={() => {
                  onChangeDeviceViewMode('laptop_tab');
                  if (devicePlatform === 'Mobile') setDevicePlatform('Laptop');
                  if (signInDevicePlatform === 'Mobile') setSignInDevicePlatform('Tablet');
                }}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-semibold transition-colors ${
                  deviceViewMode === 'laptop_tab'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Laptop className="h-3.5 w-3.5" />
                <span>Laptop / Tab Mode</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onChangeDeviceViewMode('mobile');
                  setDevicePlatform('Mobile');
                  setDeviceName('Mobile Companion Phone');
                  setSignInDevicePlatform('Mobile');
                  setSignInDeviceName('Mobile Study Phone');
                }}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-semibold transition-colors ${
                  deviceViewMode === 'mobile'
                    ? 'bg-sky-500 text-slate-950'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" />
                <span>Mobile Mode</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Split or Mobile Auth Gateway */}
      <main
        className={`mx-auto w-full flex-1 px-4 sm:px-6 py-6 sm:py-10 ${
          deviceViewMode === 'mobile'
            ? 'max-w-[460px] flex flex-col gap-6'
            : 'max-w-[1360px] grid grid-cols-1 lg:grid-cols-12 gap-10 items-start'
        }`}
      >
        {/* Left 5 Columns: Platform Value Proposition (Compact in Mobile Mode, Full in Laptop/Tab Mode) */}
        <div
          className={
            deviceViewMode === 'mobile'
              ? 'space-y-3 rounded-xl border border-sky-500/30 bg-slate-900/70 p-4'
              : 'lg:col-span-5 space-y-6 lg:sticky lg:top-20'
          }
        >
          <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-amber-400">
              Built for Serious Scholars & Families
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
              Your AI Accountability Partner Across All 5 Devices.
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Sign up as a <strong className="text-white">Student</strong> to customize your workspace
              around your exact Class, Target Examination, and daily study schedule—or sign in on a
              separate <strong className="text-sky-300">Parent Device</strong> to monitor every live
              study moment, Lockdown status, and completed task in real time.
            </p>
          </div>

          {/* Strict Device Separation Notice */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 space-y-4">
            <h2 className="font-display text-sm font-bold text-white flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-400" />
              Strict Student vs. Parent Device Separation
            </h2>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="flex items-start gap-2.5">
                <GraduationCap className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-white">Student Devices (Up to 5):</span> Customizes
                  subjects, daily To-Do list, instruction-driven timetable, VS Code coding locks,
                  5-second webcam monitor, and PDF Opener Studio. Student devices{' '}
                  <span className="text-amber-300 font-medium">cannot access the Parent Screen</span>.
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Lock className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-white">Instant 5-Device Lockdown & File Sync:</span>{' '}
                  When Lockdown Mode triggers or a PDF homework file is uploaded on one student device,
                  all other connected student devices lock and mirror the file automatically.
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Users className="h-4 w-4 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-white">Dedicated Parent Devices (Up to 2):</span>{' '}
                  Parents sign in on their own device using their child’s Pairing Code to view live
                  camera presence, Lockdown state, uploaded PDFs, violations, and send encouragements.
                </div>
              </div>
            </div>
          </div>

          {/* Feature Checklist */}
          <div className="grid grid-cols-2 gap-3 text-xs text-slate-400">
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-3.5 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-200 font-semibold">
                <Camera className="h-3.5 w-3.5 text-emerald-400" />
                5s Webcam Presence
              </div>
              <p>Real-time posture & desk presence verification every 5 seconds.</p>
            </div>
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-3.5 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-200 font-semibold">
                <FileText className="h-3.5 w-3.5 text-amber-400" />
                Visual PDF Opener
              </div>
              <p>Read, zoom, search, highlight, and annotate study PDFs in Lockdown.</p>
            </div>
          </div>
        </div>

        {/* Right 7 Columns: Role Switcher + Dedicated Sign Up / Sign In Forms */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 space-y-6 shadow-2xl">
          {/* Primary Role Selector: Student Device vs Parent Device */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Step 1 · Select Who Is Using This Device
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setPortalRole('student');
                  setErrorMessage(null);
                }}
                className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
                  portalRole === 'student'
                    ? 'border-amber-500 bg-amber-950/25 text-white'
                    : 'border-slate-800 bg-slate-950/70 text-slate-400 hover:border-slate-700'
                }`}
              >
                <GraduationCap
                  className={`h-5 w-5 shrink-0 mt-0.5 ${
                    portalRole === 'student' ? 'text-amber-400' : 'text-slate-500'
                  }`}
                />
                <div>
                  <div className="font-display text-sm font-bold text-white">
                    I am a Student (Student Device)
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Sign up to customize your Class & Exam or sign in on up to 5 synced study devices.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPortalRole('parent');
                  setErrorMessage(null);
                }}
                className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
                  portalRole === 'parent'
                    ? 'border-sky-500 bg-sky-950/25 text-white'
                    : 'border-slate-800 bg-slate-950/70 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Users
                  className={`h-5 w-5 shrink-0 mt-0.5 ${
                    portalRole === 'parent' ? 'text-sky-400' : 'text-slate-500'
                  }`}
                />
                <div>
                  <div className="font-display text-sm font-bold text-white">
                    I am a Parent (Parent Device)
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Sign in on a dedicated Parent Device to view your child’s live study updates & moments.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="rounded-xl border border-rose-500/40 bg-rose-950/40 px-4 py-3 text-xs text-rose-200"
            >
              {errorMessage}
            </div>
          )}

          {/* ==================== STUDENT PORTAL AUTHENTICATION ==================== */}
          {portalRole === 'student' && (
            <div className="space-y-6">
              {/* Sub-tabs: New Student Sign Up vs Returning Student Sign In */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setStudentMode('signup');
                      setErrorMessage(null);
                    }}
                    className={`flex items-center gap-1.5 text-xs sm:text-sm font-semibold pb-1 transition-colors ${
                      studentMode === 'signup'
                        ? 'text-amber-400 underline underline-offset-8 decoration-amber-400 decoration-2'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <UserPlus className="h-4 w-4" />
                    New Student Sign Up & Academic Setup
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStudentMode('signin');
                      setErrorMessage(null);
                    }}
                    className={`flex items-center gap-1.5 text-xs sm:text-sm font-semibold pb-1 transition-colors ${
                      studentMode === 'signin'
                        ? 'text-amber-400 underline underline-offset-8 decoration-amber-400 decoration-2'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <LogIn className="h-4 w-4" />
                    Returning Student Sign In (Add 2nd–5th Device)
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleFill}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                >
                  Auto-Fill with Google
                </button>
              </div>

              {studentMode === 'signup' ? (
                <form onSubmit={handleStudentSignUp} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="signup-student-name"
                        className="block text-xs font-medium text-slate-300 mb-1"
                      >
                        Student Full Name *
                      </label>
                      <input
                        id="signup-student-name"
                        type="text"
                        required
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        placeholder="e.g., Aarav Sharma"
                        className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="signup-student-email"
                        className="block text-xs font-medium text-slate-300 mb-1"
                      >
                        Student Email Address *
                      </label>
                      <input
                        id="signup-student-email"
                        type="email"
                        required
                        value={studentEmail}
                        onChange={(e) => setStudentEmail(e.target.value)}
                        placeholder="e.g., aarav.scholar@gmail.com"
                        className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Academic Customization Details */}
                  <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5" />
                        Academic Customization (Tailors Subjects, Tasks, Formula Deck & Kai Coach)
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="signup-class-standard"
                          className="block text-xs font-medium text-slate-300 mb-1"
                        >
                          Which Class / Standard Are You In? *
                        </label>
                        <select
                          id="signup-class-standard"
                          value={classStandard}
                          onChange={(e) => setClassStandard(e.target.value as ClassStandard)}
                          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5 text-xs text-slate-100"
                        >
                          {CLASS_OPTIONS.map((cls) => (
                            <option key={cls} value={cls}>
                              {cls}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="signup-target-exam"
                          className="block text-xs font-medium text-slate-300 mb-1"
                        >
                          Target Competitive Examination *
                        </label>
                        <select
                          id="signup-target-exam"
                          value={targetExam}
                          onChange={(e) => setTargetExam(e.target.value as TargetExam)}
                          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5 text-xs text-slate-100"
                        >
                          {EXAM_OPTIONS.map((ex) => (
                            <option key={ex} value={ex}>
                              {ex}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="signup-goal-hours"
                          className="block text-xs font-medium text-slate-300 mb-1"
                        >
                          Daily Committed Study Hours
                        </label>
                        <input
                          id="signup-goal-hours"
                          type="number"
                          min={2}
                          max={16}
                          value={dailyGoalHours}
                          onChange={(e) => setDailyGoalHours(Number(e.target.value))}
                          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-mono text-slate-100 tabular-nums"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="signup-start-time"
                          className="block text-xs font-medium text-slate-300 mb-1"
                        >
                          Preferred Daily Timetable Start Time
                        </label>
                        <input
                          id="signup-start-time"
                          type="text"
                          value={studyStartTime}
                          onChange={(e) => setStudyStartTime(e.target.value)}
                          placeholder="16:00"
                          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-mono text-slate-100 tabular-nums"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Device Slot #1 Registration */}
                  <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-3">
                    <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                      <Laptop className="h-3.5 w-3.5" />
                      This Student Device Registration (Slot 1 of {MAX_DEVICES_PER_ACCOUNT})
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="signup-device-name"
                          className="block text-xs text-slate-400 mb-1"
                        >
                          This Device Name
                        </label>
                        <input
                          id="signup-device-name"
                          type="text"
                          value={deviceName}
                          onChange={(e) => setDeviceName(e.target.value)}
                          placeholder="e.g., Primary Study Laptop"
                          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-100"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="signup-device-platform"
                          className="block text-xs text-slate-400 mb-1"
                        >
                          Device Form Factor
                        </label>
                        <select
                          id="signup-device-platform"
                          value={devicePlatform}
                          onChange={(e) => {
                            const nextPlat = e.target.value as RegisteredDevice['platform'];
                            setDevicePlatform(nextPlat);
                            if (nextPlat === 'Mobile') {
                              onChangeDeviceViewMode('mobile');
                            } else {
                              onChangeDeviceViewMode('laptop_tab');
                            }
                          }}
                          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-100"
                        >
                          {PLATFORM_OPTIONS.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Optional Pre-Authorized Parent Accounts (Max 2) */}
                  <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-3">
                    <div>
                      <span className="text-xs font-semibold text-sky-400">
                        Optional: Pre-Authorize Up to {MAX_PARENTS_PER_ACCOUNT} Parent Accounts
                      </span>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Your parents will sign in on their own separate devices using your generated
                        Pairing Code or your Student Email.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={parent1Name}
                        onChange={(e) => setParent1Name(e.target.value)}
                        placeholder="Parent #1 Name (e.g., Mother / Father)"
                        className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-100"
                      />
                      <input
                        type="email"
                        value={parent1Email}
                        onChange={(e) => setParent1Email(e.target.value)}
                        placeholder="Parent #1 Email"
                        className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-100"
                      />
                      <input
                        type="text"
                        value={parent2Name}
                        onChange={(e) => setParent2Name(e.target.value)}
                        placeholder="Parent #2 Name (Optional)"
                        className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-100"
                      />
                      <input
                        type="email"
                        value={parent2Email}
                        onChange={(e) => setParent2Email(e.target.value)}
                        placeholder="Parent #2 Email (Optional)"
                        className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-100"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-xs sm:text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-50 transition-colors"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {isSubmitting
                      ? 'Creating Customized Student Workspace...'
                      : 'Create Student Account & Launch Customized Workspace'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleStudentSignIn} className="space-y-5">
                  <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-2 text-xs text-slate-300">
                    <p>
                      Sign in to your existing Student Account on this device (supports up to{' '}
                      <strong className="text-white">{MAX_DEVICES_PER_ACCOUNT} devices</strong> per
                      student). Once signed in, any Lockdown Mode or uploaded PDF on one device
                      automatically locks and syncs across all your devices.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="text-slate-400">Have an existing demo account?</span>
                      <button
                        type="button"
                        onClick={() => setSignInIdentifier('V11-942')}
                        className="underline text-amber-400 hover:text-amber-300 font-mono"
                      >
                        Use Demo Student Code: V11-942
                      </button>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="signin-student-id"
                      className="block text-xs font-medium text-slate-300 mb-1"
                    >
                      Registered Student Email or Account Pairing Code *
                    </label>
                    <input
                      id="signin-student-id"
                      type="text"
                      required
                      value={signInIdentifier}
                      onChange={(e) => setSignInIdentifier(e.target.value)}
                      placeholder="e.g., V11-942 or your registered student email"
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="signin-device-name"
                        className="block text-xs font-medium text-slate-300 mb-1"
                      >
                        This Device Name (Slot 1–5) *
                      </label>
                      <input
                        id="signin-device-name"
                        type="text"
                        required
                        value={signInDeviceName}
                        onChange={(e) => setSignInDeviceName(e.target.value)}
                        placeholder="e.g., Study Tablet / Desktop PC"
                        className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-slate-100"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="signin-device-platform"
                        className="block text-xs font-medium text-slate-300 mb-1"
                      >
                        This Device Platform
                      </label>
                      <select
                        id="signin-device-platform"
                        value={signInDevicePlatform}
                        onChange={(e) => {
                          const nextPlat = e.target.value as RegisteredDevice['platform'];
                          setSignInDevicePlatform(nextPlat);
                          if (nextPlat === 'Mobile') {
                            onChangeDeviceViewMode('mobile');
                          } else {
                            onChangeDeviceViewMode('laptop_tab');
                          }
                        }}
                        className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-slate-100"
                      >
                        {PLATFORM_OPTIONS.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-xs sm:text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-50 transition-colors"
                  >
                    <LogIn className="h-4 w-4" />
                    {isSubmitting
                      ? 'Syncing Student Device...'
                      : 'Sign In & Sync This Student Device'}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ==================== PARENT PORTAL AUTHENTICATION (SEPARATE DEVICE) ==================== */}
          {portalRole === 'parent' && (
            <form onSubmit={handleParentSignIn} className="space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h2 className="font-display text-base font-bold text-white">
                    Parent Account Sign In / Registration (Max {MAX_PARENTS_PER_ACCOUNT} Parents per Student)
                  </h2>
                  <p className="text-xs text-slate-400">
                    Opens the dedicated Parent Live Telemetry Screen for your child’s account.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleGoogleFill}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                >
                  Auto-Fill with Google
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="parent-signin-name"
                    className="block text-xs font-medium text-slate-300 mb-1"
                  >
                    Your Parent Full Name *
                  </label>
                  <input
                    id="parent-signin-name"
                    type="text"
                    required
                    value={parentFullName}
                    onChange={(e) => setParentFullName(e.target.value)}
                    placeholder="e.g., Rajesh Sharma (Father)"
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-slate-100 focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="parent-signin-email"
                    className="block text-xs font-medium text-slate-300 mb-1"
                  >
                    Your Parent Email Address *
                  </label>
                  <input
                    id="parent-signin-email"
                    type="email"
                    required
                    value={parentLoginEmail}
                    onChange={(e) => setParentLoginEmail(e.target.value)}
                    placeholder="e.g., parent1.guardian@gmail.com"
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-slate-100 focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="parent-signin-relation"
                    className="block text-xs font-medium text-slate-300 mb-1"
                  >
                    Parent Account Slot (1 or 2)
                  </label>
                  <select
                    id="parent-signin-relation"
                    value={parentRelation}
                    onChange={(e) =>
                      setParentRelation(e.target.value as LinkedParentAccount['relation'])
                    }
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-slate-100"
                  >
                    <option value="Parent 1 (Mother / Father)">
                      Parent Account #1 (Mother / Father)
                    </option>
                    <option value="Parent 2 (Co-Parent / Guardian)">
                      Parent Account #2 (Co-Parent / Guardian)
                    </option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="parent-student-code"
                    className="block text-xs font-medium text-slate-300 mb-1"
                  >
                    Student’s Pairing Code or Registered Student Email *
                  </label>
                  <input
                    id="parent-student-code"
                    type="text"
                    required
                    value={studentCodeOrEmail}
                    onChange={(e) => setStudentCodeOrEmail(e.target.value)}
                    placeholder="e.g., V11-942 or student email"
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs font-mono text-slate-100 focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                <span>
                  Want to preview a live student stream immediately? Use Pairing Code{' '}
                  <strong className="font-mono text-sky-300">V11-942</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (!parentFullName) setParentFullName('Parent 1 (Mother)');
                    if (!parentLoginEmail) setParentLoginEmail('parent1.guardian@gmail.com');
                    setStudentCodeOrEmail('V11-942');
                  }}
                  className="text-sky-400 underline hover:text-sky-300 font-medium"
                >
                  Fill Demo Parent Credentials
                </button>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-5 py-3 text-xs sm:text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-50 transition-colors"
              >
                <Users className="h-4 w-4" />
                {isSubmitting
                  ? 'Connecting to Student Live Telemetry...'
                  : 'Sign In to Dedicated Parent Live Telemetry Screen'}
              </button>
            </form>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 px-6 py-4 text-center text-xs text-slate-500">
        Vanguard 11 · Strict Role Isolation: Student Devices & Dedicated Parent Telemetry Screens
      </footer>
    </div>
  );
};
